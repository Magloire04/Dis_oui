import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { hashIp } from "./invitationsDb";
import { ENV } from "./_core/env";
import { invitations, rateLimits } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import type { InvitationConfig } from "@shared/invitationConfig";

function createTestContext(ip = "127.0.0.1"): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { "x-forwarded-for": ip },
      socket: { remoteAddress: ip },
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

function caller(ip?: string) {
  return appRouter.createCaller(createTestContext(ip));
}

const validConfig: InvitationConfig = {
  recipientName: "Julie",
  senderName: "Thomas",
  relation: "crush",
  tone: "doux",
  question: "Un verre ce vendredi ?",
  subtitle: "J'ai une surprise pour toi",
  emoji: "💌",
  noButtonBehavior: "fuyant",
  maxRefusals: 12,
  teases: ["Tu hésites encore ?"],
  selectedDates: [
    {
      id: "slot-1",
      label: "Ce vendredi à 19h30",
      startsAt: "2026-08-14T17:30:00.000Z",
      durationMin: 120,
    },
    {
      id: "slot-2",
      label: "Ce samedi à 20h00",
      startsAt: "2026-08-15T18:00:00.000Z",
      durationMin: 120,
    },
  ],
  selectedMenuOptions: ["amiwo", "bistrot"],
  includeSurprise: true,
  includeVenue: true,
  themeKey: "blush",
  enableAnimation: true,
  motionIntensity: "normal",
  finalMessage: "J'ai hâte de te voir !",
};

async function createInvitation(api: ReturnType<typeof caller>) {
  return await api.invitations.create({
    creatorEmail: "createur@exemple.fr",
    config: validConfig,
    expiresDays: 30,
    allowMultiple: false,
  });
}

describe("invitations.stats", () => {
  it("compte les invitations et réponses réellement enregistrées", async () => {
    const api = caller();

    await expect(api.invitations.stats()).resolves.toEqual({
      totalCreated: 0,
      totalResponses: 0,
    });

    const { slug } = await createInvitation(api);
    await api.invitations.respond({ slug, answer: { day: "Ce vendredi" } });

    await expect(api.invitations.stats()).resolves.toEqual({
      totalCreated: 1,
      totalResponses: 1,
    });
  });
});

describe("invitations.getBySlug", () => {
  it("rejette un slug inconnu", async () => {
    await expect(caller().invitations.getBySlug({ slug: "slug-inexistant" })).rejects.toThrow();
  });

  it("horodate la première ouverture et conserve cette date", async () => {
    const api = caller();
    const { slug } = await createInvitation(api);

    const first = await api.invitations.getBySlug({ slug });
    expect(first.openedAt).toBeNull();

    const second = await api.invitations.getBySlug({ slug });
    expect(second.openedAt).toBeInstanceOf(Date);

    const third = await api.invitations.getBySlug({ slug });
    expect(third.openedAt).toEqual(second.openedAt);
  });

  it("signale une invitation déjà répondue", async () => {
    const api = caller();
    const { slug } = await createInvitation(api);
    await api.invitations.respond({ slug, answer: { day: "Ce vendredi", menu: "Sushi" } });

    const reloaded = await api.invitations.getBySlug({ slug });
    expect(reloaded.alreadyResponded).toBe(true);
  });
});

