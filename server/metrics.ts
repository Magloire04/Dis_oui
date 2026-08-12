/**
 * Mesure des temps de réponse des procédures tRPC.
 *
 * Volontairement en mémoire, et non en base : inscrire une ligne à chaque appel
 * transformerait chaque lecture en écriture, pour une donnée qui n'a d'intérêt
 * que récent et agrégé. La contrepartie est assumée — les mesures repartent de
 * zéro à chaque redémarrage, et la console l'affiche explicitement.
 *
 * Chaque procédure garde un tampon circulaire de ses derniers appels : la
 * mémoire consommée est bornée quoi qu'il arrive.
 */

const TAILLE_TAMPON = 500;

type Mesure = { dureeMs: number; erreur: boolean; a: number };

const tampons = new Map<string, Mesure[]>();
let demarrage = Date.now();

export function enregistrerAppel(procedure: string, dureeMs: number, erreur: boolean): void {
  let tampon = tampons.get(procedure);
  if (!tampon) {
    tampon = [];
    tampons.set(procedure, tampon);
  }
  tampon.push({ dureeMs, erreur, a: Date.now() });
  if (tampon.length > TAILLE_TAMPON) tampon.shift();
}

/**
 * Centile par la méthode du plus proche rang, sur une copie triée.
 *
 * Sur quelques centaines de points, trier coûte moins cher en complexité de
 * code qu'un algorithme d'approximation, pour un résultat exact.
 */
function centile(valeursTriees: number[], p: number): number {
  if (valeursTriees.length === 0) return 0;
  const rang = Math.ceil((p / 100) * valeursTriees.length);
  return valeursTriees[Math.min(rang, valeursTriees.length) - 1];
}

export type StatistiqueProcedure = {
  procedure: string;
  appels: number;
  erreurs: number;
  tauxErreur: number;
  medianeMs: number;
  p95Ms: number;
  maxMs: number;
};

export function statistiques(): StatistiqueProcedure[] {
  const sortie: StatistiqueProcedure[] = [];

  for (const [procedure, tampon] of tampons) {
    if (tampon.length === 0) continue;
    const durees = tampon.map(m => m.dureeMs).sort((a, b) => a - b);
    const erreurs = tampon.reduce((n, m) => n + (m.erreur ? 1 : 0), 0);

    sortie.push({
      procedure,
      appels: tampon.length,
      erreurs,
      tauxErreur: erreurs / tampon.length,
      medianeMs: Math.round(centile(durees, 50)),
      p95Ms: Math.round(centile(durees, 95)),
      maxMs: Math.round(durees[durees.length - 1]),
    });
  }

  return sortie.sort((a, b) => b.p95Ms - a.p95Ms);
}

export type ResumeMetriques = {
  depuis: Date;
  appelsTotal: number;
  erreursTotal: number;
  procedures: StatistiqueProcedure[];
};

export function resume(): ResumeMetriques {
  const procedures = statistiques();
  return {
    depuis: new Date(demarrage),
    appelsTotal: procedures.reduce((n, p) => n + p.appels, 0),
    erreursTotal: procedures.reduce((n, p) => n + p.erreurs, 0),
    procedures,
  };
}

/** Remise à zéro, utilisée par les tests. */
export function reinitialiser(): void {
  tampons.clear();
  demarrage = Date.now();
}
