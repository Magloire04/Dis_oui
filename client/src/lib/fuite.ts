/**
 * Géométrie de la fuite du bouton « Non ».
 *
 * Isolée du composant pour être vérifiable : la version précédente tirait un
 * décalage au hasard dans ±65 px alors que la demi-largeur du bouton était de
 * 191 px. La fuite ne pouvait donc pas sortir le bouton de sous le curseur, et
 * personne ne pouvait s'en apercevoir sans mesurer à la main.
 */

export type Point = { x: number; y: number };
export type Taille = { width: number; height: number };
export type Cadre = Point & Taille;

/** Nombre de positions proposées : cinq colonnes, trois rangées. */
const COLONNES = 5;
const RANGEES = 3;

/**
 * Parmi combien des meilleures positions on tire au sort. Toujours prendre la
 * plus lointaine rendrait la fuite prévisible : le curseur n'aurait qu'à
 * camper le coin opposé.
 */
const MEILLEURES = 3;

/**
 * Positions atteignables par le bouton, exprimées en coordonnées locales de
 * l'aire de jeu. Le bouton reste entièrement dans le cadre : il ne doit jamais
 * sortir de la carte, sur un écran étroit il deviendrait inatteignable.
 */
export function positionsCandidates(aire: Taille, bouton: Taille): Point[] {
  const maxX = Math.max(0, aire.width - bouton.width);
  const maxY = Math.max(0, aire.height - bouton.height);
  const positions: Point[] = [];
  for (let colonne = 0; colonne < COLONNES; colonne++) {
    for (let rangee = 0; rangee < RANGEES; rangee++) {
      positions.push({
        x: (maxX * colonne) / (COLONNES - 1),
        y: (maxY * rangee) / (RANGEES - 1),
      });
    }
  }
  return positions;
}

/**
 * Choisit où le bouton se pose pour s'éloigner du pointeur.
 *
 * `aire` est en coordonnées de la fenêtre, comme `pointeur` ; la position
 * rendue est locale à l'aire. `tirage` est injecté pour rendre le choix
 * reproductible en test.
 */
export function positionLaPlusLoin(
  aire: Cadre,
  bouton: Taille,
  pointeur: Point,
  tirage: () => number = Math.random
): Point {
  const classees = positionsCandidates(aire, bouton)
    .map(position => {
      const centreX = aire.x + position.x + bouton.width / 2;
      const centreY = aire.y + position.y + bouton.height / 2;
      return { position, distance: Math.hypot(centreX - pointeur.x, centreY - pointeur.y) };
    })
    .sort((a, b) => b.distance - a.distance);

  const finalistes = classees.slice(0, MEILLEURES);
  const index = Math.min(finalistes.length - 1, Math.floor(tirage() * finalistes.length));
  return finalistes[index].position;
}

/** Distance du pointeur au centre du bouton, tel qu'il est réellement affiché. */
export function distanceAuCentre(bouton: Cadre, pointeur: Point): number {
  return Math.hypot(
    bouton.x + bouton.width / 2 - pointeur.x,
    bouton.y + bouton.height / 2 - pointeur.y
  );
}
