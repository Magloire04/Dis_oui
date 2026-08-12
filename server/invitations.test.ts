import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

const validConfig = {
  recipientName: "Julie",
  senderName: "Thomas",
  question: "Un verre ce vendredi ?",
  themeKey: "blush",
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
    await expect(api.invitations.respond({ slug, answer: { day: "Samedi" } })).resolves.toEqual({
      success: true,
    });
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

describe("rate limiting", () => {
  it("bloque la 4e création horaire depuis la même IP", async () => {
    const api = caller("203.0.113.10");

    for (let i = 0; i < 3; i++) {
      await expect(createInvitation(api)).resolves.toHaveProperty("slug");
    }

    await expect(createInvitation(api)).rejects.toThrow(/3 par heure/);
  });

  it("isole les compteurs par adresse IP", async () => {
    const first = caller("203.0.113.20");
    for (let i = 0; i < 3; i++) await createInvitation(first);
    await expect(createInvitation(first)).rejects.toThrow();

    const second = caller("203.0.113.21");
    await expect(createInvitation(second)).resolves.toHaveProperty("slug");
  });
});
