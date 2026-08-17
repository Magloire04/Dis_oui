import { describe, expect, it } from "vitest";
import {
  distanceAuCentre,
  positionLaPlusLoin,
  positionsCandidates,
  type Cadre,
  type Taille,
} from "../client/src/lib/fuite";

/**
 * La fuite précédente était fausse d'un facteur trois — décalage tiré dans
 * ±65 px pour un bouton de 382 px de large — sans qu'aucun test ne puisse le
 * signaler. Ces contrôles mesurent ce que le hasard, lui, ne prouve pas.
 */

// Aire de jeu telle qu'elle est rendue sur un téléphone de 360 px.
const AIRE: Cadre = { x: 48, y: 400, width: 264, height: 112 };
const BOUTON: Taille = { width: 160, height: 40 };

const centreDe = (position: { x: number; y: number }) => ({
  x: AIRE.x + position.x + BOUTON.width / 2,
  y: AIRE.y + position.y + BOUTON.height / 2,
});

describe("fuite du bouton « Non »", () => {
  it("ne propose que des positions entièrement dans le cadre", () => {
    for (const position of positionsCandidates(AIRE, BOUTON)) {
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.x + BOUTON.width).toBeLessThanOrEqual(AIRE.width);
      expect(position.y + BOUTON.height).toBeLessThanOrEqual(AIRE.height);
    }
  });

  it("couvre toute la largeur disponible, pas seulement le centre", () => {
    // Le défaut d'origine : l'amplitude était plus petite que le bouton, donc
    // la fuite ne le sortait jamais de sous le curseur.
    const xs = positionsCandidates(AIRE, BOUTON).map(p => p.x);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(AIRE.width - BOUTON.width);
  });

  it("reste dans le cadre même si le bouton est plus large que l'aire", () => {
    const etroite: Taille = { width: 100, height: 40 };
    for (const position of positionsCandidates(etroite, BOUTON)) {
      expect(position.x).toBe(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("s'éloigne du pointeur quel que soit le tirage", () => {
    // Depuis chaque coin, et pour chacun des trois finalistes possibles, le
    // bouton doit finir hors de portée immédiate.
    const coins = [
      { x: AIRE.x, y: AIRE.y },
      { x: AIRE.x + AIRE.width, y: AIRE.y },
      { x: AIRE.x, y: AIRE.y + AIRE.height },
      { x: AIRE.x + AIRE.width, y: AIRE.y + AIRE.height },
    ];

    for (const pointeur of coins) {
      for (const tirage of [0, 0.5, 0.99]) {
        const centre = centreDe(positionLaPlusLoin(AIRE, BOUTON, pointeur, () => tirage));
        const distance = Math.hypot(centre.x - pointeur.x, centre.y - pointeur.y);
        // Au-delà du seuil d'approche de 110 px : le bouton ne peut pas se
        // reposer là où le curseur le rattraperait aussitôt.
        expect(distance).toBeGreaterThan(110);
      }
    }
  });

  it("ne se repose jamais sous le pointeur, même au centre de l'aire", () => {
    // Le cas le plus défavorable : le curseur au milieu, à distance égale de
    // tous les coins.
    const pointeur = { x: AIRE.x + AIRE.width / 2, y: AIRE.y + AIRE.height / 2 };
    for (const tirage of [0, 0.34, 0.67, 0.99]) {
      const position = positionLaPlusLoin(AIRE, BOUTON, pointeur, () => tirage);
      const centre = centreDe(position);
      const dansLeBouton =
        Math.abs(centre.x - pointeur.x) < BOUTON.width / 2 &&
        Math.abs(centre.y - pointeur.y) < BOUTON.height / 2;
      expect(dansLeBouton).toBe(false);
    }
  });

  it("propose plusieurs destinations différentes pour rester imprévisible", () => {
    const pointeur = { x: AIRE.x, y: AIRE.y };
    const atteintes = new Set(
      [0, 0.5, 0.99].map(t => {
        const p = positionLaPlusLoin(AIRE, BOUTON, pointeur, () => t);
        return `${p.x},${p.y}`;
      })
    );
    expect(atteintes.size).toBeGreaterThan(1);
  });

  it("retient la destination la plus lointaine quand le tirage est neutralisé", () => {
    // Le tactile emprunte ce chemin : la variante ramenait parfois le saut à
    // 32 px pour un bouton de 41 px de haut, le doigt restait dessus.
    const pointeur = { x: AIRE.x + AIRE.width / 2, y: AIRE.y + AIRE.height / 2 };
    const distanceDe = (p: { x: number; y: number }) => {
      const c = centreDe(p);
      return Math.hypot(c.x - pointeur.x, c.y - pointeur.y);
    };
    const maximum = Math.max(...positionsCandidates(AIRE, BOUTON).map(distanceDe));
    expect(distanceDe(positionLaPlusLoin(AIRE, BOUTON, pointeur, () => 0))).toBeCloseTo(maximum, 6);
  });

  it("mesure la distance depuis le centre du bouton affiché", () => {
    const bouton: Cadre = { x: 100, y: 200, width: 160, height: 40 };
    expect(distanceAuCentre(bouton, { x: 180, y: 220 })).toBe(0);
    expect(distanceAuCentre(bouton, { x: 180, y: 320 })).toBe(100);
  });
});
