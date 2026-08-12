import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { invitations } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { reinitialiser as reinitialiserMetriques } from "./metrics";
import type { TrpcContext } from "./_core/context";
import type { InvitationConfig } from "@shared/invitationConfig";

const MOT_DE_PASSE = "mot-de-passe-de-test";

/**
 * Contexte de test avec un faux couple requête / réponse.
 *
 * `cookiesPoses` capture ce que le routeur écrit, pour rejouer la session sur
 * l'appel suivant — c'est ainsi qu'on vérifie qu'une procédure protégée
 * refuse sans cookie et accepte avec.
 */
function creerContexte(options: { cookie?: string; ip?: string } = {}): TrpcContext & {
  cookiesPoses: Record<string, string>;
} {
  const cookiesPoses: Record<string, string> = {};
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {
        "x-forwarded-for": options.ip ?? "198.51.100.7",
        ...(options.cookie ? { cookie: options.cookie } : {}),
      },
      socket: { remoteAddress: options.ip ?? "198.51.100.7" },
    } as any,
    res: {
      cookie: (nom: string, valeur: string) => {
        cookiesPoses[nom] = valeur;
      },
      clearCookie: () => {},
    } as any,
    cookiesPoses,
  };
}

const configValide: InvitationConfig = {
  recipientName: "Amina",
  senderName: "Elisée",
  relation: "crush",
  tone: "doux",
  question: "Un verre ce vendredi ?",
  subtitle: "",
  emoji: "💌",
  noButtonBehavior: "fuyant",
  maxRefusals: 8,
  teases: ["Alors ?"],
  selectedDates: [
    { id: "a", label: "vendredi", startsAt: "2026-08-21T18:00:00.000Z", durationMin: 120 },
  ],
  selectedMenuOptions: ["sushi"],
  includeSurprise: false,
  includeVenue: false,
  themeKey: "bytechnum",
  enableAnimation: true,
  motionIntensity: "normal",
  finalMessage: "",
};

beforeEach(() => {
  ENV.adminPassword = MOT_DE_PASSE;
  reinitialiserMetriques();
});

/** Ouvre une session et renvoie un contexte qui la porte. */
async function contexteConnecte(ip = "198.51.100.7") {
  const ctx = creerContexte({ ip });
  await appRouter.createCaller(ctx).admin.connexion({ password: MOT_DE_PASSE });
  const jeton = ctx.cookiesPoses["admin_session"];
  expect(jeton).toBeTruthy();
  return creerContexte({ cookie: `admin_session=${jeton}`, ip });
}

describe("accès à la console", () => {
  it("refuse les données sans session", async () => {
    const api = appRouter.createCaller(creerContexte());
    await expect(api.admin.usage()).rejects.toThrow();
    await expect(api.admin.sante()).rejects.toThrow();
    await expect(api.admin.performances()).rejects.toThrow();
    await expect(api.admin.moderation()).rejects.toThrow();
  });

  it("refuse la suppression d'une invitation sans session", async () => {
    const api = appRouter.createCaller(creerContexte());
    await expect(api.admin.supprimerInvitation({ slug: "peu-importe" })).rejects.toThrow();
  });

  it("refuse un mot de passe erroné", async () => {
    const api = appRouter.createCaller(creerContexte());
    await expect(api.admin.connexion({ password: "pas-le-bon" })).rejects.toThrow();
  });

  it("accepte le bon mot de passe et ouvre l'accès", async () => {
    const ctx = await contexteConnecte();
    await expect(appRouter.createCaller(ctx).admin.usage()).resolves.toBeDefined();
  });

  it("rejette un cookie forgé", async () => {
    const ctx = creerContexte({ cookie: "admin_session=jeton.completement.invente" });
    await expect(appRouter.createCaller(ctx).admin.usage()).rejects.toThrow();
  });

  it("refuse toute connexion quand aucun mot de passe n'est configuré", async () => {
    ENV.adminPassword = "";
    const api = appRouter.createCaller(creerContexte());
    await expect(api.admin.connexion({ password: "n'importe quoi" })).rejects.toThrow();
    await expect(api.admin.session()).resolves.toMatchObject({ configuree: false });
  });

  it("bloque les tentatives répétées depuis une même adresse", async () => {
    const api = appRouter.createCaller(creerContexte({ ip: "203.0.113.99" }));
    for (let i = 0; i < 5; i++) {
      await expect(api.admin.connexion({ password: "faux" })).rejects.toThrow();
    }
    // La 6e est refusée pour cause de débit, avant même d'être vérifiée : le
    // bon mot de passe ne passe donc pas non plus.
    await expect(api.admin.connexion({ password: MOT_DE_PASSE })).rejects.toThrow(/tentatives/);
  });
});

