import type { ThemeId, Tone } from "@shared/invitationConfig";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  bgGradient: string;
  cardBg: string;
  textColor: string;
  accentColor: string;
  buttonBg: string;
  particleColor: string;
  sceneType: ThemeId;
}

// `Record<ThemeId, …>` fait échouer la compilation si un thème du schéma
// partagé n'a pas d'implémentation visuelle ici, et inversement.
export const THEMES: Record<ThemeId, ThemeConfig> = {
  blush: {
    id: "blush",
    name: "Blush",
    tagline: "Rose poudré, terrasse au crépuscule",
    bgGradient: "from-rose-50 via-pink-100 to-amber-50",
    cardBg: "bg-white/80 backdrop-blur-md border-rose-200",
    textColor: "text-rose-950",
    accentColor: "bg-rose-500",
    buttonBg: "bg-rose-600 hover:bg-rose-700 text-white",
    particleColor: "rgba(244, 63, 94, 0.4)",
    sceneType: "blush",
  },
  midnight: {
    id: "midnight",
    name: "Minuit",
    tagline: "Bleu nuit, ciel étoilé, ambiance élégante",
    bgGradient: "from-slate-950 via-indigo-950 to-slate-900",
    cardBg: "bg-slate-900/80 backdrop-blur-md border-indigo-500/30",
    textColor: "text-indigo-100",
    accentColor: "bg-indigo-500",
    buttonBg: "bg-indigo-600 hover:bg-indigo-500 text-white",
    particleColor: "rgba(129, 140, 248, 0.6)",
    sceneType: "midnight",
  },
  citrus: {
    id: "citrus",
    name: "Agrume",
    tagline: "Orange & corail, été lumineux, plage",
    bgGradient: "from-amber-50 via-orange-100 to-yellow-100",
    cardBg: "bg-white/85 backdrop-blur-md border-orange-200",
    textColor: "text-orange-950",
    accentColor: "bg-orange-500",
    buttonBg: "bg-orange-500 hover:bg-orange-600 text-white",
    particleColor: "rgba(249, 115, 22, 0.4)",
    sceneType: "citrus",
  },
  forest: {
    id: "forest",
    name: "Forêt",
    tagline: "Vert profond, lucioles et mystère",
    bgGradient: "from-emerald-950 via-green-950 to-teal-950",
    cardBg: "bg-emerald-900/60 backdrop-blur-md border-emerald-700/40",
    textColor: "text-emerald-100",
    accentColor: "bg-emerald-500",
    buttonBg: "bg-emerald-600 hover:bg-emerald-500 text-white",
    particleColor: "rgba(52, 211, 153, 0.5)",
    sceneType: "forest",
  },
  sepia: {
    id: "sepia",
    name: "Sépia",
    tagline: "Crème & brun, cinéma rétro romantique",
    bgGradient: "from-amber-100 via-stone-200 to-amber-200",
    cardBg: "bg-[#fcf8f2]/90 backdrop-blur-md border-amber-300",
    textColor: "text-stone-900",
    accentColor: "bg-amber-700",
    buttonBg: "bg-amber-800 hover:bg-amber-900 text-amber-50",
    particleColor: "rgba(180, 130, 90, 0.3)",
    sceneType: "sepia",
  },
  neon: {
    id: "neon",
    name: "Néon",
    tagline: "Violet & cyan, ville nocturne branchée",
    bgGradient: "from-purple-950 via-violet-950 to-cyan-950",
    cardBg: "bg-gray-900/80 backdrop-blur-md border-cyan-500/40",
    textColor: "text-cyan-100",
    accentColor: "bg-cyan-400",
    buttonBg: "bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-white",
    particleColor: "rgba(34, 211, 238, 0.6)",
    sceneType: "neon",
  },
};

/**
 * Résout un identifiant de thème venant de la base : la colonne `config` est
 * un JSON libre, une invitation créée avant un renommage de thème peut donc
 * porter une valeur inconnue. On retombe sur « blush » plutôt que de rendre
 * une page cassée.
 */
export function resolveTheme(themeKey: unknown): ThemeConfig {
  if (typeof themeKey === "string" && themeKey in THEMES) {
    return THEMES[themeKey as ThemeId];
  }
  return THEMES.blush;
}

export const MENU_OPTIONS_PRESETS = [
  { id: "sushi", emoji: "🍣", label: "Bar à sushis & makis fondants" },
  { id: "italien", emoji: "🍝", label: "Trattoria italienne secrète" },
  { id: "burger", emoji: "🍔", label: "Gourmet burgers & frites truffées" },
  { id: "bistrot", emoji: "🍷", label: "Bistrot français & planches" },
  { id: "asiatique", emoji: "🍜", label: "Ramen fumants & nouilles sautées" },
  { id: "marocain", emoji: "🍲", label: "Couscous royal & pâtisseries" },
  { id: "libanais", emoji: "🧆", label: "Mezzés à partager & falafels" },
  { id: "brunch", emoji: "🥞", label: "Brunch XXL sucré-salé" },
  { id: "dessert", emoji: "🍨", label: "Bar à desserts & douceurs" },
];

export const TONE_PRESETS: Record<Tone, { question: string; teases: string[] }> = {
  doux: {
    question: "Tu veux passer un moment doux avec moi ?",
    teases: [
      "Oh, un petit clic un peu trop rapide ?",
      "Tu hésites encore ? Prends ton temps...",
      "Promis, ce sera une belle soirée.",
      "Le bouton 'Oui' est pourtant tellement plus lumineux !",
      "Tu me fais tourner en bourrique...",
      "Allez, dis oui !",
    ],
  },
  drôle: {
    question: "Tu veux sortir avec moi (ou tu préfères finir seule avec ton chat) ?",
    teases: [
      "Erreur 404 : refus non autorisé.",
      "Tu as essayé de cliquer sur Non ? C'est mignon.",
      "Mon chat a voté Oui, tu n'as plus le choix.",
      "Tu commences à fatiguer le curseur là !",
      "Le suspense insoutenable touche à sa fin...",
      "Bon, tu cliques sur Oui maintenant ?",
    ],
  },
  audacieux: {
    question: "Prête pour le meilleur rendez-vous de ta vie ?",
    teases: [
      "Fuir ne sert à rien.",
      "Tu joues avec le feu...",
      "Assume ton audace !",
      "Encore un effort vers le bouton magique.",
      "Le destin t'attend juste ici.",
      "C'est oui ou c'est oui ?",
    ],
  },
  romantique: {
    question: "Veux-tu m'accorder un rendez-vous inoubliable ?",
    teases: [
      "Mon cœur bat un peu plus vite à chaque tentative...",
      "Tu ne peux pas refuser à une telle étoile.",
      "Chaque seconde sans ton 'Oui' est une éternité.",
      "Le romantisme l'emportera, j'en suis sûr.",
      "Regarde comme le bouton 'Oui' brille pour toi...",
      "Dis oui, rends-moi le plus heureux.",
    ],
  },
};
