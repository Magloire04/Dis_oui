import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { runPurge } from "./purge";
import { getDb } from "./db";
import { invitations, rateLimits, responses } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { InvitationConfig } from "@shared/invitationConfig";

function caller(ip = "127.0.0.1") {
  return appRouter.createCaller({
    user: null,
    req: { protocol: "https", headers: { "x-forwarded-for": ip }, socket: { remoteAddress: ip } },
    res: { clearCookie: () => {} },
  } as unknown as TrpcContext);
}

const config: InvitationConfig = {
  recipientName: "Julie",
  senderName: "Thomas",
  relation: "crush",
  tone: "doux",
  question: "Un verre ce vendredi ?",
  subtitle: "",
  emoji: "💌",
  noButtonBehavior: "fuyant",
  maxRefusals: 12,
  teases: ["Tu hésites ?"],
  selectedDates: [
    { id: "s1", label: "Ce vendredi", startsAt: "2026-08-14T17:30:00.000Z", durationMin: 120 },
  ],
  selectedMenuOptions: ["amiwo"],
  includeSurprise: false,
  venueOptions: [],
  includeVenue: false,
  themeKey: "blush",
  enableAnimation: true,
  motionIntensity: "normal",
  finalMessage: "",
};

async function db() {
  const instance = await getDb();
  if (!instance) throw new Error("base indisponible");
  return instance;
}

async function createAndExpire(slugHolder: { slug?: string }, expired: boolean) {
  const api = caller();
  const created = await api.invitations.create({
    creatorEmail: "createur@exemple.fr",
    config,
    expiresHours: 24,
    allowMultiple: false,
  });
  slugHolder.slug = created.slug;

  await api.invitations.respond({ slug: created.slug, answer: { day: "Ce vendredi" } });

  if (expired) {
    const instance = await db();
    await instance
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(invitations.slug, created.slug));
  }
  return created;
}

describe("purge RGPD", () => {
  it("supprime les invitations expirées et laisse les autres", async () => {
    const expiree = {} as { slug?: string };
    const valide = {} as { slug?: string };
    await createAndExpire(expiree, true);
    await createAndExpire(valide, false);

    const report = await runPurge();
    expect(report.invitationsSupprimees).toBe(1);

    const instance = await db();
    const restantes = await instance.select().from(invitations);
    expect(restantes).toHaveLength(1);
    expect(restantes[0].slug).toBe(valide.slug);
  });

  it("emporte les réponses de l'invitation supprimée (cascade)", async () => {
    await createAndExpire({}, true);

    const instance = await db();
    expect(await instance.select().from(responses)).toHaveLength(1);

    await runPurge();

    // Sans la clé étrangère ON DELETE CASCADE, la réponse — qui contient les
    // choix du destinataire — survivrait à l'invitation.
    expect(await instance.select().from(responses)).toHaveLength(0);
  });

  it("supprime les compteurs de rate limiting de plus de 24 h", async () => {
    const instance = await db();
    await instance.insert(rateLimits).values([
      { ipHash: "vieux", actionType: "create_invitation", timestamp: new Date(Date.now() - 25 * 3600_000) },
      { ipHash: "recent", actionType: "create_invitation", timestamp: new Date(Date.now() - 60_000) },
    ]);

    const report = await runPurge();
    expect(report.compteursSupprimes).toBe(1);

    const restants = await instance.select().from(rateLimits);
    expect(restants).toHaveLength(1);
    expect(restants[0].ipHash).toBe("recent");
  });

  it("ne supprime rien quand tout est encore valide", async () => {
    await createAndExpire({}, false);
    await expect(runPurge()).resolves.toMatchObject({
      invitationsSupprimees: 0,
      compteursSupprimes: 0,
    });
  });
});