describe("statistiques d'usage", () => {
  it("compte les invitations dans la série quotidienne", async () => {
    const ctx = await contexteConnecte();
    const api = appRouter.createCaller(ctx);

    await api.invitations.create({
      creatorEmail: "createur@exemple.fr",
      config: configValide,
      expiresDays: 30,
      allowMultiple: false,
    });

    const { serie, resume } = await api.admin.usage();
    const somme = serie.reduce((n, p) => n + p.invitations, 0);

    // Régression : le regroupement passait par `date()`, que mysql2 renvoie en
    // objet Date. Comparée à une clé « AAAA-MM-JJ », la correspondance échouait
    // toujours et la série ressortait entièrement à zéro malgré des données.
    expect(somme).toBe(resume.invitationsTotal);
    expect(somme).toBeGreaterThan(0);
  });

  it("couvre exactement 30 jours, jours creux compris", async () => {
    const ctx = await contexteConnecte();
    const { serie } = await appRouter.createCaller(ctx).admin.usage();

    expect(serie).toHaveLength(30);
    // Chaque clé doit être une date ISO, et la série strictement croissante.
    for (const point of serie) expect(point.jour).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const jours = serie.map(p => p.jour);
    expect([...jours].sort()).toEqual(jours);
  });

  it("liste les sept thèmes, y compris ceux jamais choisis", async () => {
    const ctx = await contexteConnecte();
    const { themes } = await appRouter.createCaller(ctx).admin.usage();
    expect(themes).toHaveLength(7);
    expect(themes.every(t => Number.isFinite(t.total))).toBe(true);
  });

  it("ne divise pas par zéro sur une base vide", async () => {
    const ctx = await contexteConnecte();
    const { resume } = await appRouter.createCaller(ctx).admin.usage();
    expect(Number.isFinite(resume.tauxOuverture)).toBe(true);
    expect(Number.isFinite(resume.tauxReponse)).toBe(true);
  });
});

describe("journal d'exploitation", () => {
  it("consigne un rejet de modération sans conserver le texte rédigé", async () => {
    const ctx = await contexteConnecte();
    const api = appRouter.createCaller(ctx);

    await expect(
      api.invitations.create({
        creatorEmail: "createur@exemple.fr",
        config: { ...configValide, finalMessage: "Un message plein de haine" },
        expiresDays: 30,
        allowMultiple: false,
      })
    ).rejects.toThrow();

    const { rejets } = await api.admin.moderation();
    expect(rejets.length).toBeGreaterThan(0);

    const detail = rejets[0].detail as { terme?: string };
    expect(detail.terme).toBe("haine");
    // Seul le terme déclencheur est conservé, jamais la phrase entière.
    expect(JSON.stringify(rejets[0].detail)).not.toContain("message plein");
  });

  it("expose les invitations sans donnée personnelle", async () => {
    const ctx = await contexteConnecte();
    const api = appRouter.createCaller(ctx);

    await api.invitations.create({
      creatorEmail: "secret@exemple.fr",
      config: configValide,
      expiresDays: 30,
      allowMultiple: false,
    });

    const { invitations: lignes } = await api.admin.moderation();
    const brut = JSON.stringify(lignes);

    expect(lignes.length).toBeGreaterThan(0);
    expect(brut).not.toContain("secret@exemple.fr");
    expect(brut).not.toContain("Amina");
    expect(brut).not.toContain("Elisée");
  });
});

describe("modération", () => {
  it("supprime une invitation signalée", async () => {
    const ctx = await contexteConnecte();
    const api = appRouter.createCaller(ctx);

    const { slug } = await api.invitations.create({
      creatorEmail: "createur@exemple.fr",
      config: configValide,
      expiresDays: 30,
      allowMultiple: false,
    });

    await expect(api.admin.supprimerInvitation({ slug })).resolves.toEqual({ success: true });
    await expect(api.invitations.getBySlug({ slug })).rejects.toThrow();
  });

  it("signale une invitation introuvable", async () => {
    const ctx = await contexteConnecte();
    await expect(
      appRouter.createCaller(ctx).admin.supprimerInvitation({ slug: "inconnu" })
    ).rejects.toThrow();
  });
});

describe("performances", () => {
  it("mesure les appels des procédures publiques", async () => {
    const ctx = await contexteConnecte();
    const api = appRouter.createCaller(ctx);

    await api.invitations.stats();
    await api.invitations.stats();

    const { procedures, appelsTotal } = await api.admin.performances();
    const stats = procedures.find(p => p.procedure === "invitations.stats");

    expect(stats?.appels).toBe(2);
    expect(stats?.medianeMs).toBeGreaterThanOrEqual(0);
    expect(appelsTotal).toBeGreaterThanOrEqual(2);
  });

  it("compte les erreurs séparément des appels réussis", async () => {
    const ctx = await contexteConnecte();
    const api = appRouter.createCaller(ctx);

    await expect(api.invitations.getBySlug({ slug: "inexistant" })).rejects.toThrow();

    const { procedures } = await api.admin.performances();
    const proc = procedures.find(p => p.procedure === "invitations.getBySlug");
    expect(proc?.erreurs).toBe(1);
    expect(proc?.tauxErreur).toBe(1);
  });
});

describe("santé", () => {
  it("rapporte l'état de la base et le mode d'envoi", async () => {
    const ctx = await contexteConnecte();
    const sante = await appRouter.createCaller(ctx).admin.sante();

    expect(sante.base.ok).toBe(true);
    expect(typeof sante.envoiReel).toBe("boolean");
  });

  it("trace chaque passage de purge", async () => {
    const ctx = await contexteConnecte();
    const api = appRouter.createCaller(ctx);

    await api.admin.lancerPurge();

    const sante = await api.admin.sante();
    expect(sante.dernierePurge).not.toBeNull();
  });

  it("supprime bien les invitations expirées depuis la console", async () => {
    const ctx = await contexteConnecte();
    const api = appRouter.createCaller(ctx);

    const { slug } = await api.invitations.create({
      creatorEmail: "createur@exemple.fr",
      config: configValide,
      expiresDays: 30,
      allowMultiple: false,
    });

    const db = await getDb();
    if (!db) throw new Error("base indisponible");
    const { eq } = await import("drizzle-orm");
    await db
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitations.slug, slug));

    const rapport = await api.admin.lancerPurge();
    expect(rapport.invitationsSupprimees).toBeGreaterThanOrEqual(1);
  });
});
