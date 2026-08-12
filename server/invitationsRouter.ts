import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "./_core/trpc";
import {
  hashIp,
  checkRateLimit,
  createInvitationRecord,
  getInvitationBySlug,
  getInvitationByToken,
  markInvitationOpened,
  getResponsesForInvitation,
  createResponseRecord,
  getInvitationStats,
  RATE_LIMITS,
} from "./invitationsDb";
import { findForbiddenTerm } from "./contentFilter";
import { sendCreatorNotification } from "./emailService";
import {
  invitationAnswerSchema,
  invitationConfigSchema,
  LINK_DURATIONS,
  userAuthoredText,
  type InvitationConfig,
} from "@shared/invitationConfig";

const SLUG_LENGTH = 7;
const CREATOR_TOKEN_LENGTH = 32;

function clientIpOf(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }): string {
  // `x-forwarded-for` peut contenir une liste « client, proxy1, proxy2 ».
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "127.0.0.1";
}

function isExpired(expiresAt: Date | string): boolean {
  return new Date() > new Date(expiresAt);
}

export const invitationsRouter = router({
  stats: publicProcedure.query(async () => {
    return await getInvitationStats();
  }),

  create: publicProcedure
    .input(
      z.object({
        creatorEmail: z.email().max(320),
        config: invitationConfigSchema,
        expiresDays: z
          .number()
          .refine((n): n is (typeof LINK_DURATIONS)[number] => (LINK_DURATIONS as readonly number[]).includes(n), {
            message: `La durée de validité doit valoir ${LINK_DURATIONS.join(", ")} jours.`,
          })
          .default(30),
        allowMultiple: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ipHash = hashIp(clientIpOf(ctx.req));

      const allowed = await checkRateLimit(ipHash, "create_invitation");
      if (!allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Trop d'invitations créées depuis cette adresse. Veuillez réessayer plus tard (limite : ${RATE_LIMITS.perHour} par heure, ${RATE_LIMITS.perDay} par jour).`,
        });
      }

      const forbidden = findForbiddenTerm(userAuthoredText(input.config));
      if (forbidden) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Le terme « ${forbidden} » n'est pas autorisé par notre politique de modération.`,
        });
      }

      const invitation = await createInvitationRecord({
        slug: nanoid(SLUG_LENGTH),
        creatorEmail: input.creatorEmail,
        creatorToken: nanoid(CREATOR_TOKEN_LENGTH),
        config: input.config,
        expiresAt: new Date(Date.now() + input.expiresDays * 24 * 60 * 60 * 1000),
        allowMultiple: input.allowMultiple,
        ipHash,
      });

      return {
        slug: invitation.slug,
        creatorToken: invitation.creatorToken,
        trackingUrl: `/track/${invitation.creatorToken}`,
        recipientUrl: `/r/${invitation.slug}`,
      };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(12) }))
    .query(async ({ input }) => {
      const invitation = await getInvitationBySlug(input.slug);
      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cette invitation n'existe plus ou a expiré.",
        });
      }

      if (isExpired(invitation.expiresAt)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cette invitation a expiré." });
      }

      await markInvitationOpened(input.slug);

      const responses = await getResponsesForInvitation(invitation.id);
      const alreadyResponded = responses.length > 0 && !invitation.allowMultiple;

      return {
        ...invitation,
        alreadyResponded,
        response: alreadyResponded ? responses[responses.length - 1].answer : undefined,
      };
    }),

  respond: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(12),
        answer: invitationAnswerSchema,
      })
    )
    .mutation(async ({ input }) => {
      const invitation = await getInvitationBySlug(input.slug);
      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation introuvable." });
      }

      // Absent de l'implémentation précédente : une invitation expirée pouvait
      // encore recevoir une réponse et déclencher un e-mail.
      if (isExpired(invitation.expiresAt)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cette invitation a expiré." });
      }

      const existingResponses = await getResponsesForInvitation(invitation.id);
      if (existingResponses.length > 0 && !invitation.allowMultiple) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Une réponse a déjà été enregistrée pour cette invitation.",
        });
      }

      await createResponseRecord(invitation.id, input.answer);

      // La réponse est enregistrée : un échec d'envoi ne doit surtout pas la
      // perdre. `sendCreatorNotification` ne lève jamais et rapporte son issue.
      const config = invitation.config as InvitationConfig;
      const notification = await sendCreatorNotification({
        toEmail: invitation.creatorEmail,
        recipientName: config.recipientName,
        senderName: config.senderName,
        answerDetails: input.answer,
        trackingUrl: `/track/${invitation.creatorToken}`,
        theme: config.themeKey,
      });

      return { success: true, emailSent: notification.sent };
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      const invitation = await getInvitationByToken(input.token);
      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jeton de suivi invalide." });
      }

      return {
        invitation,
        responses: await getResponsesForInvitation(invitation.id),
      };
    }),
});
