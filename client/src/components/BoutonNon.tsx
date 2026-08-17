import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { distanceAuCentre, positionLaPlusLoin, type Point } from "@/lib/fuite";

/**
 * Le bouton « Non » du parcours destinataire.
 *
 * Trois défauts mesurés sur la version précédente sont corrigés ici.
 *
 * La fuite partait de `mouseenter` sur le bouton : elle ne se déclenchait donc
 * qu'une fois le curseur *dedans*, et pas de nouveau tant qu'il n'en était pas
 * ressorti. Le bouton restait alors immobile et cliquable. On écoute
 * maintenant le pointeur sur l'aire de jeu, et le bouton décroche à
 * l'approche.
 *
 * Le décalage était tiré au hasard dans une amplitude plus petite que le
 * bouton lui-même. La nouvelle position est choisie parmi les plus éloignées
 * du pointeur, dans une aire mesurée.
 *
 * Sur mobile, `preventDefault` était sans effet : React enregistre
 * `touchstart` en écouteur passif, le tap produisait donc aussi un `click` et
 * comptait deux refus. L'écouteur est posé à la main, non passif.
 */

/** Distance à laquelle le bouton décroche, en pixels. */
const SEUIL_APPROCHE = 110;

/**
 * Durée pendant laquelle le bouton ne reçoit plus le pointeur, alignée sur la
 * transition CSS. Sans cela, la position change tout de suite mais l'affichage
 * glisse : le clic porte encore sur le bouton pendant tout le trajet.
 */
const DUREE_FUITE = 170;

/** Intervalle minimal entre deux refus comptés, en millisecondes. */
const DELAI_ENTRE_REFUS = 400;

type Props = {
  /** Le bouton se dérobe-t-il à l'approche ? */
  fuyant: boolean;
  /** Rétrécit-il à chaque refus ? */
  retrecissant: boolean;
  refusCount: number;
  /** Quota de refus atteint : le bouton se rend et cesse de fuir. */
  epuise: boolean;
  onRefus: () => void;
  /** Classes du thème pour l'état au repos. */
  classeIdle: string;
};

