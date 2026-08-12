import { desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import { invitations, responses } from "../drizzle/schema";
import { THEME_IDS, type ThemeId } from "@shared/invitationConfig";

/**
 * Agrégats de la console d'administration.
 *
 * Tout se déduit des tables existantes : aucune donnée n'a été ajoutée pour
 * alimenter ces chiffres. Les requêtes ne renvoient jamais d'e-mail ni de
 * contenu d'invitation — la console sert à mesurer l'usage, pas à lire le
 * courrier des utilisateurs.
 */

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible.");
  return db;
}

export type ResumeUsage = {
  invitationsTotal: number;
  reponsesTotal: number;
  invitationsOuvertes: number;
  tauxOuverture: number;
  tauxReponse: number;
  invitations7j: number;
  invitations30j: number;
  actives: number;
  expirees: number;
};

export async function resumeUsage(now = new Date()): Promise<ResumeUsage> {
  const db = await requireDb();
  const il7j = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const il30j = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const compte = async (condition?: any) => {
    const q = db.select({ n: sql<number>`count(*)` }).from(invitations);
    const rows = condition ? await q.where(condition) : await q;
    return Number(rows[0]?.n ?? 0);
  };

  const [invitationsTotal, invitationsOuvertes, invitations7j, invitations30j, actives] =
    await Promise.all([
      compte(),
      compte(isNotNull(invitations.openedAt)),
      compte(gte(invitations.createdAt, il7j)),
      compte(gte(invitations.createdAt, il30j)),
      compte(gte(invitations.expiresAt, now)),
    ]);

  const reponsesRows = await db.select({ n: sql<number>`count(*)` }).from(responses);
  const reponsesTotal = Number(reponsesRows[0]?.n ?? 0);

  return {
    invitationsTotal,
    reponsesTotal,
    invitationsOuvertes,
    // Un total nul donnerait NaN, qui s'afficherait tel quel dans la console.
    tauxOuverture: invitationsTotal ? invitationsOuvertes / invitationsTotal : 0,
    tauxReponse: invitationsTotal ? reponsesTotal / invitationsTotal : 0,
    invitations7j,
    invitations30j,
    actives,
    expirees: invitationsTotal - actives,
  };
}

export type PointSerie = { jour: string; invitations: number; reponses: number };

/**
 * Clé de jour au format `AAAA-MM-JJ`, dans le fuseau du serveur.
 *
 * Surtout pas `toISOString()` : appliqué à un minuit local, il bascule en UTC
 * et renvoie la veille dès que le serveur est à l'est de Greenwich.
 */