describe("invitations.respond", () => {
  it("refuse une seconde réponse quand allowMultiple est faux", async () => {
    const api = caller();
    const { slug } = await createInvitation(api);

    await api.invitations.respond({ slug, answer: { day: "Ce vendredi" } });
    await expect(api.invitations.respond({ slug, answer: { day: "Samedi" } })).rejects.toThrow();
  });

  it("accepte plusieurs réponses quand allowMultiple est vrai", async () => {
    const api = caller();
    const { slug } = await api.invitations.create({
      creatorEmail: "createur@exemple.fr",
      config: validConfig,
      expiresDays: 30,
      allowMultiple: true,
    });

    await api.invitations.respond({ slug, answer: { day: "Ce vendredi" } });
    await expect(api.invitations.respond({ slug, answer: { day: "Samedi" } })).resolves.toMatchObject({
      success: true,
    });
  });

  it("conserve la date réelle du créneau retenu", async () => {
    const api = caller();
    const { slug, creatorToken } = await createInvitation(api);
    const chosen = validConfig.selectedDates[1];

    await api.invitations.respond({
      slug,
      answer: {
        day: chosen.label,
        time: "20h00",
        startsAt: chosen.startsAt,
        durationMin: chosen.durationMin,
        menu: "Bar à sushis",
      },
    });

    const { responses } = await api.invitations.getByToken({ token: creatorToken });
    const answer = responses[0].answer as any;
    expect(answer.startsAt).toBe(chosen.startsAt);
    expect(answer.time).toBe("20h00");
  });

  it("refuse une date de créneau qui n'est pas une date ISO", async () => {
    const api = caller();
    const { slug } = await createInvitation(api);

    await expect(
      // Le type est `string` : seule la validation d'exécution rejette la valeur.
      api.invitations.respond({
        slug,
        answer: { day: "Ce vendredi", startsAt: "vendredi prochain" },
      })
    ).rejects.toThrow();
  });
});

describe("robustesse de l'envoi d'e-mail", () => {
  const cleParDefaut = ENV.resendApiKey;

  afterEach(() => {
    ENV.resendApiKey = cleParDefaut;
    vi.restoreAllMocks();
  });

  it("enregistre la réponse même si l'envoi échoue", async () => {
    ENV.resendApiKey = "re_test_key";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const api = caller();
    const { slug, creatorToken } = await createInvitation(api);

    // La réponse du destinataire est irremplaçable : une panne de Resend ne
    // doit jamais la faire perdre.
    await expect(
      api.invitations.respond({ slug, answer: { day: "Ce vendredi", menu: "Sushi" } })
    ).resolves.toEqual({ success: true, emailSent: false });

    const { responses: enregistrees } = await api.invitations.getByToken({ token: creatorToken });
    expect(enregistrees).toHaveLength(1);
    expect((enregistrees[0].answer as any).menu).toBe("Sushi");
  });

  it("signale l'envoi réussi", async () => {
    ENV.resendApiKey = "re_test_key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    const api = caller();
    const { slug } = await createInvitation(api);
    await expect(
      api.invitations.respond({ slug, answer: { day: "Ce vendredi" } })
    ).resolves.toEqual({ success: true, emailSent: true });
  });
});

describe("invitations.getByToken", () => {
  it("rejette un jeton inconnu", async () => {
    await expect(caller().invitations.getByToken({ token: "jeton-bidon" })).rejects.toThrow();
  });

  it("renvoie l'invitation et ses réponses au créateur", async () => {
    const api = caller();
    const { slug, creatorToken } = await createInvitation(api);
    await api.invitations.respond({
      slug,
      answer: { day: "Ce vendredi", menu: "Sushi", customNote: "Avec plaisir" },
    });

    const { invitation, responses } = await api.invitations.getByToken({ token: creatorToken });
    expect(invitation.slug).toBe(slug);
    expect(responses).toHaveLength(1);
    expect((responses[0].answer as any).menu).toBe("Sushi");
  });
});

describe("validation de la configuration", () => {
  it("refuse une config incomplète", async () => {
    await expect(
      caller().invitations.create({
        creatorEmail: "createur@exemple.fr",
        // @ts-expect-error - config volontairement tronquée
        config: { recipientName: "Julie" },
        expiresDays: 30,
        allowMultiple: false,
      })
    ).rejects.toThrow();
  });

  it("refuse un thème inconnu", async () => {
    await expect(
      caller().invitations.create({
        creatorEmail: "createur@exemple.fr",
        // @ts-expect-error - thème hors énumération
        config: { ...validConfig, themeKey: "arc-en-ciel" },
        expiresDays: 30,
        allowMultiple: false,
      })
    ).rejects.toThrow();
  });

  it("refuse une durée de validité hors 7 / 30 / 90 jours", async () => {
    await expect(
      caller().invitations.create({
        creatorEmail: "createur@exemple.fr",
        config: validConfig,
        expiresDays: 3650,
        allowMultiple: false,
      })
    ).rejects.toThrow();
  });

  it("refuse une adresse e-mail invalide", async () => {
    await expect(
      caller().invitations.create({
        creatorEmail: "pas-une-adresse",
        config: validConfig,
        expiresDays: 30,
        allowMultiple: false,
      })
    ).rejects.toThrow();
  });
});

