/**
 * Adresse canonique par route.
 *
 * Sans elle, un moteur de recherche retient l'adresse par laquelle il a
 * découvert la page, paramètres de suivi compris : l'accueil s'est retrouvé
 * indexé sous « /?ref=… ». La balise désigne l'adresse propre de chaque page
 * publique, et rien d'autre.
 */

/**
 * Pages que l'on veut voir dans un index public. Les liens privés (/r/…,
 * /track/…) et la console sont en noindex : leur donner une adresse canonique
 * n'aurait aucun sens.
 */
const PUBLIC_PAGES = new Set([
  "/",
  "/editor",
  "/confidentialite",
  "/mentions-legales",
]);

/**
 * Renvoie l'adresse canonique de la route, ou `null` s'il n'y en a pas.
 *
 * Accepte `req.originalUrl`, chaîne de requête comprise. Une base qui n'est
 * pas en https est celle d'un poste de développement : la publier dans une
 * balise désignerait `localhost` aux moteurs de recherche.
 */
export function canonicalUrlForPath(
  url: string,
  publicBaseUrl: string
): string | null {
  if (!publicBaseUrl.startsWith("https://")) return null;

  const pathname = url.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (!PUBLIC_PAGES.has(pathname)) return null;

  return publicBaseUrl.replace(/\/+$/, "") + pathname;
}

/**
 * Ajoute la balise canonique à l'en-tête du HTML servi. Renvoie le HTML
 * inchangé si la route n'a pas d'adresse canonique.
 */
export function applyCanonical(
  html: string,
  url: string,
  publicBaseUrl: string
): string {
  const canonical = canonicalUrlForPath(url, publicBaseUrl);
  if (!canonical) return html;

  const end = html.indexOf("</head>");
  if (end === -1) return html;

  return `${html.slice(0, end)}<link rel="canonical" href="${canonical}" />\n  ${html.slice(end)}`;
}
