import { z } from "zod";

/**
 * Forme de l'objet `config` d'une invitation, partagée par l'éditeur et l'API.
 *
 * Cette colonne est un `json` libre en base et alimentée par un formulaire
 * public sans authentification : sans schéma, n'importe qui peut y écrire
 * n'importe quoi, jusqu'à la limite de 50 Mo du body parser. Les bornes
 * ci-dessous sont donc autant une contrainte produit qu'une limite d'abus.
 */

export const THEME_IDS = ["blush", "midnight", "citrus", "forest", "sepia", "neon"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const RELATIONS = ["crush", "partenaire", "amie", "complique"] as const;
export type Relation = (typeof RELATIONS)[number];

export const TONES = ["doux", "drôle", "audacieux", "romantique"] as const;
export type Tone = (typeof TONES)[number];

export const NO_BUTTON_BEHAVIORS = ["fuyant", "retrecissant", "les_deux", "desactive"] as const;
export type NoButtonBehavior = (typeof NO_BUTTON_BEHAVIORS)[number];

export const MOTION_INTENSITIES = ["subtile", "normal", "intense"] as const;
export type MotionIntensity = (typeof MOTION_INTENSITIES)[number];

export const MAX_DATE_SLOTS = 5;
export const MAX_MENU_OPTIONS = 9;
export const MAX_TEASES = 12;

/** Durées de vie proposées par l'éditeur, en jours. */
export const LINK_DURATIONS = [7, 30, 90] as const;

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const invitationConfigSchema = z.object({
  recipientName: shortText(40),
  senderName: shortText(40),
  relation: z.enum(RELATIONS),
  tone: z.enum(TONES),

  question: shortText(80),
  subtitle: z.string().trim().max(120).default(""),
  emoji: z.string().min(1).max(8),
  noButtonBehavior: z.enum(NO_BUTTON_BEHAVIORS),
  maxRefusals: z.number().int().min(1).max(50),
  teases: z.array(shortText(120)).min(1).max(MAX_TEASES),

  selectedDates: z.array(shortText(60)).min(1).max(MAX_DATE_SLOTS),
  customTimeNote: z.string().trim().max(80).default(""),

  selectedMenuOptions: z.array(shortText(32)).min(1).max(MAX_MENU_OPTIONS),
  includeSurprise: z.boolean(),
  includeVenue: z.boolean(),

  themeKey: z.enum(THEME_IDS),
  enableAnimation: z.boolean(),
  motionIntensity: z.enum(MOTION_INTENSITIES),
  finalMessage: z.string().trim().max(280).default(""),
});

export type InvitationConfig = z.infer<typeof invitationConfigSchema>;

/**
 * Réponse du destinataire. `refusCount` est purement décoratif (il alimente
 * l'écran « Nice try ») mais reste borné : il vient du client.
 */
export const invitationAnswerSchema = z.object({
  day: shortText(60),
  time: z.string().trim().max(30).default(""),
  menu: z.string().trim().max(60).default(""),
  venue: z.string().trim().max(80).default(""),
  customNote: z.string().trim().max(280).default(""),
  refusCount: z.number().int().min(0).max(999).default(0),
});

export type InvitationAnswer = z.infer<typeof invitationAnswerSchema>;

/**
 * Champs rédigés librement par l'utilisateur, seuls concernés par la
 * modération. Filtrer `JSON.stringify(config)` ferait porter le contrôle sur
 * les clés techniques et les identifiants de thème.
 */
export function userAuthoredText(config: InvitationConfig): string[] {
  return [
    config.recipientName,
    config.senderName,
    config.question,
    config.subtitle,
    config.customTimeNote,
    config.finalMessage,
    ...config.teases,
    ...config.selectedDates,
  ];
}
