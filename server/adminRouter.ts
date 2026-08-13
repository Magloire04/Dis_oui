import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router, superAdminProcedure } from "./_core/trpc";
import {
  ADMIN_COOKIE,
  AdminNotConfiguredError,
  LOGIN_ATTEMPT_LIMIT,
  adminCookieOptions,
  clearAdminCookie,
  createAdminSession,
  isAdminConfigured,
  readAdminCookie,
  verifyAdminSession,
} from "./adminAuth";
import {
  dernieresInvitations,
  pingBase,
  repartitionDurees,
  repartitionThemes,
  resumeUsage,
  serieQuotidienne,
  statistiquesReponses,
  supprimerInvitation,
} from "./adminDb";
import { countEventsSince, lastEvent, recentEvents } from "./operationLog";
import { resume as resumeMetriques } from "./metrics";
import { verifierTransport } from "./mailTransport";
import { checkLoginAttempt, hashIp } from "./invitationsDb";
import { runPurge } from "./purge";

function clientIpOf(req: {
  headers: Record<string, unknown>;
  socket?: { remoteAddress?: string };
}): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "127.0.0.1";
}

export const adminRouter = router({
  /** Indique si la console est utilisable et si la session est ouverte. */
  session: publicProcedure.query(async ({ ctx }) => ({
    configuree: isAdminConfigured(),
    authentifie: await verifyAdminSession(readAdminCookie(ctx.req)),
  })),

  connexion: publicProcedure
    .input(z.object({ password: z.string().min(1).max(200) }))
    .mutation(async ({ input, ctx }) => {
      // Le rate limiting précède la vérification : sans cela, la console se
      // force par essais successifs.
      const ipHash = hashIp(clientIpOf(ctx.req));
      const autorise = await checkLoginAttempt(ipHash);
      if (!autorise) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Trop de tentatives (${LOGIN_ATTEMPT_LIMIT} maximum). Réessayez dans quelques minutes.`,
        });
      }

      try {
        const jeton = await createAdminSession(input.password);
        ctx.res.cookie(ADMIN_COOKIE, jeton, adminCookieOptions());
        return { success: true } as const;
      } catch (error) {
        if (error instanceof AdminNotConfiguredError) {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        // Message volontairement identique quel que soit le motif : distinguer
        // « mot de passe absent » de « mot de passe faux » aiderait un
        // attaquant.
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Mot de passe incorrect." });
      }
    }),

  deconnexion: publicProcedure.mutation(({ ctx }) => {
    clearAdminCookie(ctx.res);
    return { success: true } as const;
  }),

  /** Statistiques d'usage : volumes, taux, séries et répartitions. */
  usage: superAdminProcedure.query(async () => {
    const [resume, serie, themes, reponses, durees] = await Promise.all([
      resumeUsage(),
      serieQuotidienne(30),
      repartitionThemes(),
      statistiquesReponses(),
      repartitionDurees(),
    ]);
    return { resume, serie, themes, reponses, durees };
  }),

  /** Santé technique : base, purge, e-mails, blocages. */
  sante: superAdminProcedure.query(async () => {
    const depuis24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const depuis7j = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [base, evenements24h, evenements7j, dernierePurge, dernierEchecEmail, echecsEmail, courriel] =
      await Promise.all([
        pingBase(),
        countEventsSince(depuis24h),
        countEventsSince(depuis7j),
        lastEvent("purge", "ok"),
        lastEvent("email", "error"),
        recentEvents("email", 10),
        verifierTransport(),
      ]);

    return {
      base,
      evenements24h,
      evenements7j,
      dernierePurge,
      dernierEchecEmail,
      echecsEmail: echecsEmail.filter(e => e.outcome === "error"),
      // Sans transport configuré, l'envoi est simulé : l'afficher évite de
      // croire à une panne devant un compteur d'envois à zéro.
      courriel,
      envoiReel: courriel.transport !== "console" && courriel.ok,
    };
  }),

  /** Temps de réponse des procédures, depuis le démarrage du serveur. */
  performances: superAdminProcedure.query(() => resumeMetriques()),

  /** Modération : dernières invitations et rejets du filtre de contenu. */
  moderation: superAdminProcedure.query(async () => {
    const [invitations, rejets] = await Promise.all([
      dernieresInvitations(25),
      recentEvents("moderation", 20),
    ]);
    return { invitations, rejets };
  }),

  supprimerInvitation: superAdminProcedure
    .input(z.object({ slug: z.string().min(1).max(12) }))
    .mutation(async ({ input }) => {
      const supprimee = await supprimerInvitation(input.slug);
      if (!supprimee) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation introuvable." });
      }
      return { success: true } as const;
    }),

  /** Déclenche une purge immédiate, sans attendre le passage horaire. */
  lancerPurge: superAdminProcedure.mutation(async () => await runPurge()),
});
