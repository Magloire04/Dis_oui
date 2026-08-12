import { describe, expect, it } from "vitest";
import { buildIcsEvent, buildRendezVousIcs, formatIcsDate } from "@shared/ics";

const START = new Date("2026-08-14T17:30:00.000Z");

function lines(ics: string): string[] {
  return ics.split("\r\n");
}

describe("formatIcsDate", () => {
  it("produit un horodatage UTC compact", () => {
    expect(formatIcsDate(START)).toBe("20260814T173000Z");
  });

  it("refuse une date invalide", () => {
    expect(() => formatIcsDate(new Date("n'importe quoi"))).toThrow();
  });
});

describe("buildIcsEvent", () => {
  const ics = buildIcsEvent({
    uid: "test@dis-oui",
    title: "Rendez-vous : Thomas & Julie",
    start: START,
    durationMinutes: 90,
  });

  it("émet un VEVENT complet", () => {
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("UID:test@dis-oui");
    expect(ics).toContain("DTSTAMP:");
  });

  it("porte un DTSTART et un DTEND réels — le défaut manquant historiquement", () => {
    expect(ics).toContain("DTSTART:20260814T173000Z");
    expect(ics).toContain("DTEND:20260814T190000Z");
  });

  it("utilise exclusivement des fins de ligne CRLF", () => {
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("échappe les caractères réservés", () => {
    const escaped = buildIcsEvent({
      uid: "x@dis-oui",
      title: "Dîner, chez Léa; sans faute",
      description: "Ligne 1\nLigne 2\\fin",
      start: START,
    });
    expect(escaped).toContain("SUMMARY:Dîner\\, chez Léa\\; sans faute");
    expect(escaped).toContain("DESCRIPTION:Ligne 1\\nLigne 2\\\\fin");
  });

  it("replie les lignes longues à 75 octets sans couper un caractère", () => {
    const longIcs = buildIcsEvent({
      uid: "y@dis-oui",
      title: "Rendez-vous très chaleureux à déguster ensemble 🍣".repeat(4),
      start: START,
    });

    for (const line of lines(longIcs)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }

    // Le repli ne doit pas produire de caractère de remplacement U+FFFD,
    // signe qu'une séquence UTF-8 aurait été coupée en deux.
    expect(longIcs).not.toContain("�");
    // Les lignes de continuation commencent par une espace.
    const continuations = lines(longIcs).filter(l => l.startsWith(" "));
    expect(continuations.length).toBeGreaterThan(0);
  });
});

describe("buildRendezVousIcs", () => {
  it("génère l'événement à partir du créneau retenu", () => {
    const ics = buildRendezVousIcs({
      senderName: "Thomas",
      recipientName: "Julie",
      startsAt: START.toISOString(),
      slotLabel: "Ce vendredi à 19h30",
      menu: "Bar à sushis",
      venue: "Le Comptoir",
      note: "J'ai hâte",
    });

    expect(ics).not.toBeNull();
    expect(ics).toContain("DTSTART:20260814T173000Z");
    expect(ics).toContain("LOCATION:Le Comptoir");
    expect(ics).toContain("SUMMARY:Rendez-vous : Thomas & Julie");
  });

  it("renvoie null quand le créneau n'a pas de date réelle", () => {
    // Cas des invitations créées avant les créneaux datés : le créneau n'était
    // que du texte libre, aucun événement calendrier n'est constructible.
    expect(
      buildRendezVousIcs({
        senderName: "Thomas",
        recipientName: "Julie",
        startsAt: null,
        slotLabel: "Ce vendredi à 19h30",
      })
    ).toBeNull();
  });

  it("renvoie null sur une date non analysable", () => {
    expect(
      buildRendezVousIcs({
        senderName: "Thomas",
        recipientName: "Julie",
        startsAt: "pas-une-date",
        slotLabel: "Ce vendredi",
      })
    ).toBeNull();
  });
});
