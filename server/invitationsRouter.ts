import { z } from "zod";
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
  getInvitationStats 
} from "./invitationsDb";
import { sendCreatorNotification } from "./emailService";
import { nanoid } from "nanoid";

export const invitationsRouter = router({
  stats: publicProcedure.query(async () => {
    return await getInvitationStats();
  }),

  create: publicProcedure
    .input(z.object({
      creatorEmail: z.string().email(),
      config: z.any(),
      expiresDays: z.number().default(30),
      allowMultiple: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const clientIp = (ctx.req.headers["x-forwarded-for"] as string) || ctx.req.socket?.remoteAddress || "127.0.0.1";
      const ipHash = hashIp(clientIp);

      const allowed = await checkRateLimit(ipHash, "create_invitation");
      if (!allowed) {
        throw new Error("Trop d'invitations créées depuis cette adresse. Veuillez réessayer plus tard (limite : 3 par heure).");
      }

      // Content filtering check on free text
      const freeText = JSON.stringify(input.config);
      const forbiddenWords = ["violation", "harcèlement", "haine", "suicide"];
      for (const word of forbiddenWords) {
        if (freeText.toLowerCase().includes(word)) {
          throw new Error("Le contenu de l'invitation contient des termes non autorisés par notre politique de modération.");
        }
      }

      const slug = nanoid(7);
      const creatorToken = nanoid(32);
      const expiresAt = new Date(Date.now() + input.expiresDays * 24 * 60 * 60 * 1000);

      const invitation = await createInvitationRecord({
        slug,
        creatorEmail: input.creatorEmail,
        creatorToken,
        config: input.config,
        expiresAt,
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
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const invitation = await getInvitationBySlug(input.slug);
      if (!invitation) {
        throw new Error("Cette invitation n'existe plus ou a expiré.");
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        throw new Error("Cette invitation a expiré.");
      }

      // Mark as opened if first time
      await markInvitationOpened(input.slug);

      // Check if already responded and allowMultiple is false
      const responses = await getResponsesForInvitation(invitation.id);
      if (responses.length > 0 && !invitation.allowMultiple) {
        const lastResp = responses[responses.length - 1] as any;
        return {
          ...invitation,
          alreadyResponded: true,
          response: lastResp?.answer,
        };
      }

      return {
        ...invitation,
        alreadyResponded: false,
      };
    }),

  respond: publicProcedure
    .input(z.object({
      slug: z.string(),
      answer: z.any(), // { day, time, menu, venue, customNote, refusCount }
    }))
    .mutation(async ({ input }) => {
      const invitation = await getInvitationBySlug(input.slug);
      if (!invitation) {
        throw new Error("Invitation introuvable.");
      }

      const existingResponses = await getResponsesForInvitation(invitation.id);
      if (existingResponses.length > 0 && !invitation.allowMultiple) {
        throw new Error("Une réponse a déjà été enregistrée pour cette invitation.");
      }

      await createResponseRecord(invitation.id, input.answer);

      const config = invitation.config as any;
      await sendCreatorNotification({
        toEmail: invitation.creatorEmail,
        recipientName: config.recipientName || "Ton invité(e)",
        senderName: config.senderName || "Ton admirateur(trice)",
        answerDetails: {
          day: input.answer.day || "Date convenue",
          time: input.answer.time || "Heure convenue",
          menu: input.answer.menu || "Menu choisi",
          venue: input.answer.venue || "Non spécifié",
          customNote: input.answer.customNote || "",
        },
        trackingUrl: `/track/${invitation.creatorToken}`,
        theme: config.theme || "blush",
      });

      return { success: true };
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invitation = await getInvitationByToken(input.token);
      if (!invitation) {
        throw new Error("Jeton de suivi invalide.");
      }

      const responses = await getResponsesForInvitation(invitation.id);

      return {
        invitation,
        responses,
      };
    }),
});
