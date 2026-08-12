import { describe, expect, it } from "vitest";
import { findForbiddenTerm } from "./contentFilter";

describe("findForbiddenTerm", () => {
  it("laisse passer un texte ordinaire", () => {
    expect(
      findForbiddenTerm(["Un verre ce vendredi ?", "J'ai hâte de te voir", "Trattoria italienne"])
    ).toBeNull();
  });

  it("détecte un terme interdit isolé", () => {
    expect(findForbiddenTerm(["Un message plein de haine"])).toBe("haine");
    expect(findForbiddenTerm(["propos de harcèlement"])).toBe("harcèlement");
  });

  it("ne se déclenche pas sur un mot qui en contient un autre", () => {
    // Le défaut d'origine : `includes("haine")` rejetait « prochaine ».
    const pieges = [
      "On se voit la semaine prochaine",
      "Une soirée lointaine",
      "Un rendez-vous à la fontaine",
      "Rue Villon, quartier Sainte-Marie",
    ];
    for (const texte of pieges) {
      expect(findForbiddenTerm([texte])).toBeNull();
    }
  });

  it("reste insensible à la casse", () => {
    expect(findForbiddenTerm(["HAINE"])).toBe("haine");
    expect(findForbiddenTerm(["Haine"])).toBe("haine");
  });

  it("gère les frontières de mots autour des lettres accentuées", () => {
    // Le \b de JavaScript est ASCII : « è » y compte comme une frontière, ce
    // qui casserait le motif « harcèlement » avec un simple \b.
    expect(findForbiddenTerm(["harcèlement moral"])).toBe("harcèlement");
    expect(findForbiddenTerm(["déharcèlementer"])).toBeNull();
  });

  it("inspecte tous les champs fournis, pas seulement le premier", () => {
    expect(findForbiddenTerm(["Bonjour", "Ça va ?", "plein de haine"])).toBe("haine");
  });

  it("ignore les chaînes vides", () => {
    expect(findForbiddenTerm(["", "", "Un verre ?"])).toBeNull();
  });
});
