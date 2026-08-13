import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendCreatorNotification, type CreatorNotification } from "./emailService";
import { ENV } from "./_core/env";
import { reinitialiserTransport, transportActif } from "./mailTransport";
import type { InvitationAnswer } from "@shared/invitationConfig";

const answer: InvitationAnswer = {
  day: "Ce vendredi à 19h30",
  time: "19h30",
  startsAt: "2026-08-14T17:30:00.000Z",
  durationMin: 120,
  menu: "Bar à sushis",
  venue: "Le Comptoir",
  customNote: "J'ai hâte",
  refusCount: 3,
};

const notification: CreatorNotification = {
  toEmail: "createur@exemple.fr",
  recipientName: "Julie",
  senderName: "Thomas",
  answerDetails: answer,
  trackingUrl: "/track/abc",
  theme: "blush",
};

const originalKey = ENV.resendApiKey;
const originalSmtpHost = ENV.smtpHost;
const originalMailTransport = ENV.mailTransport;

afterEach(() => {
  ENV.resendApiKey = originalKey;
  ENV.smtpHost = originalSmtpHost;
  ENV.mailTransport = originalMailTransport;
  reinitialiserTransport();
  vi.restoreAllMocks();
});

describe("choix du transport", () => {
  it("privilégie SMTP dès qu'un hôte est renseigné", () => {
    ENV.smtpHost = "smtp.exemple.fr";
    ENV.resendApiKey = "re_test";
    expect(transportActif()).toBe("smtp");
  });

  it("retient sendmail quand il est demandé et qu'aucun SMTP n'est configuré", () => {
    ENV.smtpHost = "";
    ENV.mailTransport = "sendmail";
    ENV.resendApiKey = "re_test";
    expect(transportActif()).toBe("sendmail");
  });

  it("retombe sur Resend, puis sur la console", () => {
    ENV.smtpHost = "";
    ENV.mailTransport = "";
    ENV.resendApiKey = "re_test";
    expect(transportActif()).toBe("resend");

    ENV.resendApiKey = "";
    expect(transportActif()).toBe("console");
  });
});

describe("sans clé Resend", () => {
  beforeEach(() => {
    ENV.resendApiKey = "";
  });

  it("n'envoie rien mais signale le fichier calendrier disponible", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(sendCreatorNotification(notification)).resolves.toEqual({
      sent: false,
      hasCalendarFile: true,
    });
  });

  it("signale l'absence de fichier quand le créneau n'a pas de date", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(
      sendCreatorNotification({
        ...notification,
        answerDetails: { ...answer, startsAt: null },
      })
    ).resolves.toEqual({ sent: false, hasCalendarFile: false });
  });
});

describe("avec clé Resend", () => {
  beforeEach(() => {
    ENV.resendApiKey = "re_test_key";
  });

  it("joint un .ics valide, encodé en base64", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "1" }), { status: 200 }));

    await expect(sendCreatorNotification(notification)).resolves.toEqual({
      sent: true,
      hasCalendarFile: true,
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toEqual(["createur@exemple.fr"]);
    expect(body.subject).toBe("Julie a dit oui !");

    const attached = Buffer.from(body.attachments[0].content, "base64").toString("utf8");
    expect(body.attachments[0].filename).toBe("rendez-vous.ics");
    expect(attached).toContain("BEGIN:VEVENT");
    expect(attached).toContain("DTSTART:20260814T173000Z");
  });

  it("échappe le HTML des champs libres", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await sendCreatorNotification({
      ...notification,
      answerDetails: { ...answer, customNote: '<script>alert("xss")</script>' },
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;script&gt;");
  });

  it("ne lève pas quand Resend répond en erreur", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("quota dépassé", { status: 422 })
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    // La réponse du destinataire est déjà en base : l'envoi ne doit jamais
    // faire échouer la mutation.
    await expect(sendCreatorNotification(notification)).resolves.toEqual({
      sent: false,
      hasCalendarFile: true,
    });
  });

  it("ne lève pas quand le réseau est coupé", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendCreatorNotification(notification)).resolves.toEqual({
      sent: false,
      hasCalendarFile: true,
    });
  });
});
