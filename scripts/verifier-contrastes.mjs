#!/usr/bin/env node
/**
 * Vérifie que chaque couple texte / fond des sept thèmes atteint le seuil WCAG AA.
 *
 * Pourquoi un script plutôt qu'un test Vitest : la suite ne tourne qu'en
 * environnement Node sur `server/`, et ce contrôle porte sur des classes
 * Tailwind résolues depuis `node_modules`. Il est appelé par `pnpm contrastes`
 * et sort en code 1 dès qu'un couple échoue.
 *
 * Les couleurs sont lues dans `tailwindcss/theme.css`, qui les exprime en
 * OKLCH : les recopier en dur ici les ferait diverger à la première montée de
 * version de Tailwind.
 *
 * Le fond d'une vignette est un dégradé. Tailwind v4 interpole en OKLAB, et le
 * pire contraste se situe souvent ENTRE deux arrêts, jamais sur l'un d'eux :
 * on échantillonne donc tout le dégradé.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "..");

const SEUIL_NORMAL = 4.5;
const SEUIL_LARGE = 3.0;
const ECHANTILLONS = 201;

// --- Conversion des couleurs -------------------------------------------------

function oklchVersRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return lin.map(v => {
    const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(c * 255)));
  });
}

function rgbVersOklab([r, g, b]) {
  const lin = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const [R, G, B] = lin;
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabVersRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map(v => {
    const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(c * 255)));
  });
}

function luminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contraste(avant, arriere) {
  const a = luminance(avant);
  const b = luminance(arriere);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Compose une couleur semi-transparente sur son fond. */
function composer(avant, arriere, alpha) {
  return avant.map((c, i) => Math.round(c * alpha + arriere[i] * (1 - alpha)));
}

// --- Palette -----------------------------------------------------------------

