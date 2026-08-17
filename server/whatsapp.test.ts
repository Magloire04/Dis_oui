import { describe, expect, it } from "vitest";
import {
  creatorPhoneSchema,
  lienWhatsApp,
  messageWhatsApp,
  normaliserNumero,
  numeroValide,
} from "@shared/whatsapp";

/**
 * Un numéro mal normalisé ne casse rien : le bouton s'affiche, s'ouvre, et
 * mène à une conversation avec un correspondant inexistant. L'échec est
 * silencieux du côté du destinataire comme du créateur — d'où ces contrôles.
 */

describe("numéro WhatsApp", () => {
  it("ne garde que les chiffres, le « + » étant porté par le format", () => {
    expect(normaliserNumero("+229 01 96 00 00 00")).toBe("2290196000000");
    expect(normaliserNumero("+33 (0)6-12-34-56-78")).toBe("330612345678");
  });

  it("accepte un numéro international, à Cotonou comme à Paris", () => {
    expect(numeroValide("+229 01 96 00 00 00")).toBe(true);
    expect(numeroValide("+33 6 12 34 56 78")).toBe(true);
    expect(numeroValide("2290196000000")).toBe(true);
  });

  it("refuse un numéro national, qui mènerait à un correspondant inexistant", () => {
    // C'est la saisie la plus probable : on tape son numéro comme on le donne.
    expect(numeroValide("01 96 00 00 00")).toBe(false);
    expect(numeroValide("06 12 34 56 78")).toBe(false);
  });

  it("refuse les longueurs hors E.164", () => {
    expect(numeroValide("229019")).toBe(false);
    expect(numeroValide("2290196000000000000")).toBe(false);
  });

  it("traite le champ vide comme « non renseigné » plutôt que comme un numéro vide", () => {
    // Un numéro vide en base afficherait au destinataire un bouton inerte.
    expect(creatorPhoneSchema.parse("")).toBeNull();
    expect(creatorPhoneSchema.parse(undefined)).toBeUndefined();
  });

  it("enregistre le numéro déjà normalisé", () => {
    expect(creatorPhoneSchema.parse("+229 01 96 00 00 00")).toBe("2290196000000");
  });

  it("rejette une saisie invalide avec un message en français", () => {
    const resultat = creatorPhoneSchema.safeParse("06 12 34 56 78");
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0].message).toMatch(/format international/);
    }
  });
});

describe("message de notification", () => {
  const base = { recipientName: "Amina", creneau: "vendredi 21 août à 19h30" };

  it("porte la réponse, sans les champs laissés vides", () => {
    const message = messageWhatsApp({ ...base, menu: "Amiwo & poulet braisé" });
    expect(message).toContain("Amina");
    expect(message).toContain("vendredi 21 août à 19h30");
    expect(message).toContain("Amiwo & poulet braisé");
    expect(message).not.toContain("Lieu :");
    expect(message).not.toContain("Note :");
  });

  it("ne contient jamais de lien de suivi", () => {
    // Le lien de suivi porte le jeton du créateur, qui donne accès à son
    // adresse et aux réponses des autres destinataires. Ce message est composé
    // sur l'appareil du destinataire : il n'a rien à y faire.
    const message = messageWhatsApp({
      ...base,
      menu: "Télibo",
      lieu: "Chez Maman Bénin",
      note: "J'ai hâte",
      lienInvitation: "https://disoui.bytechnum.com/r/abc1234",
    });
    expect(message).not.toContain("/track/");
    expect(message).toContain("/r/abc1234");
  });

  it("produit un lien wa.me ouvrable, message encodé", () => {
    const lien = lienWhatsApp("+229 01 96 00 00 00", messageWhatsApp(base));
    expect(lien.startsWith("https://wa.me/2290196000000?text=")).toBe(true);

    // Les retours à la ligne et les accents doivent survivre au transport.
    const texte = decodeURIComponent(new URL(lien).searchParams.get("text") ?? "");
    expect(texte).toContain("\n");
    expect(texte).toContain("vendredi 21 août");
  });
});
