/**
 * Métadonnées de partage par route.
 *
 * L'application est une SPA : sans intervention serveur, tous les liens
 * partagent le titre unique du gabarit — « Dis oui — Générateur d'invitations
 * de rendez-vous interactives ». Coller ce lien dans WhatsApp affichait donc
 * l'objet de la surprise avant même son ouverture, alors que la FAQ promet
 * l'inverse.
 *
 * L'aperçu des liens privés est volontairement vague : il ne contient ni les
 * prénoms, ni la nature de l'invitation. Aucune donnée de l'invitation n'est
 * lue — le titre est le même pour toutes, ce qui évite au passage une requête
 * en base à chaque passage de robot.
 */

const START_MARKER = "<!-- social-meta:start -->";
const END_MARKER = "<!-- social-meta:end -->";

type SocialMeta = {
  title: string;
  description: string;
  /** Les liens privés ne doivent pas se retrouver dans un index public. */
  noIndex: boolean;
};

const PRIVATE_INVITATION: SocialMeta = {
  title: "Quelqu'un t'a envoyé quelque chose 👀",
  description: "Ouvre pour découvrir.",
  noIndex: true,
};

const PRIVATE_TRACKING: SocialMeta = {
  title: "Page de suivi privée",
  description: "Ce lien est personnel.",
  noIndex: true,
};

/**
 * Renvoie les métadonnées à appliquer, ou `null` pour laisser celles du
 * gabarit.
 *
 * Accepte une URL complète autant qu'un chemin : les appelants passent
 * `req.originalUrl`, qui porte la chaîne de requête. À noter que `req.path`
 * ne convient pas ici — dans un middleware monté sur `"*"`, il vaut toujours
 * `/`, ce qui neutralisait silencieusement toute l'injection.
 */
export function socialMetaForPath(url: string): SocialMeta | null {
  const pathname = url.split(/[?#]/)[0];
  if (/^\/r\/[^/]+\/?$/.test(pathname)) return PRIVATE_INVITATION;
  if (/^\/track\/[^/]+\/?$/.test(pathname)) return PRIVATE_TRACKING;
  return null;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTags(meta: SocialMeta): string {
  const title = escapeAttribute(meta.title);
  const description = escapeAttribute(meta.description);

  return [
    START_MARKER,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta name="description" content="${description}" />`,
    `<meta name="twitter:card" content="summary" />`,
    meta.noIndex ? `<meta name="robots" content="noindex, nofollow" />` : "",
    END_MARKER,
  ]
    .filter(Boolean)
    .join("\n    ");
}

/**
 * Réécrit le `<title>` et le bloc de métadonnées sociales du HTML servi.
 * Renvoie le HTML inchangé si la route est publique ou si les marqueurs sont
 * absents — mieux vaut un aperçu générique qu'une page cassée.
 */
export function applySocialMeta(html: string, pathname: string): string {
  const meta = socialMetaForPath(pathname);
  if (!meta) return html;

  const start = html.indexOf(START_MARKER);
  const end = html.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) {
    console.warn("[SocialMeta] Marqueurs absents du gabarit HTML : aperçu générique conservé.");
    return html;
  }

  return (
    html.slice(0, start) +
    renderTags(meta) +
    html.slice(end + END_MARKER.length)
  ).replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttribute(meta.title)}</title>`);
}
