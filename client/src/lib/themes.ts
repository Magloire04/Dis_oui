import type { LucideIcon } from "lucide-react";
import {
  Bean,
  Beef,
  Citrus,
  CookingPot,
  Croissant,
  Drumstick,
  Fish,
  Flower,
  Gem,
  Grape,
  MoonStar,
  ScrollText,
  TreePine,
  Wine,
  Zap,
} from "lucide-react";
import type { ThemeId, Tone } from "@shared/invitationConfig";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  /**
   * Pictogramme de la vignette de thème.
   *
   * Une icône vectorielle et non un emoji : le rendu d'un emoji dépend du
   * système d'exploitation, et l'accumulation donnait à l'interface un air de
   * maquette. Le trait suit celui des autres icônes de l'application.
   *
   * Le pictogramme vivait auparavant dans une chaîne de ternaires dupliquée
   * entre l'accueil et l'éditeur, qui retombait silencieusement sur un défaut
   * pour tout identifiant inconnu : un thème ajouté y restait invisible.
   */
  Icon: LucideIcon;
  bgGradient: string;
  cardBg: string;
  textColor: string;
  accentColor: string;
  buttonBg: string;
  particleColor: string;
  sceneType: ThemeId;
  /** Texte secondaire, lisible sur `cardBg`. */
  mutedText: string;
  /** Libellés de section : plus discrets encore que `mutedText`. */
  labelText: string;
  /** Ligne de choix non sélectionnée (bordure, texte, survol). */
  optionIdle: string;
  /** Ligne de choix sélectionnée. */
  optionSelected: string;
  /**
   * Pastille d'accent translucide (derrière l'emoji).
   *
   * Écrite en toutes lettres et non composée à l'exécution : Tailwind analyse
   * le code source, une classe formée par `${accentColor}/15` n'existerait
   * jamais dans le CSS généré.
   */
  accentSoft: string;
  /** Encart récapitulatif du billet final. */
  panelBg: string;
}

