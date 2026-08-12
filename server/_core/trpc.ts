import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { enregistrerAppel } from "../metrics";
import { verifyAdminSession, readAdminCookie } from "../adminAuth";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

/**
 * Mesure la durée et l'issue de chaque appel, pour la console
 * d'administration. Appliqué à la procédure de base, donc à toutes les
 * procédures dérivées sans avoir à y penser.
 */
const mesurerDuree = t.middleware(async ({ path, next }) => {
  const debut = performance.now();
  const resultat = await next();
  enregistrerAppel(path, performance.now() - debut, !resultat.ok);
  return resultat;
});

export const publicProcedure = t.procedure.use(mesurerDuree);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Procédure réservée à la console d'exploitation.
 *
 * Distincte de `adminProcedure` ci-dessus, qui s'appuie sur le rôle d'un
 * compte utilisateur : l'application est anonyme, aucun compte n'existe. Ici
 * l'autorisation tient au seul cookie de session signé, délivré contre le mot
 * de passe d'administration.
 */
export const superAdminProcedure = publicProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    const autorise = await verifyAdminSession(readAdminCookie(ctx.req));
    if (!autorise) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Session d'administration absente ou expirée.",
      });
    }
    return next({ ctx });
  })
);
