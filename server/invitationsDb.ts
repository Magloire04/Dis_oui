import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import crypto from "crypto";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { invitations, responses, rateLimits } from "../drizzle/schema";

/**
 * Fenêtres de rate limiting appliquées par couple (ipHash, actionType).
 * Les deux sont évaluées : dépasser l'une ou l'autre bloque l'action.
 */
export const RATE_LIMITS = {
  perHour: 3,
  perDay: 10,
} as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Une base indisponible n'est pas un « aucun résultat » : la confondre avec un
 * 404 ferait disparaître silencieusement des invitations valides aux yeux de
 * leurs destinataires. On échoue franchement, l'appelant décide quoi en faire.
 */
async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error("Base de données indisponible (DATABASE_URL manquant ou connexion échouée).");
  }
  return db;
}

let saltWarningShown = false;

export function hashIp(ip: string): string {
  let salt = ENV.ipHashSalt;

  if (!salt) {
    if (ENV.isProduction) {
      throw new Error("IP_HASH_SALT est obligatoire en production : sans sel, un hash d'IPv4 se force brute en quelques minutes.");
    }
    if (!saltWarningShown) {
      console.warn("[Sécurité] IP_HASH_SALT absent — repli sur un sel de développement. Ne jamais déployer ainsi.");
      saltWarningShown = true;
    }
    salt = "dev-only-unsafe-salt";
  }

  return crypto
    .createHash("sha256")
    .update((ip || "127.0.0.1") + salt)
    .digest("hex");
}

async function countAttemptsSince(ipHash: string, actionType: string, since: Date): Promise<number> {
  const db = await requireDb();
  const rows = await db
    .select({ total: sql<number>`count(*)` })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.ipHash, ipHash),
        eq(rateLimits.actionType, actionType),
        gt(rateLimits.timestamp, since)
      )
    );
  // mysql2 renvoie les agrégats BIGINT sous forme de chaîne selon la config.
  return Number(rows[0]?.total ?? 0);
}

/**
 * Vérifie puis consomme un jeton de rate limiting. Renvoie `false` si la limite
 * est atteinte — dans ce cas rien n'est enregistré, une tentative refusée ne
 * doit pas rallonger la pénalité.
 */
export async function checkRateLimit(ipHash: string, actionType: string): Promise<boolean> {
  const now = new Date();

  const lastHour = await countAttemptsSince(ipHash, actionType, new Date(now.getTime() - HOUR_MS));
  if (lastHour >= RATE_LIMITS.perHour) return false;

  const lastDay = await countAttemptsSince(ipHash, actionType, new Date(now.getTime() - DAY_MS));
  if (lastDay >= RATE_LIMITS.perDay) return false;

  const db = await requireDb();
  await db.insert(rateLimits).values({ ipHash, actionType, timestamp: now });
  return true;
}

export async function createInvitationRecord(data: {
  slug: string;
  creatorEmail: string;
  creatorToken: string;
  config: unknown;
  expiresAt: Date;
  allowMultiple: boolean;
  ipHash: string;
}) {
  const db = await requireDb();

  await db.insert(invitations).values(data);
  const res = await db.select().from(invitations).where(eq(invitations.slug, data.slug)).limit(1);

  const created = res[0];
  if (!created) {
    throw new Error("L'invitation vient d'être insérée mais reste introuvable — incohérence de base.");
  }
  return created;
}

export async function getInvitationBySlug(slug: string) {
  const db = await requireDb();
  const res = await db.select().from(invitations).where(eq(invitations.slug, slug)).limit(1);
  return res[0] ?? null;
}

export async function getInvitationByToken(token: string) {
  const db = await requireDb();
  const res = await db.select().from(invitations).where(eq(invitations.creatorToken, token)).limit(1);
  return res[0] ?? null;
}

/**
 * Horodate la première ouverture. Le `isNull` garde la date de la *première*
 * visite : sans lui, chaque rechargement de page l'écraserait.
 */
export async function markInvitationOpened(slug: string): Promise<void> {
  const db = await requireDb();
  await db
    .update(invitations)
    .set({ openedAt: new Date() })
    .where(and(eq(invitations.slug, slug), isNull(invitations.openedAt)));
}

export async function getResponsesForInvitation(invitationId: number) {
  const db = await requireDb();
  return await db
    .select()
    .from(responses)
    .where(eq(responses.invitationId, invitationId))
    .orderBy(asc(responses.createdAt));
}

export async function createResponseRecord(invitationId: number, answer: unknown) {
  const db = await requireDb();

  const [header] = await db.insert(responses).values({ invitationId, answer });
  const insertedId = Number(header.insertId);

  const res = await db.select().from(responses).where(eq(responses.id, insertedId)).limit(1);
  const created = res[0];
  if (!created) {
    throw new Error("La réponse vient d'être insérée mais reste introuvable — incohérence de base.");
  }
  return created;
}

export async function getInvitationStats() {
  const db = await requireDb();

  const [invitationRows, responseRows] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(invitations),
    db.select({ total: sql<number>`count(*)` }).from(responses),
  ]);

  return {
    totalCreated: Number(invitationRows[0]?.total ?? 0),
    totalResponses: Number(responseRows[0]?.total ?? 0),
  };
}