// `Record<ThemeId, …>` fait échouer la compilation si un thème du schéma
// partagé n'a pas d'implémentation visuelle ici, et inversement.
export const THEMES: Record<ThemeId, ThemeConfig> = {
  blush: {
    id: "blush",
    Icon: Flower,
    name: "Blush",
    tagline: "Rose poudré, terrasse au crépuscule",
    bgGradient: "from-rose-50 via-pink-100 to-amber-50",
    cardBg: "bg-white/80 backdrop-blur-md border-rose-200",
    textColor: "text-rose-950",
    accentColor: "bg-rose-500",
    buttonBg: "bg-rose-600 hover:bg-rose-700 text-white",
    particleColor: "rgba(244, 63, 94, 0.4)",
    sceneType: "blush",
    accentSoft: "bg-rose-500/15",
    mutedText: "text-stone-600",
    labelText: "text-stone-500",
    optionIdle: "border-stone-200 text-stone-700 hover:bg-stone-50",
    optionSelected: "border-rose-500 bg-rose-50 text-rose-900 font-bold shadow-sm",
    panelBg: "bg-stone-50 border-stone-200 text-stone-700",
  },
  midnight: {
    id: "midnight",
    Icon: MoonStar,
    name: "Minuit",
    tagline: "Bleu nuit, ciel étoilé, ambiance élégante",
    bgGradient: "from-slate-950 via-indigo-950 to-slate-900",
    cardBg: "bg-slate-900/80 backdrop-blur-md border-indigo-500/30",
    textColor: "text-indigo-100",
    accentColor: "bg-indigo-500",
    buttonBg: "bg-indigo-600 hover:bg-indigo-500 text-white",
    particleColor: "rgba(129, 140, 248, 0.6)",
    sceneType: "midnight",
    accentSoft: "bg-indigo-500/20",
    mutedText: "text-indigo-200/80",
    labelText: "text-indigo-300/70",
    optionIdle: "border-indigo-500/30 text-indigo-100 hover:bg-indigo-500/10",
    optionSelected: "border-indigo-400 bg-indigo-500/20 text-white font-bold shadow-sm",
    panelBg: "bg-slate-950/60 border-indigo-500/30 text-indigo-100",
  },
  citrus: {
    id: "citrus",
    Icon: Citrus,
    name: "Agrume",
    tagline: "Orange & corail, été lumineux, plage",
    bgGradient: "from-amber-50 via-orange-100 to-yellow-100",
    cardBg: "bg-white/85 backdrop-blur-md border-orange-200",
    textColor: "text-orange-950",
    accentColor: "bg-orange-500",
    buttonBg: "bg-orange-500 hover:bg-orange-600 text-white",
    particleColor: "rgba(249, 115, 22, 0.4)",
    sceneType: "citrus",
    accentSoft: "bg-orange-500/15",
    mutedText: "text-orange-900",
    labelText: "text-orange-800",
    optionIdle: "border-orange-200 text-orange-950 hover:bg-orange-50",
    optionSelected: "border-orange-500 bg-orange-100 text-orange-950 font-bold shadow-sm",
    panelBg: "bg-amber-50 border-orange-200 text-orange-950",
  },
  forest: {
    id: "forest",
    Icon: TreePine,
    name: "Forêt",
    tagline: "Vert profond, lucioles et mystère",
    bgGradient: "from-emerald-950 via-green-950 to-teal-950",
    cardBg: "bg-emerald-900/60 backdrop-blur-md border-emerald-700/40",
    textColor: "text-emerald-100",
    accentColor: "bg-emerald-500",
    buttonBg: "bg-emerald-600 hover:bg-emerald-500 text-white",
    particleColor: "rgba(52, 211, 153, 0.5)",
    sceneType: "forest",
    accentSoft: "bg-emerald-500/20",
    mutedText: "text-emerald-200/80",
    labelText: "text-emerald-300/70",
    optionIdle: "border-emerald-700/40 text-emerald-100 hover:bg-emerald-500/10",
    optionSelected: "border-emerald-400 bg-emerald-500/20 text-white font-bold shadow-sm",
    panelBg: "bg-emerald-950/60 border-emerald-700/40 text-emerald-100",
  },
  sepia: {
    id: "sepia",
    Icon: ScrollText,
    name: "Sépia",
    tagline: "Crème & brun, cinéma rétro romantique",
    bgGradient: "from-amber-100 via-stone-200 to-amber-200",
    cardBg: "bg-[#fcf8f2]/90 backdrop-blur-md border-amber-300",
    textColor: "text-stone-900",
    accentColor: "bg-amber-700",
    buttonBg: "bg-amber-800 hover:bg-amber-900 text-amber-50",
    particleColor: "rgba(180, 130, 90, 0.3)",
    sceneType: "sepia",
    accentSoft: "bg-amber-700/15",
    mutedText: "text-stone-700",
    labelText: "text-stone-600",
    optionIdle: "border-amber-300 text-stone-800 hover:bg-amber-50",
    optionSelected: "border-amber-700 bg-amber-100 text-stone-900 font-bold shadow-sm",
    panelBg: "bg-[#fcf8f2] border-amber-300 text-stone-800",
  },
  neon: {
    id: "neon",
    Icon: Zap,
    name: "Néon",
    tagline: "Violet & cyan, ville nocturne branchée",
    bgGradient: "from-purple-950 via-violet-950 to-cyan-950",
    cardBg: "bg-gray-900/80 backdrop-blur-md border-cyan-500/40",
    textColor: "text-cyan-100",
    accentColor: "bg-cyan-400",
    buttonBg: "bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-white",
    particleColor: "rgba(34, 211, 238, 0.6)",
    sceneType: "neon",
    accentSoft: "bg-cyan-400/20",
    mutedText: "text-cyan-200/80",
    labelText: "text-cyan-300/70",
    optionIdle: "border-cyan-500/40 text-cyan-100 hover:bg-cyan-500/10",
    optionSelected: "border-cyan-400 bg-cyan-500/20 text-white font-bold shadow-sm",
    panelBg: "bg-gray-950/60 border-cyan-500/40 text-cyan-100",
  },
  // Thème aux couleurs de l'éditeur, pour les invitations à usage
  // professionnel : un déjeuner d'équipe, un rendez-vous client. C'est le seul
  // thème qui reprend la charte ByTechnum ; les six autres restent le contenu
  // créatif du produit.
  bytechnum: {
    id: "bytechnum",
    Icon: Gem,
    name: "ByTechnum",
    tagline: "Bleu tech & anthracite, sobre et professionnel",
    bgGradient: "from-slate-50 via-brand-50 to-slate-100",
    cardBg: "bg-white/90 backdrop-blur-md border-brand-200",
    textColor: "text-ink-900",
    accentColor: "bg-brand-600",
    buttonBg: "bg-brand-600 hover:bg-brand-700 text-white",
    particleColor: "rgba(79, 107, 246, 0.35)",
    sceneType: "bytechnum",
    accentSoft: "bg-brand-500/15",
    mutedText: "text-ink-700",
    labelText: "text-brand-700",
    optionIdle: "border-brand-200 text-ink-800 hover:bg-brand-50",
    optionSelected: "border-brand-600 bg-brand-50 text-brand-900 font-bold shadow-sm",
    panelBg: "bg-brand-50 border-brand-200 text-ink-800",
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

export type MenuOption = { id: string; Icon: LucideIcon; label: string };

/**
 * Propositions culinaires.
 *
 * Les icônes sont des analogies, pas des représentations littérales : lucide
 * n'a ni sushi, ni pâtes, ni falafel. Le libellé porte la précision, l'icône
 * n'est là que pour la lecture rapide.
 */
export const MENU_OPTIONS_PRESETS: MenuOption[] = [
  // Bénin — le service est édité depuis Porto-Novo et s'adresse d'abord à un
  // public local ; le catalogue d'origine était exclusivement international.
  { id: "amiwo", Icon: Drumstick, label: "Amiwo & poulet braisé" },
  { id: "telibo", Icon: CookingPot, label: "Télibo & sauce arachide" },
  { id: "ablo", Icon: Fish, label: "Ablo & poisson frit" },
  { id: "atassi", Icon: Bean, label: "Atassi & sauce tomate" },

  // France
  { id: "bistrot", Icon: Wine, label: "Bistrot & planches" },
  { id: "brasserie", Icon: Beef, label: "Steak-frites de brasserie" },
  { id: "creperie", Icon: Croissant, label: "Crêperie bretonne" },
  { id: "fromages", Icon: Grape, label: "Bar à fromages & vins" },
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
