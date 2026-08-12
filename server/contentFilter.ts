/**
 * Garde-fou de modération, volontairement minimal : il attrape les termes les
 * plus explicites sur un service public sans inscription. Ce n'est pas un
 * système de modération, seulement une première barrière.
 *
 * L'implémentation précédente faisait `JSON.stringify(config).includes(mot)`,
 * ce qui rejetait « la semaine prochaine » parce que « prochaine » contient
 * « haine ». On raisonne donc en mots entiers, sur les seuls champs rédigés
 * par l'utilisateur.
 */

const FORBIDDEN_WORDS = [
  "viol",
  "violer",
  "harcèlement",
  "harceler",
  "haine",
  "suicide",
  "suicider",
] as const;

// `\b` de JavaScript ne connaît que l'ASCII : sur « harcèlement », le `è`
// compte comme une frontière de mot et le motif casserait. Les lookarounds
// Unicode ci-dessous traitent lettres accentuées et chiffres comme du texte.
const BOUNDARY_BEFORE = "(?<![\\p{L}\\p{N}])";
const BOUNDARY_AFTER = "(?![\\p{L}\\p{N}])";

const FORBIDDEN_PATTERNS = FORBIDDEN_WORDS.map(
  word => new RegExp(`${BOUNDARY_BEFORE}${word}${BOUNDARY_AFTER}`, "iu")
);

/** Renvoie le premier terme interdit rencontré, ou `null` si le texte passe. */
export function findForbiddenTerm(texts: readonly string[]): string | null {
  for (const text of texts) {
    if (!text) continue;
    for (let i = 0; i < FORBIDDEN_PATTERNS.length; i++) {
      if (FORBIDDEN_PATTERNS[i].test(text)) {
        return FORBIDDEN_WORDS[i];
      }
    }
  }
  return null;
}
