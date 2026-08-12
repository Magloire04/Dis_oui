import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { operationEvents } from "../drizzle/schema";

/**
 * Journal d'exploitation.
 *
 * Consigne les faits rares qui doivent survivre à un redémarrage et que
 * l'éditeur doit pouvoir constater après coup : un e-mail non parti, une purge
 * qui n'a rien supprimé depuis des jours, un pic de blocages.
 *
 * Règle absolue : aucune donnée personnelle dans `detail`. Ce journal échappe
 * à la purge des invitations ; y écrire un e-mail ou un prénom créerait une
 * conservation sans durée ni base légale.
 */

export type EventKind = "email" | "purge" | "moderation" | "rate_limit";
export type EventOutcome = "ok" | "error" | "blocked";

/**
 * Écrit un événement sans jamais lever.
 *
 * Journaliser est accessoire : si l'écriture échoue, l'opération métier en
 * cours ne doit pas en pâtir.
 */
export async function logEvent(
  kind: EventKind,
  outcome: EventOutcome,
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(operationEvents).values({ kind, outcome, detail: detail ?? null });
  } catch (error) {
    console.warn("[Journal] Événement non enregistré:", error);
  }
}

export type EventCount = { kind: string; outcome: string; total: number };

/** Répartition des événements par nature et issue, depuis une date. */
export async function countEventsSince(since: Date): Promise<EventCount[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      kind: operationEvents.kind,
      outcome: operationEvents.outcome,
      total: sql<number>`count(*)`,
    })
    .from(operationEvents)
    .where(gte(operationEvents.createdAt, since))
    .groupBy(operationEvents.kind, operationEvents.outcome);

  return rows.map(r => ({ kind: r.kind, outcome: r.outcome, total: Number(r.total) }));
}

/** Derniers événements d'une nature donnée, du plus récent au plus ancien. */
export async function recentEvents(kind: EventKind, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(operationEvents)
    .where(eq(operationEvents.kind, kind))
    .orderBy(desc(operationEvents.createdAt))
    .limit(limit);
}

/** Dernier événement d'une nature et d'une issue données. */
export async function lastEvent(kind: EventKind, outcome?: EventOutcome) {
  const db = await getDb();
  if (!db) return null;

  const condition = outcome
    ? and(eq(operationEvents.kind, kind), eq(operationEvents.outcome, outcome))
    : eq(operationEvents.kind, kind);

  const rows = await db
    .select()
    .from(operationEvents)
    .where(condition)
    .orderBy(desc(operationEvents.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Supprime les événements antérieurs à la rétention.
 *
 * Trente jours suffisent à diagnostiquer une dérive ; au-delà, ce sont des
 * lignes qui s'accumulent sans être lues.
 */
export async function deleteOldEvents(retentionDays = 30, now = new Date()): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const [header] = await db
    .delete(operationEvents)
    .where(sql`${operationEvents.createdAt} < ${cutoff}`);
  return header.affectedRows ?? 0;
}
