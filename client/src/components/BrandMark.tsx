/**
 * Marque « Dis oui », dans le langage visuel ByTechnum.
 *
 * Deux accolades anthracite encadrent un cœur en pixels bleu, plus un pixel
 * détaché en accent : les accolades et le motif pixellisé sont la signature
 * ByTechnum, le cœur dit ce que fait le produit. Le dessin tient sur une grille
 * de 32 unités et reste lisible à 16 px, taille d'un favicon.
 *
 * Le bleu est ici le #4f6bf6 **exact** de la charte, et non le `brand-600` de
 * l'interface : un logo n'est pas du texte, il n'est soumis à aucun seuil de
 * contraste et n'a donc pas besoin de la correction de 2 % appliquée aux
 * boutons (voir le commentaire de l'échelle dans index.css).
 */

const BRAND_BLUE = "#4f6bf6";
const INK = "#2d2d2d";

/**
 * Cœur pixellisé, décrit par ligne : chaque entrée donne la colonne de départ
 * et le nombre de pixels. Une grille plutôt qu'un tracé courbe, pour que les
 * arêtes restent franches à toute taille.
 *
 * La grille fait 8 colonnes et la pointe basse en compte deux : terminer sur
 * un pixel unique donnait une queue qui se lisait comme une hampe, pas comme
 * la pointe d'un cœur.
 */
const HEART_ROWS: Array<Array<[startColumn: number, length: number]>> = [
  [[1, 2], [5, 2]],
  [[0, 8]],
  [[0, 8]],
  [[0, 8]],
  [[1, 6]],
  [[2, 4]],
  [[3, 2]],
];

const PIXEL = 1.45;
const HEART_ORIGIN_X = 10.2;
// Centrage optique et non géométrique : la masse d'un cœur étant concentrée en
// haut, un centrage exact le fait paraître trop haut entre les accolades.
const HEART_ORIGIN_Y = 11.2;

type BrandMarkProps = {
  /** Côté du rendu, en pixels CSS. */
  size?: number;
  className?: string;
  /** Rend le dessin décoratif quand il est déjà accompagné du nom écrit. */
  decorative?: boolean;
};

export function BrandMark({ size = 32, className, decorative = false }: BrandMarkProps) {
  const pixels = HEART_ROWS.flatMap((segments, row) =>
    segments.map(([column, length]) => (
      <rect
        key={`${row}-${column}`}
        x={HEART_ORIGIN_X + column * PIXEL}
        y={HEART_ORIGIN_Y + row * PIXEL}
        width={PIXEL * length}
        height={PIXEL}
      />
    ))
  );

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Dis oui"}
    >
      {/* Accolades : la signature ByTechnum. Le décrochement central est
          marqué, sans quoi le tracé se lit comme une parenthèse. */}
      <g
        fill="none"
        stroke={INK}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M10.5 4.2C8.4 4.2 7.9 5.7 7.9 8.2v4.6c0 1.9-1.3 3.2-3 3.2 1.7 0 3 1.3 3 3.2v4.6c0 2.5.5 4 2.6 4" />
        <path d="M21.5 4.2c2.1 0 2.6 1.5 2.6 4v4.6c0 1.9 1.3 3.2 3 3.2-1.7 0-3 1.3-3 3.2v4.6c0 2.5-.5 4-2.6 4" />
      </g>

      {/* Cœur pixellisé. */}
      <g fill={BRAND_BLUE}>{pixels}</g>
    </svg>
  );
}

/**
 * Verrou visuel complet : la marque suivie du nom. Utilisé dans les en-têtes
 * de page et le pied de page.
 */
export function BrandLockup({
  size = 32,
  label = "Dis oui",
  className,
  labelClassName,
}: {
  size?: number;
  label?: string;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <BrandMark size={size} decorative />
      <span className={`font-display font-bold tracking-tight ${labelClassName ?? ""}`}>{label}</span>
    </span>
  );
}
