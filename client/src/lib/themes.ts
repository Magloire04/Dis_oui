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

/**
 * Formulations proposées pour chaque ton.
 *
 * Vingt-cinq par ton plutôt qu'une seule : deux créateurs qui choisissaient
 * le même ton obtenaient mot pour mot la même phrase, et revenir sur
 * l'éditeur retrouvait celle de la veille. L'effet de personnalisation
 * s'effondrait.
 *
 * Chaque formulation tient sous 80 caractères, la limite du schéma partagé —
 * une phrase plus longue serait proposée puis refusée à la validation.
 */
export const TONE_PRESETS: Record<Tone, { questions: string[]; teases: string[] }> = {
  doux: {
    questions: [
      "Tu veux passer un moment doux avec moi ?",
      "On se réserve une soirée rien qu'à nous ?",
      "Ça te dirait, un moment tranquille tous les deux ?",
      "Tu me laisserais t'emmener quelque part ?",
      "On prend le temps de se voir, cette semaine ?",
      "Tu accepterais un rendez-vous tout simple ?",
      "Et si on se posait quelque part, juste nous deux ?",
      "Tu aurais une soirée à me prêter ?",
      "On se voit bientôt, pour de vrai ?",
      "Ça te tente, un moment doux loin du bruit ?",
      "Tu me dirais oui pour une soirée ensemble ?",
      "On s'accorde un moment rien que pour nous ?",
      "Tu voudrais qu'on se retrouve autour d'un verre ?",
      "Je peux t'inviter quelque part de calme ?",
      "On se garde une soirée, toi et moi ?",
      "Tu serais partante pour un moment tranquille ?",
      "Et si on se voyait, sans rien prévoir de compliqué ?",
      "Tu me ferais le plaisir d'une soirée ensemble ?",
      "On trouve un créneau rien que pour nous ?",
      "Ça te ferait plaisir qu'on se voie bientôt ?",
      "Tu aurais envie d'un moment tous les deux ?",
      "On se retrouve quelque part, cette semaine ?",
      "Je t'emmène quelque part, si tu veux bien ?",
      "Tu accepterais de passer un moment avec moi ?",
      "Et si on se réservait une belle soirée ?",
    ],
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
    questions: [
      "Tu veux sortir avec moi, ou finir la soirée avec ton chat ?",
      "Un rendez-vous avec moi : meilleure idée de ta semaine ?",
      "Je prends ton silence pour un oui. On se voit quand ?",
      "Alerte : quelqu'un veut t'inviter. Tu acceptes le risque ?",
      "Sortir avec moi, ou refaire ton fil pour la douzième fois ?",
      "J'ai un créneau libre et zéro fierté. Tu dis oui ?",
      "Tu préfères mes blagues en vrai ou par écrit ?",
      "On teste si je suis aussi drôle en personne ?",
      "Ce message a coûté trois heures de courage. Tu dis oui ?",
      "Un rendez-vous, sans piège. Enfin, presque sans piège.",
      "Mon agenda est vide et c'est un peu gênant. On se voit ?",
      "Tu veux voir si je mange proprement ? Rendez-vous ?",
      "J'ai répété cette phrase douze fois. Ça se voit ?",
      "Sortir avec moi : programme court, effets garantis.",
      "Deux options : oui, ou oui plus tard. Tu choisis ?",
      "Je promets de ne pas parler de moi. Enfin, j'essaierai.",
      "Il paraît que je suis mieux en vrai. Tu vérifies ?",
      "Ce serait bête de rater ça. On se voit quand ?",
      "Un rendez-vous. Sans engagement. Sans PowerPoint.",
      "Je t'invite. Tu apportes juste ta bonne humeur.",
      "Le bouton Non est en panne, désolé. On se voit ?",
      "J'ai déjà choisi le restaurant. Il manque juste toi.",
      "Ma seule qualité : je choisis bien les restaurants.",
      "Tu viens ? Je promets zéro anecdote sur mon travail.",
      "Sortie proposée, motivation maximale, dignité minimale.",
    ],
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
    questions: [
      "Prête pour le meilleur rendez-vous de ta vie ?",
      "On arrête de tourner autour du pot ? Un verre, bientôt.",
      "Je t'invite. Tu as le droit de dire oui tout de suite.",
      "Assez discuté : on se voit quand ?",
      "Je sais déjà que ce sera bien. Tu me suis ?",
      "Un rendez-vous avec moi, ça se refuse difficilement.",
      "Je propose, tu acceptes. C'est plus simple comme ça.",
      "On se voit, et on verra bien où ça nous mène.",
      "J'ai décidé qu'on sortait ensemble. Ton avis m'intéresse.",
      "Le meilleur moment de ta semaine, c'est moi. On se voit ?",
      "Une soirée avec moi, ça te tente vraiment ?",
      "Je te propose mieux que ta soirée prévue. On y va ?",
      "Tu as mieux à faire ? J'en doute. Rendez-vous ?",
      "Un verre, un vrai. Et on voit ce qui se passe.",
      "Je ne demande pas la lune, juste une soirée.",
      "Tu vas dire oui. La seule question, c'est quand.",
      "Ce rendez-vous, on le prend maintenant ou ce week-end ?",
      "Je te promets une soirée dont tu te souviendras.",
      "Allez, un peu d'audace : on se voit cette semaine.",
      "Je viens chercher ton oui. Tu me le donnes ?",
      "Rendez-vous. Pas de détour, pas de peut-être.",
      "Une soirée, deux personnes, aucune raison de refuser.",
      "J'ai de l'ambition pour cette soirée. Et toi ?",
      "On se voit, et je te fais changer d'avis sur tout.",
      "Le seul risque, c'est de passer une excellente soirée.",
    ],
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
    questions: [
      "Veux-tu m'accorder un rendez-vous inoubliable ?",
      "M'accorderais-tu une soirée, rien qu'une ?",
      "Me ferais-tu l'honneur de dîner avec moi ?",
      "Accepterais-tu de passer une soirée à mes côtés ?",
      "Puis-je t'inviter à un moment hors du temps ?",
      "Me laisserais-tu te faire passer une belle soirée ?",
      "Une soirée avec toi vaudrait tous les détours.",
      "Veux-tu être la plus belle raison de ma semaine ?",
      "Puis-je espérer une soirée en ta compagnie ?",
      "M'offrirais-tu quelques heures de ta présence ?",
      "Je ne demande qu'une soirée. Me l'accorderais-tu ?",
      "Voudrais-tu écrire un beau souvenir avec moi ?",
      "Accepterais-tu de me retrouver quelque part ?",
      "Ta présence me manque. Puis-je t'inviter ?",
      "Une soirée à deux, loin de tout. Tu veux bien ?",
      "Me ferais-tu la joie d'un rendez-vous ?",
      "Puis-je t'emmener quelque part, rien que nous ?",
      "Veux-tu m'accorder la plus belle de tes soirées ?",
      "J'aimerais te voir. Vraiment. Tu accepterais ?",
      "Un dîner avec toi, ce serait déjà beaucoup.",
      "Voudrais-tu partager une soirée avec moi ?",
      "Je t'attends quelque part. Viendras-tu ?",
      "Accorde-moi une soirée, je m'occupe du reste.",
      "Puis-je faire de cette semaine la plus belle ?",
      "Ta compagnie, un soir : c'est tout ce que je demande.",
    ],
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
