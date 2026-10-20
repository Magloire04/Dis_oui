import type { NextFunction, Request, Response } from "express";

/**
 * En-têtes de sécurité posés sur chaque réponse du serveur.
 *
 * - HSTS : le navigateur n'ouvre plus le site qu'en HTTPS pendant un an. Sans
 *   `includeSubDomains` ni `preload`, volontairement : ces options engageraient
 *   tous les sous-domaines de bytechnum.com, y compris ceux qui ne sont pas
 *   gérés par ce projet.
 * - nosniff : le navigateur respecte le type de contenu annoncé.
 * - SAMEORIGIN : seules les pages du site peuvent l'afficher dans un cadre,
 *   ce qui écarte le détournement de clic depuis un site tiers.
 * - Referrer-Policy : l'adresse complète d'une invitation ne fuit pas vers
 *   les sites externes, seul le domaine d'origine est transmis.
 *
 * La politique de sécurité du contenu (CSP) n'en fait pas partie : elle
 * demande d'être éprouvée en mode rapport avant d'être imposée, sous peine de
 * casser l'interface.
 */
export const EN_TETES_SECURITE: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export function enTetesSecurite(
  _requete: Request,
  reponse: Response,
  suite: NextFunction
) {
  for (const [nom, valeur] of Object.entries(EN_TETES_SECURITE)) {
    reponse.setHeader(nom, valeur);
  }
  suite();
}