export function BoutonNon({ fuyant, retrecissant, refusCount, epuise, onRefus, classeIdle }: Props) {
  const aireRef = useRef<HTMLDivElement>(null);
  const boutonRef = useRef<HTMLButtonElement>(null);
  const dernierRefusRef = useRef(0);
  const finFuiteRef = useRef<number | undefined>(undefined);

  const [position, setPosition] = useState<Point | null>(null);
  const [enFuite, setEnFuite] = useState(false);

  const actif = fuyant && !epuise;

  // `onRefus` est recréé à chaque rendu du parent. Le garder dans une ref évite
  // de réenregistrer l'écouteur tactile en permanence.
  const onRefusRef = useRef(onRefus);
  onRefusRef.current = onRefus;

  const taille = () => {
    const bouton = boutonRef.current;
    // `offsetWidth` plutôt que le rectangle : avec le rétrécissement, le
    // rectangle renvoie la taille *après* mise à l'échelle et fausserait les
    // bornes de l'aire.
    return bouton ? { width: bouton.offsetWidth, height: bouton.offsetHeight } : null;
  };

  // Position de départ, puis simple recadrage aux redimensionnements : recentrer
  // le bouton annulerait une fuite en cours.
  useLayoutEffect(() => {
    const ajuster = () => {
      const aire = aireRef.current;
      const bouton = taille();
      if (!aire || !bouton) return;
      const maxX = Math.max(0, aire.clientWidth - bouton.width);
      const maxY = Math.max(0, aire.clientHeight - bouton.height);
      setPosition(precedente =>
        precedente
          ? { x: Math.min(precedente.x, maxX), y: Math.min(precedente.y, maxY) }
          : { x: maxX / 2, y: maxY / 2 }
      );
    };

    ajuster();
    const observateur = new ResizeObserver(ajuster);
    if (aireRef.current) observateur.observe(aireRef.current);
    return () => observateur.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(finFuiteRef.current), []);

  const compterRefus = useCallback(() => {
    const maintenant = performance.now();
    // Le pointeur suit le bouton à 60 images par seconde : sans ce délai, un
    // seul balayage épuiserait tout le quota et le parcours s'arrêterait net.
    if (maintenant - dernierRefusRef.current < DELAI_ENTRE_REFUS) return;
    dernierRefusRef.current = maintenant;
    onRefusRef.current();
  }, []);

  const fuir = useCallback(
    /**
     * `auPlusLoin` retire la part de hasard. Au doigt, la variante ramenait
     * parfois le saut à 32 px pour un bouton de 41 px de haut : le doigt
     * restait dessus et la fuite ne se voyait pas. Au curseur, on garde le
     * tirage, sans quoi le coin opposé suffirait à camper le bouton.
     */
    (pointeur: Point, auPlusLoin = false) => {
      const aire = aireRef.current;
      const bouton = taille();
      if (!aire || !bouton) return;

      const cadre = aire.getBoundingClientRect();
      setPosition(
        positionLaPlusLoin(
          { x: cadre.left, y: cadre.top, width: cadre.width, height: cadre.height },
          bouton,
          pointeur,
          auPlusLoin ? () => 0 : undefined
        )
      );

      setEnFuite(true);
      window.clearTimeout(finFuiteRef.current);
      finFuiteRef.current = window.setTimeout(() => setEnFuite(false), DUREE_FUITE);
    },
    []
  );

  const surDeplacement = (e: React.PointerEvent<HTMLDivElement>) => {
    // Le tactile n'a pas de survol : il passe par l'écouteur `touchstart`.
    if (!actif || enFuite || e.pointerType === "touch") return;
    const bouton = boutonRef.current?.getBoundingClientRect();
    if (!bouton) return;
    const pointeur = { x: e.clientX, y: e.clientY };
    // Sur le rectangle *affiché* : pendant la transition, c'est là que le clic
    // porterait réellement.
    const cadre = { x: bouton.left, y: bouton.top, width: bouton.width, height: bouton.height };
    if (distanceAuCentre(cadre, pointeur) > SEUIL_APPROCHE) return;
    fuir(pointeur);
    compterRefus();
  };

  useEffect(() => {
    const bouton = boutonRef.current;
    if (!bouton || !actif) return;

    const surTouche = (e: TouchEvent) => {
      // Non passif : c'est ce qui rend ce `preventDefault` effectif et supprime
      // le `click` synthétique qui doublait chaque refus.
      e.preventDefault();
      const doigt = e.touches[0];
      if (doigt) fuir({ x: doigt.clientX, y: doigt.clientY }, true);
      compterRefus();
    };

    bouton.addEventListener("touchstart", surTouche, { passive: false });
    return () => bouton.removeEventListener("touchstart", surTouche);
  }, [actif, fuir, compterRefus]);

  const surAppui = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Dernier verrou. Un curseur immobile posé sur le bouton ne produit aucun
    // `pointermove` : le bouton restait alors sur place et le clic portait —
    // c'était précisément le défaut de la version à `mouseenter`. En fuyant
    // dès l'appui, le relâchement ne trouve plus la même cible et le `click`
    // n'est jamais composé.
    if (!actif || e.pointerType === "touch") return;
    e.preventDefault();
    fuir({ x: e.clientX, y: e.clientY });
    compterRefus();
  };

  const surClic = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (epuise) return;
    compterRefus();
    // Le clavier ne peut pas poursuivre le bouton : activé par Entrée ou
    // Espace, il ne se dérobe pas. C'est la porte de sortie accessible.
    if (actif && e.detail > 0) fuir({ x: e.clientX, y: e.clientY });
  };

  const echelle = retrecissant ? Math.max(0.4, 1 - refusCount * 0.1) : 1;

  return (
    <div
      ref={aireRef}
      onPointerMove={surDeplacement}
      // Aire de jeu : le bouton s'y déplace en position absolue, ce qui la
      // garde à hauteur fixe et empêche le « Oui », resté au-dessus dans le
      // flux, d'être recouvert.
      className="relative h-28 w-full"
    >
      <button
        ref={boutonRef}
        type="button"
        disabled={epuise}
        onPointerDown={surAppui}
        onClick={surClic}
        style={{
          left: position?.x ?? 0,
          top: position?.y ?? 0,
          transform: `scale(${echelle})`,
          // Pendant le trajet, le bouton ne reçoit plus le pointeur : sinon la
          // transition de 170 ms ouvre une fenêtre de clic à chaque fuite.
          pointerEvents: enFuite ? "none" : undefined,
          visibility: position ? undefined : "hidden",
        }}
        className={`absolute w-40 py-3 rounded-2xl border font-semibold text-xs shadow-sm
          transition-[left,top,transform] duration-150 ease-out
          motion-reduce:transition-none
          disabled:opacity-40 disabled:cursor-not-allowed ${classeIdle}`}
      >
        {epuise ? "Le « Non » a rendu les armes" : "Non (refuser)"}
      </button>
    </div>
  );
}
