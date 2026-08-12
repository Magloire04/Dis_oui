import { useId, useState } from "react";

/**
 * Deux séries quotidiennes sur un même axe.
 *
 * Écrit en SVG plutôt qu'avec une bibliothèque : le bundle client dépasse déjà
 * 500 Ko, et deux séries de trente points ne justifient pas d'y ajouter cent
 * kilo-octets pour une page consultée par une seule personne.
 *
 * Un seul axe des ordonnées, volontairement : les deux séries se comptent dans
 * la même unité (des invitations), donc elles se comparent. Deux échelles
 * superposées laisseraient croire à des croisements qui n'existent pas.
 */

export type PointSerie = { jour: string; invitations: number; reponses: number };

// Bleu de marque et ambre : couple validé pour les dyschromatopsies
// (ΔE 32 en protanopie, 36 en vision normale).
const COULEUR_INVITATIONS = "#4d69f1";
const COULEUR_REPONSES = "#d97706";

const L = 560;
const H = 180;
const MARGE = { haut: 12, droite: 12, bas: 26, gauche: 32 };

function cheminLisse(points: Array<[number, number]>): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function SerieTemporelle({ donnees }: { donnees: PointSerie[] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const idGradient = useId();

  if (donnees.length === 0) {
    return <p className="text-sm text-stone-500">Aucune donnée sur la période.</p>;
  }

  const max = Math.max(1, ...donnees.map(d => Math.max(d.invitations, d.reponses)));
  const largeurUtile = L - MARGE.gauche - MARGE.droite;
  const hauteurUtile = H - MARGE.haut - MARGE.bas;

  const x = (i: number) =>
    MARGE.gauche + (donnees.length === 1 ? largeurUtile / 2 : (i / (donnees.length - 1)) * largeurUtile);
  const y = (v: number) => MARGE.haut + hauteurUtile - (v / max) * hauteurUtile;

  const ptsInv = donnees.map((d, i) => [x(i), y(d.invitations)] as [number, number]);
  const ptsRep = donnees.map((d, i) => [x(i), y(d.reponses)] as [number, number]);

  // Quatre graduations suffisent à situer les valeurs sans charger la grille.
  const graduations = [0, 0.5, 1].map(f => Math.round(max * f));
  const pointSurvole = survol !== null ? donnees[survol] : null;

  /**
   * `new Date("2026-08-12")` est interprété en UTC : à l'ouest de Greenwich,
   * la date affichée reculerait d'un jour. On construit donc la date à partir
   * de ses composantes, qui sont lues en heure locale.
   */
  const formatJour = (iso: string) => {
    const [a, m, j] = iso.split("-").map(Number);
    return new Date(a, m - 1, j).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <figure className="space-y-3">
      {/* Légende : deux séries, l'identité ne repose donc jamais sur la seule
          couleur — chaque entrée porte son nom. */}
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full" style={{ background: COULEUR_INVITATIONS }} />
          Invitations créées
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full" style={{ background: COULEUR_REPONSES }} />
          Réponses reçues
        </span>
      </figcaption>

      <div className="relative">
        <svg
          viewBox={`0 0 ${L} ${H}`}
          className="w-full h-auto touch-none"
          role="img"
          aria-label={`Invitations et réponses sur ${donnees.length} jours`}
          onMouseLeave={() => setSurvol(null)}>
          <defs>
            <linearGradient id={idGradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COULEUR_INVITATIONS} stopOpacity="0.16" />
              <stop offset="100%" stopColor={COULEUR_INVITATIONS} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grille en retrait : elle situe, elle ne se regarde pas. */}
          {graduations.map(v => (
            <g key={v}>
              <line
                x1={MARGE.gauche}
                x2={L - MARGE.droite}
                y1={y(v)}
                y2={y(v)}
                stroke="#e7e5e4"
                strokeWidth="1"
              />
              <text x={4} y={y(v) + 3} className="fill-stone-400" style={{ fontSize: 9 }}>
                {v}
              </text>
            </g>
          ))}

          <path d={`${cheminLisse(ptsInv)} L${x(donnees.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${idGradient})`} />

          <path d={cheminLisse(ptsRep)} fill="none" stroke={COULEUR_REPONSES} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={cheminLisse(ptsInv)} fill="none" stroke={COULEUR_INVITATIONS} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Repère de survol. */}
          {survol !== null && (
            <g>
              <line x1={x(survol)} x2={x(survol)} y1={MARGE.haut} y2={H - MARGE.bas} stroke="#a8a29e" strokeWidth="1" strokeDasharray="3 3" />
              {/* Anneau de la couleur du fond : le marqueur se détache même
                  quand les deux séries se superposent. */}
              <circle cx={x(survol)} cy={y(donnees[survol].invitations)} r="4.5" fill={COULEUR_INVITATIONS} stroke="#ffffff" strokeWidth="2" />
              <circle cx={x(survol)} cy={y(donnees[survol].reponses)} r="4.5" fill={COULEUR_REPONSES} stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* Zones de capture : bien plus larges que les marques, pour rester
              atteignables au doigt. */}
          {donnees.map((d, i) => (
            <rect
              key={d.jour}
              x={x(i) - largeurUtile / donnees.length / 2}
              y={0}
              width={largeurUtile / donnees.length}
              height={H}
              fill="transparent"
              onMouseEnter={() => setSurvol(i)}
              onTouchStart={() => setSurvol(i)}
            />
          ))}

          <text x={MARGE.gauche} y={H - 8} className="fill-stone-400" style={{ fontSize: 9 }}>
            {formatJour(donnees[0].jour)}
          </text>
          <text x={L - MARGE.droite} y={H - 8} textAnchor="end" className="fill-stone-400" style={{ fontSize: 9 }}>
            {formatJour(donnees[donnees.length - 1].jour)}
          </text>
        </svg>

        {pointSurvole && (
          <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-ink-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg space-y-0.5">
              <p className="font-semibold">{formatJour(pointSurvole.jour)}</p>
              <p>{pointSurvole.invitations} invitation{pointSurvole.invitations > 1 ? "s" : ""}</p>
              <p>{pointSurvole.reponses} réponse{pointSurvole.reponses > 1 ? "s" : ""}</p>
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
