import { describe, expect, it } from "vitest";
import {
  DEFAULT_SLOT_DURATION_MIN,
  normalizeDateSlots,
  slotStartsAt,
  userAuthoredText,
  type InvitationConfig,
} from "@shared/invitationConfig";

describe("normalizeDateSlots", () => {
  it("lit le format actuel", () => {
    const slots = normalizeDateSlots([
      { id: "s1", label: "Ce vendredi", startsAt: "2026-08-14T17:30:00.000Z", durationMin: 90 },
    ]);
    expect(slots).toHaveLength(1);
    expect(slotStartsAt(slots[0])).toBe("2026-08-14T17:30:00.000Z");
    expect(slots[0].durationMin).toBe(90);
  });

  it("accepte l'ancien format en simples chaînes", () => {
    // Les invitations créées avant les créneaux datés doivent rester lisibles
    // par leur destinataire, même sans date exploitable.
    const slots = normalizeDateSlots(["Ce vendredi à 19h30", "Ce samedi à 20h00"]);
    expect(slots.map(s => s.label)).toEqual(["Ce vendredi à 19h30", "Ce samedi à 20h00"]);
    expect(slots.every(s => slotStartsAt(s) === null)).toBe(true);
    expect(slots[0].durationMin).toBe(DEFAULT_SLOT_DURATION_MIN);
  });

  it("écarte les entrées inexploitables sans perdre les autres", () => {
    const slots = normalizeDateSlots([
      { id: "ok", label: "Ce vendredi", startsAt: "2026-08-14T17:30:00.000Z", durationMin: 120 },
      { id: "ko", label: "Sans date" },
      null,
      42,
    ]);
    expect(slots.map(s => s.id)).toEqual(["ok"]);
  });

  it("renvoie un tableau vide sur une valeur absente ou non tabulaire", () => {
    expect(normalizeDateSlots(undefined)).toEqual([]);
    expect(normalizeDateSlots(null)).toEqual([]);
    expect(normalizeDateSlots("Ce vendredi")).toEqual([]);
  });
});

describe("userAuthoredText", () => {
  const config = {
    recipientName: "Julie",
    senderName: "Thomas",
    relation: "crush",
    tone: "doux",
    question: "Un verre ?",
    subtitle: "Surprise",
    emoji: "💌",
    noButtonBehavior: "fuyant",
    maxRefusals: 12,
    teases: ["Tu hésites ?"],
    selectedDates: [
      { id: "s1", label: "Ce vendredi", startsAt: "2026-08-14T17:30:00.000Z", durationMin: 120 },
    ],
    selectedMenuOptions: ["sushi"],
    includeSurprise: true,
    includeVenue: true,
    themeKey: "sepia",
    enableAnimation: true,
    motionIntensity: "normal",
    finalMessage: "À bientôt",
  } satisfies InvitationConfig;

  const textes = userAuthoredText(config);

  it("rassemble les champs rédigés librement", () => {
    expect(textes).toContain("Julie");
    expect(textes).toContain("Un verre ?");
    expect(textes).toContain("Tu hésites ?");
    expect(textes).toContain("À bientôt");
  });

  it("retient le libellé d'un créneau, pas son identifiant ni sa date", () => {
    expect(textes).toContain("Ce vendredi");
    expect(textes).not.toContain("s1");
    expect(textes).not.toContain("2026-08-14T17:30:00.000Z");
  });

  it("exclut les valeurs techniques", () => {
    // La modération ne doit jamais analyser un identifiant de thème ou de
    // menu : c'est ce que faisait `JSON.stringify(config)`.
    expect(textes).not.toContain("sepia");
    expect(textes).not.toContain("sushi");
    expect(textes).not.toContain("crush");
  });
});