function chargerPalette() {
  const css = readFileSync(resolve(RACINE, "node_modules/tailwindcss/theme.css"), "utf8");
  const palette = new Map();
  for (const m of css.matchAll(/--color-([a-z]+-\d+|black|white):\s*(?:oklch\(([^)]+)\)|#([0-9a-f]{3,8}))/gi)) {
    const [, nom, oklch, hex] = m;
    if (oklch) {
      const [l, c, h] = oklch.trim().split(/\s+/);
      palette.set(nom, oklchVersRgb(parseFloat(l) / 100, parseFloat(c), parseFloat(h) || 0));
    } else if (hex) {
      const n = hex.length === 3 ? hex.split("").map(x => x + x).join("") : hex;
      palette.set(nom, [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16)));
    }
  }
  palette.set("white", [255, 255, 255]);
  palette.set("black", [0, 0, 0]);

  // Jetons de marque déclarés dans le @theme du projet.
  const projet = readFileSync(resolve(RACINE, "client/src/index.css"), "utf8");
  for (const m of projet.matchAll(/--color-((?:brand|ink)-\d+):\s*#([0-9a-f]{6})/gi)) {
    palette.set(m[1], [0, 2, 4].map(i => parseInt(m[2].slice(i, i + 2), 16)));
  }
  return palette;
}

const PALETTE = chargerPalette();

/**
 * « text-orange-900/70 », « bg-white/60 » ou « bg-[#fcf8f2]/90 » -> { rgb, alpha }.
 * Les valeurs arbitraires entre crochets sont acceptées : le thème Sépia en
 * emploie une pour sa teinte crème, absente de la palette Tailwind.
 */
function resoudre(classe) {
  const sansPrefixe = classe.replace(/^(text|bg|border|from|via|to)-/, "");
  const [nom, opacite] = sansPrefixe.split("/");
  const alpha = opacite ? Number(opacite) / 100 : 1;

  const arbitraire = nom.match(/^\[#([0-9a-f]{3}|[0-9a-f]{6})\]$/i);
  if (arbitraire) {
    const h = arbitraire[1];
    const n = h.length === 3 ? h.split("").map(x => x + x).join("") : h;
    return { rgb: [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16)), alpha };
  }

  const rgb = PALETTE.get(nom);
  if (!rgb) throw new Error(`Couleur Tailwind inconnue : ${classe} (résolue en « ${nom} »)`);
  return { rgb, alpha };
}

/** Échantillonne un dégradé « from-X via-Y to-Z » en interpolant en OKLAB. */
function echantillonnerDegrade(classes) {
  const arrets = classes
    .split(/\s+/)
    .filter(c => /^(from|via|to)-/.test(c))
    .map(c => rgbVersOklab(resoudre(c).rgb));
  if (arrets.length < 2) throw new Error(`Dégradé illisible : ${classes}`);

  const points = [];
  for (let i = 0; i < ECHANTILLONS; i++) {
    const t = (i / (ECHANTILLONS - 1)) * (arrets.length - 1);
    const bas = Math.min(Math.floor(t), arrets.length - 2);
    const f = t - bas;
    points.push(
      oklabVersRgb(arrets[bas].map((v, k) => v + (arrets[bas + 1][k] - v) * f))
    );
  }
  return points;
}

// --- Contrôles ---------------------------------------------------------------

// `pathToFileURL` est indispensable sous Windows : un chemin « C:\… » passé tel
// quel à import() est pris pour un protocole inconnu.
const { THEMES: themes } = await import(
  pathToFileURL(resolve(RACINE, "client/src/lib/themes.ts")).href
);

/** Extrait la première classe de couleur d'une chaîne de classes. */
function premiereCouleur(classes, prefixe) {
  return classes.split(/\s+/).find(c => c.startsWith(prefixe + "-"));
}

/**
 * Panneaux translucides de la page d'accueil, avec les couleurs de texte qui y
 * sont employées. Leur fond effectif dépend du thème choisi par le visiteur,
 * puisque cliquer une vignette repeint toute la page.
 *
 * Seuil 3,0 pour les titres, qui dépassent tous 24 px.
 */
const PANNEAUX_ACCUEIL = [
  ["en-tête", "bg-white/80", [["text-ink-900", 4.5], ["text-stone-600", 4.5]]],
  ["section", "bg-white/90", [["text-stone-900", 3.0], ["text-stone-600", 4.5]]],
];

const echecs = [];
const lignes = [];

for (const theme of Object.values(themes)) {
  const surDegrade = echantillonnerDegrade(theme.bgGradient);

  // Fond de carte : souvent semi-transparent, donc composé sur le dégradé.
  const fondCarte = premiereCouleur(theme.cardBg, "bg");
  const carte = resoudre(fondCarte);
  const pireFondCarte = surDegrade.map(p => composer(carte.rgb, p, carte.alpha));

  const controles = [
    { role: "textColor sur dégradé", classe: theme.textColor, fonds: surDegrade, seuil: SEUIL_LARGE },
    { role: "mutedText sur dégradé", classe: theme.mutedText, fonds: surDegrade, seuil: SEUIL_NORMAL },
    { role: "textColor sur carte", classe: theme.textColor, fonds: pireFondCarte, seuil: SEUIL_NORMAL },
    { role: "mutedText sur carte", classe: theme.mutedText, fonds: pireFondCarte, seuil: SEUIL_NORMAL },
    { role: "labelText sur carte", classe: theme.labelText, fonds: pireFondCarte, seuil: SEUIL_NORMAL },
  ];

  // Panneaux translucides de la page d'accueil : leur fond effectif dépend du
  // thème sous-jacent. Sur un thème sombre, un `bg-white/60` vire au gris moyen
  // où le texte secondaire devient illisible.
  for (const [nomPanneau, classeFond, textes] of PANNEAUX_ACCUEIL) {
    const panneau = resoudre(classeFond);
    const fonds = surDegrade.map(p => composer(panneau.rgb, p, panneau.alpha));
    for (const [classeTexte, seuil] of textes) {
      const { rgb, alpha } = resoudre(classeTexte);
      let pire = Infinity;
      for (const fond of fonds) {
        const compose = alpha < 1 ? composer(rgb, fond, alpha) : rgb;
        pire = Math.min(pire, contraste(compose, fond));
      }
      const ok = pire >= seuil;
      const role = `${nomPanneau} ${classeFond}`;
      lignes.push(
        `  ${ok ? "✓" : "✗"} ${theme.id.padEnd(10)} ${role.padEnd(24)} ${classeTexte.padEnd(22)} ${pire.toFixed(2).padStart(6)}  (seuil ${seuil})`
      );
      if (!ok) echecs.push({ theme: theme.id, role, classe: classeTexte, pire, seuil });
    }
  }

  for (const { role, classe, fonds, seuil } of controles) {
    const { rgb, alpha } = resoudre(classe);
    let pire = Infinity;
    for (const fond of fonds) {
      const compose = alpha < 1 ? composer(rgb, fond, alpha) : rgb;
      pire = Math.min(pire, contraste(compose, fond));
    }
    const ok = pire >= seuil;
    lignes.push(
      `  ${ok ? "✓" : "✗"} ${theme.id.padEnd(10)} ${role.padEnd(24)} ${classe.padEnd(22)} ${pire.toFixed(2).padStart(6)}  (seuil ${seuil})`
    );
    if (!ok) echecs.push({ theme: theme.id, role, classe, pire, seuil });
  }
}

console.log("Contrastes des thèmes — pire point de chaque dégradé\n");
console.log(lignes.join("\n"));

if (echecs.length) {
  console.error(`\n${echecs.length} couple(s) sous le seuil :`);
  for (const e of echecs) {
    console.error(`  ${e.theme} · ${e.role} · ${e.classe} : ${e.pire.toFixed(2)} < ${e.seuil}`);
  }
  process.exit(1);
}

console.log(`\nLes ${lignes.length} couples atteignent le seuil AA.`);