function cleJourLocale(d: Date): string {
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * Série quotidienne sur `jours` jours, jours creux compris.
 *
 * Les jours sans activité sont absents du GROUP BY ; les omettre donnerait un
 * graphique au temps élastique, où deux points voisins peuvent être séparés
 * d'une semaine.
 *
 * Le regroupement passe par `date_format` et non `date()` : mysql2 convertit
 * un DATE en objet `Date` JavaScript, dont la mise en chaîne donne
 * « Wed Aug 12 » — la correspondance avec les clés échouait alors en silence
 * et la série ressortait entièrement à zéro.
 */
export async function serieQuotidienne(jours = 30, now = new Date()): Promise<PointSerie[]> {
  const db = await requireDb();
  const depuis = new Date(now.getTime() - (jours - 1) * 24 * 60 * 60 * 1000);
  depuis.setHours(0, 0, 0, 0);

  const parJour = sql<string>`date_format(${invitations.createdAt}, '%Y-%m-%d')`;
  const parJourReponse = sql<string>`date_format(${responses.createdAt}, '%Y-%m-%d')`;

  const [inv, rep] = await Promise.all([
    db
      .select({ jour: parJour, n: sql<number>`count(*)` })
      .from(invitations)
      .where(gte(invitations.createdAt, depuis))
      .groupBy(parJour),
    db
      .select({ jour: parJourReponse, n: sql<number>`count(*)` })
      .from(responses)
      .where(gte(responses.createdAt, depuis))
      .groupBy(parJourReponse),
  ]);

  const parJourInv = new Map(inv.map(r => [String(r.jour), Number(r.n)]));
  const parJourRep = new Map(rep.map(r => [String(r.jour), Number(r.n)]));

  const serie: PointSerie[] = [];
  for (let i = 0; i < jours; i++) {
    const d = new Date(depuis.getTime() + i * 24 * 60 * 60 * 1000);
    const k = cleJourLocale(d);
    serie.push({ jour: k, invitations: parJourInv.get(k) ?? 0, reponses: parJourRep.get(k) ?? 0 });
  }
  return serie;
}

export type RepartitionTheme = { theme: ThemeId; total: number };

/** Répartition des thèmes choisis, thèmes jamais utilisés inclus à zéro. */
export async function repartitionThemes(): Promise<RepartitionTheme[]> {
  const db = await requireDb();

  const rows = await db
    .select({
      theme: sql<string>`json_unquote(json_extract(${invitations.config}, '$.themeKey'))`,
      n: sql<number>`count(*)`,
    })
    .from(invitations)
    .groupBy(sql`json_unquote(json_extract(${invitations.config}, '$.themeKey'))`);

  const parTheme = new Map(rows.map(r => [String(r.theme), Number(r.n)]));
  return THEME_IDS.map(theme => ({ theme, total: parTheme.get(theme) ?? 0 })).sort(
    (a, b) => b.total - a.total
  );
}

export type StatistiquesReponse = {
  delaiMedianHeures: number | null;
  refusMoyen: number | null;
  refusMax: number | null;
};

/**
 * Délai entre création et réponse, et acharnement sur le bouton « Non ».
 *
 * La médiane est calculée en mémoire : MySQL 8 n'a pas de fonction d'agrégat
 * de médiane, et le volume concerné tient largement en RAM.
 */
export async function statistiquesReponses(): Promise<StatistiquesReponse> {
  const db = await requireDb();

  const rows = await db
    .select({
      delaiSecondes: sql<number>`timestampdiff(second, ${invitations.createdAt}, ${responses.createdAt})`,
      refus: sql<number>`json_extract(${responses.answer}, '$.refusCount')`,
    })
    .from(responses)
    .innerJoin(invitations, eq(responses.invitationId, invitations.id));

  if (rows.length === 0) {
    return { delaiMedianHeures: null, refusMoyen: null, refusMax: null };
  }

  const delais = rows.map(r => Number(r.delaiSecondes)).filter(n => Number.isFinite(n) && n >= 0);
  delais.sort((a, b) => a - b);
  const milieu = Math.floor(delais.length / 2);
  const medianeSecondes = delais.length
    ? delais.length % 2
      ? delais[milieu]
      : (delais[milieu - 1] + delais[milieu]) / 2
    : null;

  const refus = rows.map(r => Number(r.refus)).filter(n => Number.isFinite(n));

  return {
    delaiMedianHeures: medianeSecondes === null ? null : Number((medianeSecondes / 3600).toFixed(1)),
    refusMoyen: refus.length ? Number((refus.reduce((a, b) => a + b, 0) / refus.length).toFixed(1)) : null,
    refusMax: refus.length ? Math.max(...refus) : null,
  };
}

export type LigneInvitation = {
  id: number;
  slug: string;
  themeKey: string;
  creeLe: Date;
  expireLe: Date;
  ouverteLe: Date | null;
  aRepondu: boolean;
};

/**
 * Dernières invitations, pour la modération.
 *
 * Ni e-mail du créateur, ni prénoms, ni contenu : la console doit permettre de
 * retirer une invitation signalée, pas de lire les messages de tout le monde.
 */
export async function dernieresInvitations(limit = 25): Promise<LigneInvitation[]> {
  const db = await requireDb();

  const rows = await db
    .select({
      id: invitations.id,
      slug: invitations.slug,
      themeKey: sql<string>`json_unquote(json_extract(${invitations.config}, '$.themeKey'))`,
      creeLe: invitations.createdAt,
      expireLe: invitations.expiresAt,
      ouverteLe: invitations.openedAt,
      reponses: sql<number>`(select count(*) from responses r where r.invitationId = ${invitations.id})`,
    })
    .from(invitations)
    .orderBy(desc(invitations.createdAt))
    .limit(limit);

  return rows.map(r => ({
    id: r.id,
    slug: r.slug,
    themeKey: r.themeKey ?? "inconnu",
    creeLe: r.creeLe,
    expireLe: r.expireLe,
    ouverteLe: r.ouverteLe,
    aRepondu: Number(r.reponses) > 0,
  }));
}

/** Supprime une invitation signalée. Sa réponse part avec, par cascade. */
export async function supprimerInvitation(slug: string): Promise<boolean> {
  const db = await requireDb();
  const [header] = await db.delete(invitations).where(eq(invitations.slug, slug));
  return (header.affectedRows ?? 0) > 0;
}

export type RepartitionDuree = { jours: number; total: number };

/** Durées de validité retenues, déduites de l'écart création / expiration. */
export async function repartitionDurees(): Promise<RepartitionDuree[]> {
  const db = await requireDb();

  const rows = await db
    .select({
      jours: sql<number>`round(timestampdiff(hour, ${invitations.createdAt}, ${invitations.expiresAt}) / 24)`,
      n: sql<number>`count(*)`,
    })
    .from(invitations)
    .groupBy(sql`round(timestampdiff(hour, ${invitations.createdAt}, ${invitations.expiresAt}) / 24)`);

  return rows
    .map(r => ({ jours: Number(r.jours), total: Number(r.n) }))
    .sort((a, b) => a.jours - b.jours);
}

/** Vérifie que la base répond, et mesure le temps d'aller-retour. */
export async function pingBase(): Promise<{ ok: boolean; latenceMs: number | null }> {
  const debut = performance.now();
  try {
    const db = await requireDb();
    await db.select({ n: sql<number>`1` }).from(invitations).limit(1);
    return { ok: true, latenceMs: Math.round(performance.now() - debut) };
  } catch {
    return { ok: false, latenceMs: null };
  }
}
