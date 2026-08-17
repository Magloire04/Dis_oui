import { describe, expect, it } from "vitest";
import { MENU_OPTIONS_PRESETS } from "../client/src/lib/themes";
import {
  invitationConfigSchema,
  MAX_MENU_LABEL,
  MAX_MENU_OPTIONS,
} from "@shared/invitationConfig";
import type { InvitationConfig } from "@shared/invitationConfig";

/**
 * Le catalogue de plats n'était couvert par aucun test : en changer les
 * identifiants ne cassait rien, alors que le défaut de l'éditeur et les
 * brouillons enregistrés pouvaient continuer d'en citer d'anciens.
 */

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
  venueOptions: [],
  includeVenue: false,
  themeKey: "bytechnum",
  enableAnimation: true,
  motionIntensity: "normal",
  finalMessage: "",
};

describe("catalogue de plats", () => {
  it("propose huit plats, quatre béninois et quatre français", () => {
    expect(MENU_OPTIONS_PRESETS).toHaveLength(8);

    const beninois = ["amiwo", "telibo", "ablo", "atassi"];
    const francais = ["bistrot", "brasserie", "creperie", "fromages"];
    const ids = MENU_OPTIONS_PRESETS.map(m => m.id);

    for (const id of [...beninois, ...francais]) expect(ids).toContain(id);
  });

  it("donne à chaque plat un identifiant unique, un libellé et une icône", () => {
    const ids = MENU_OPTIONS_PRESETS.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const plat of MENU_OPTIONS_PRESETS) {
      expect(plat.label.trim()).not.toBe("");
      // Une icône lucide est un composant `forwardRef`, donc un objet et non
      // une fonction : on vérifie qu'elle est utilisable comme type d'élément.
      expect(["function", "object"]).toContain(typeof plat.Icon);
      expect(plat.Icon).toBeTruthy();
    }
  });

  it("garde chaque libellé sous la limite du schéma", () => {
    // Un libellé plus long que la limite serait accepté à la création puis
    // refusé à la relecture d'un brouillon.
    for (const plat of MENU_OPTIONS_PRESETS) {
      expect(plat.label.length).toBeLessThanOrEqual(MAX_MENU_LABEL);
      expect(plat.id.length).toBeLessThanOrEqual(MAX_MENU_LABEL);
    }
  });
});

describe("plats saisis librement", () => {
  it("accepte un libellé qui n'est pas au catalogue", () => {
    const parsed = invitationConfigSchema.safeParse({
      ...baseConfig,
      selectedMenuOptions: ["amiwo", "Wagasi grillé & piment vert"],
    });
    expect(parsed.success).toBe(true);
  });

  it("accepte un libellé rédigé jusqu'à la limite", () => {
    // L'ancienne limite de 32 caractères refusait la plupart des intitulés
    // écrits à la main.
    const long = "a".repeat(MAX_MENU_LABEL);
    expect(
      invitationConfigSchema.safeParse({ ...baseConfig, selectedMenuOptions: [long] }).success
    ).toBe(true);

    expect(
      invitationConfigSchema.safeParse({
        ...baseConfig,
        selectedMenuOptions: ["a".repeat(MAX_MENU_LABEL + 1)],
      }).success
    ).toBe(false);
  });

  it("refuse une liste vide ou au-delà du plafond", () => {
    expect(
      invitationConfigSchema.safeParse({ ...baseConfig, selectedMenuOptions: [] }).success
    ).toBe(false);

    const trop = Array.from({ length: MAX_MENU_OPTIONS + 1 }, (_, i) => `plat ${i}`);
    expect(
      invitationConfigSchema.safeParse({ ...baseConfig, selectedMenuOptions: trop }).success
    ).toBe(false);
  });

  it("laisse passer le catalogue entier plus des plats libres", () => {
    const tout = [...MENU_OPTIONS_PRESETS.map(m => m.id), "Piron & poisson fumé"];
    expect(tout.length).toBeLessThanOrEqual(MAX_MENU_OPTIONS);
    expect(
      invitationConfigSchema.safeParse({ ...baseConfig, selectedMenuOptions: tout }).success
    ).toBe(true);
  });
});
