import { describe, expect, it } from "vitest";
import {
  invitationConfigSchema,
  MAX_VENUE_LABEL,
  MAX_VENUE_OPTIONS,
  userAuthoredText,
} from "@shared/invitationConfig";
import type { InvitationConfig } from "@shared/invitationConfig";
import { findForbiddenTerm } from "./contentFilter";

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

/** Le schéma renvoie la config validée, ou lève : les tests lisent le résultat. */
function valider(config: Record<string, unknown>) {
  return invitationConfigSchema.safeParse(config);
}

describe("lieux proposés par le créateur", () => {
  it("accepte jusqu'à trois lieux", () => {
    const resultat = valider({
      ...baseConfig,
      venueOptions: ["Le Livingstone", "Chez Maman Bénin", "La Plage de Fidjrossè"],
    });
    expect(resultat.success).toBe(true);
  });

  it("en refuse un quatrième", () => {
    // Au-delà, l'écran du destinataire devient une liste à dépouiller.
    const resultat = valider({
      ...baseConfig,
      venueOptions: Array.from({ length: MAX_VENUE_OPTIONS + 1 }, (_, i) => `Lieu ${i}`),
    });
    expect(resultat.success).toBe(false);
  });

  it("refuse un libellé plus long que ce que la réponse peut porter", () => {
    // `answer.venue` plafonne à 80 : un lieu plus long serait proposé au
    // destinataire puis refusé au moment de valider son billet.
    const resultat = valider({ ...baseConfig, venueOptions: ["x".repeat(MAX_VENUE_LABEL + 1)] });
    expect(resultat.success).toBe(false);
  });

  it("accepte un libellé à la longueur limite", () => {
    const resultat = valider({ ...baseConfig, venueOptions: ["x".repeat(MAX_VENUE_LABEL)] });
    expect(resultat.success).toBe(true);
  });

  it("vaut liste vide pour une invitation créée avant cet écran", () => {
    // Les configurations déjà en base n'ont pas ce champ ; sans valeur par
    // défaut, elles cesseraient d'être lisibles et le lien tomberait en erreur.
    const { venueOptions, ...sansLieux } = baseConfig;
    const resultat = valider(sansLieux);
    expect(resultat.success).toBe(true);
    if (resultat.success) expect(resultat.data.venueOptions).toEqual([]);
  });

  it("refuse un lieu vide, qui afficherait un bouton sans libellé", () => {
    expect(valider({ ...baseConfig, venueOptions: ["   "] }).success).toBe(false);
  });
});

describe("modération des textes rédigés par le créateur", () => {
  it("soumet les lieux au filtre", () => {
    const config = { ...baseConfig, venueOptions: ["Bar de la haine"] };
    expect(findForbiddenTerm(userAuthoredText(config))).toBe("haine");
  });

  it("soumet aussi les plats saisis librement", () => {
    // Ils échappaient au filtre : `userAuthoredText` ne listait pas
    // `selectedMenuOptions`, qui ne contenait que des identifiants de catalogue
    // avant que le créateur puisse ajouter ses propres plats.
    const config = { ...baseConfig, selectedMenuOptions: ["amiwo", "Plat de la haine"] };
    expect(findForbiddenTerm(userAuthoredText(config))).toBe("haine");
  });

  it("laisse passer les identifiants du catalogue et un lieu ordinaire", () => {
    const config = {
      ...baseConfig,
      selectedMenuOptions: ["amiwo", "telibo", "ablo", "bistrot"],
      venueOptions: ["Le Livingstone", "Chez Maman Bénin"],
    };
    expect(findForbiddenTerm(userAuthoredText(config))).toBeNull();
  });
});
