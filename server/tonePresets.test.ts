import { describe, expect, it } from "vitest";
import { TONE_PRESETS } from "../client/src/lib/themes";
import { invitationConfigSchema, MAX_TEASES, TONES } from "@shared/invitationConfig";
import type { InvitationConfig } from "@shared/invitationConfig";

/**
 * Les formulations n'étaient couvertes par aucun test : en ajouter une trop
 * longue passait inaperçu jusqu'à ce qu'un créateur la reçoive puis se voie
 * refuser sa création — un échec silencieux, donc particulièrement coûteux.
 */

const QUESTION_MAX = 80;
const MINIMUM_ATTENDU = 25;

const baseConfig: InvitationConfig = {
  recipientName: "Amina",
  senderName: "Elisée",
  relation: "crush",
  tone: "doux",
  question: "On déjeune ensemble ?",
  subtitle: "",
  emoji: "💌",
  noButtonBehavior: "fuyant",
  maxRefusals: 8,
  teases: ["Alors ?"],
  selectedDates: [
    { id: "a", label: "vendredi", startsAt: "2026-08-21T18:00:00.000Z", durationMin: 120 },
  ],
  selectedMenuOptions: ["amiwo"],
  includeSurprise: false,
  includeVenue: false,
  themeKey: "bytechnum",
  enableAnimation: true,
  motionIntensity: "normal",
  finalMessage: "",
};

describe("formulations par ton", () => {
  it("couvre les quatre tons du schéma partagé", () => {
    for (const ton of TONES) {
      expect(TONE_PRESETS[ton]).toBeDefined();
    }
    expect(Object.keys(TONE_PRESETS)).toHaveLength(TONES.length);
  });

  it("propose au moins vingt-cinq formulations par ton", () => {
    for (const ton of TONES) {
      expect(TONE_PRESETS[ton].questions.length).toBeGreaterThanOrEqual(MINIMUM_ATTENDU);
    }
  });

  it("ne répète aucune formulation, ni dans un ton ni entre les tons", () => {
    // Une formulation partagée entre deux tons casserait la promesse : changer
    // de ton devrait changer la phrase.
    const toutes = TONES.flatMap(ton => TONE_PRESETS[ton].questions);
    expect(new Set(toutes).size).toBe(toutes.length);
  });

  it("garde chaque formulation sous la limite acceptée par l'API", () => {
    for (const ton of TONES) {
      for (const question of TONE_PRESETS[ton].questions) {
        expect(question.length).toBeLessThanOrEqual(QUESTION_MAX);
        expect(question.trim()).not.toBe("");
      }
    }
  });

  it("fait accepter chacune des formulations par le schéma", () => {
    // Contrôle de bout en bout : une phrase proposée doit toujours franchir la
    // validation de création.
    for (const ton of TONES) {
      for (const question of TONE_PRESETS[ton].questions) {
        const parsed = invitationConfigSchema.safeParse({ ...baseConfig, tone: ton, question });
        expect(parsed.success, `refusée pour le ton ${ton} : ${question}`).toBe(true);
      }
    }
  });

  it("garde des taquineries valides et sous le plafond", () => {
    for (const ton of TONES) {
      const { teases } = TONE_PRESETS[ton];
      expect(teases.length).toBeGreaterThan(0);
      expect(teases.length).toBeLessThanOrEqual(MAX_TEASES);
      for (const t of teases) expect(t.length).toBeLessThanOrEqual(120);
    }
  });
});
