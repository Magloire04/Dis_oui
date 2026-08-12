/**
 * Classement en barres horizontales.
 *
 * Une seule mesure comparée entre catégories : une seule teinte. Colorer
 * chaque barne différemment laisserait croire que la couleur porte une
 * information, alors que c'est la longueur qui la porte — et le classement
 * repeindrait les survivants au moindre filtre.
 *
 * Les barres sont horizontales : les libellés de thèmes sont longs, et les
 * poser à l'horizontale évite le texte incliné, illisible sur un téléphone.
 */

export type Barre = { cle: string; libelle: string; valeur: number };

export function BarresHorizontales({
  donnees,
  suffixe = "",
}: {
  donnees: Barre[];
  suffixe?: string;
}) {
  const max = Math.max(1, ...donnees.map(d => d.valeur));
  const total = donnees.reduce((n, d) => n + d.valeur, 0);

  if (total === 0) {
    return <p className="text-sm text-stone-500">Aucune donnée pour l'instant.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {donnees.map(d => {
        const part = (d.valeur / max) * 100;
        return (
          <li key={d.cle} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 items-center">
            <span className="text-sm text-stone-700 truncate" title={d.libelle}>
              {d.libelle}
            </span>
            <span className="text-sm font-semibold text-ink-900 tabular-nums">
              {d.valeur}
              {suffixe}
            </span>
            {/* La piste donne l'échelle ; l'extrémité arrondie signale la fin
                de la donnée sans l'exagérer. */}
            <span className="col-span-2 h-2 rounded-full bg-stone-100 overflow-hidden">
              <span
                className="block h-full rounded-full bg-brand-600"
                style={{ width: `${Math.max(part, d.valeur > 0 ? 3 : 0)}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
