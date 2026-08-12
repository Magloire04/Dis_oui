import { describe, expect, it } from "vitest";
import { applySocialMeta, socialMetaForPath } from "./socialMeta";

// Reproduit la structure de client/index.html : toute balise descriptive doit
// se trouver à l'intérieur des marqueurs.
const TEMPLATE = `<!doctype html>
<html lang="fr">
  <head>
    <title>Dis oui — Générateur d'invitations de rendez-vous interactives</title>
    <!-- social-meta:start -->
    <meta name="description" content="Créez une invitation de rendez-vous." />
    <meta property="og:title" content="Dis oui — Invitations de rendez-vous interactives" />
    <!-- social-meta:end -->
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("socialMetaForPath", () => {
  it("cible les liens privés", () => {
    expect(socialMetaForPath("/r/abc1234")?.noIndex).toBe(true);
    expect(socialMetaForPath("/track/jeton")?.noIndex).toBe(true);
  });

  it("laisse les routes publiques au gabarit", () => {
    for (const route of ["/", "/editor", "/confidentialite", "/mentions-legales"]) {
      expect(socialMetaForPath(route)).toBeNull();
    }
  });

  it("tolère une chaîne de requête ou une ancre", () => {
    // Les appelants passent req.originalUrl, qui peut en porter une.
    expect(socialMetaForPath("/r/abc1234?utm_source=whatsapp")?.noIndex).toBe(true);
    expect(socialMetaForPath("/r/abc1234#ouvrir")?.noIndex).toBe(true);
  });
});

describe("applySocialMeta", () => {
  const invitation = applySocialMeta(TEMPLATE, "/r/abc1234");

  it("remplace le titre par une formulation neutre", () => {
    expect(invitation).toContain("<title>Quelqu'un t'a envoyé quelque chose 👀</title>");
    expect(invitation).not.toContain("Générateur d'invitations");
  });

  it("ne divulgue jamais la nature de l'invitation dans l'aperçu", () => {
    // C'est tout l'objet de la fonctionnalité : préserver la surprise.
    for (const mot of ["rendez-vous", "invitation", "Dis oui"]) {
      expect(invitation.toLowerCase()).not.toContain(mot.toLowerCase());
    }
  });

  it("interdit l'indexation des liens privés", () => {
    expect(invitation).toContain('name="robots" content="noindex, nofollow"');
    expect(applySocialMeta(TEMPLATE, "/track/jeton")).toContain("noindex");
  });

  it("laisse le HTML intact sur une route publique", () => {
    expect(applySocialMeta(TEMPLATE, "/")).toBe(TEMPLATE);
    expect(applySocialMeta(TEMPLATE, "/editor")).toBe(TEMPLATE);
  });

  it("ne casse pas la page si les marqueurs ont disparu du gabarit", () => {
    const sansMarqueurs = "<html><head><title>Dis oui</title></head><body></body></html>";
    expect(applySocialMeta(sansMarqueurs, "/r/abc")).toBe(sansMarqueurs);
  });

  it("échappe les guillemets des valeurs injectées", () => {
    // Une valeur contenant un guillemet doit sortir échappée, sinon elle
    // referme l'attribut et permet d'injecter du balisage arbitraire.
    const piege = applySocialMeta(
      TEMPLATE.replace("Dis oui —", '"><script>alert(1)</script><span x="'),
      "/r/abc"
    );
    expect(piege).not.toContain("<script>alert(1)</script>");
  });

  it("ne laisse subsister aucune balise descriptive du gabarit", () => {
    const balises = invitation.match(/<meta name="description"[^>]*>/g) ?? [];
    expect(balises).toHaveLength(1);
    expect(balises[0]).toContain("Ouvre pour découvrir");
  });
});