describe("filtrage de contenu", () => {
  it("laisse passer « prochaine », qui contient pourtant « haine »", async () => {
    const api = caller();
    await expect(
      api.invitations.create({
        creatorEmail: "createur@exemple.fr",
        config: { ...validConfig, question: "Un verre la semaine prochaine ?" },
        expiresDays: 30,
        allowMultiple: false,
      })
    ).resolves.toHaveProperty("slug");
  });

  it("rejette un terme interdit isolé", async () => {
    await expect(
      caller().invitations.create({
        creatorEmail: "createur@exemple.fr",
        config: { ...validConfig, finalMessage: "Un message plein de haine" },
        expiresDays: 30,
        allowMultiple: false,
      })
    ).rejects.toThrow(/modération/);
  });

  it("n'inspecte que les champs rédigés par l'utilisateur", async () => {
    // « sepia » ou « crush » ne doivent jamais déclencher la modération, et
    // aucune clé technique du JSON ne doit être analysée.
    await expect(
      caller().invitations.create({
        creatorEmail: "createur@exemple.fr",
        config: { ...validConfig, themeKey: "sepia", relation: "crush" },
        expiresDays: 30,
        allowMultiple: false,
      })
    ).resolves.toHaveProperty("slug");
  });
});

describe("expiration", () => {
  async function expireInvitation(slug: string) {
    const db = await getDb();
    if (!db) throw new Error("base indisponible");
    await db
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitations.slug, slug));
  }

  it("refuse la consultation d'une invitation expirée", async () => {
    const api = caller();
    const { slug } = await createInvitation(api);
    await expireInvitation(slug);

    await expect(api.invitations.getBySlug({ slug })).rejects.toThrow(/expiré/);
  });

  it("refuse une réponse sur une invitation expirée", async () => {
    const api = caller();
    const { slug } = await createInvitation(api);
    await expireInvitation(slug);

    await expect(api.invitations.respond({ slug, answer: { day: "Ce vendredi" } })).rejects.toThrow(
      /expiré/
    );
  });
});

describe("rate limiting", () => {
  it("bloque la 4e création horaire depuis la même IP", async () => {
    const api = caller("203.0.113.10");

    for (let i = 0; i < 3; i++) {
      await expect(createInvitation(api)).resolves.toHaveProperty("slug");
    }

    await expect(createInvitation(api)).rejects.toThrow(/3 par heure/);
  });

  it("bloque au-delà de 10 créations sur 24 h, même étalées", async () => {
    const ip = "203.0.113.30";
    const instance = await getDb();
    if (!instance) throw new Error("base indisponible");

    // 10 tentatives déjà consommées dans la journée, mais hors de la fenêtre
    // horaire : seule la limite journalière peut encore s'appliquer.
    const ipHash = hashIp(ip);
    await instance.insert(rateLimits).values(
      Array.from({ length: 10 }, (_, i) => ({
        ipHash,
        actionType: "create_invitation",
        timestamp: new Date(Date.now() - (2 + i) * 3600_000),
      }))
    );

    await expect(createInvitation(caller(ip))).rejects.toThrow(/par jour/);
  });

  it("isole les compteurs par adresse IP", async () => {
    const first = caller("203.0.113.20");
    for (let i = 0; i < 3; i++) await createInvitation(first);
    await expect(createInvitation(first)).rejects.toThrow();

    const second = caller("203.0.113.21");
    await expect(createInvitation(second)).resolves.toHaveProperty("slug");
  });
});
