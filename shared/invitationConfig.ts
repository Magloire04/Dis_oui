import { z } from "zod";

/**
 * Forme de l'objet `config` d'une invitation, partagée par l'éditeur et l'API.
 *
 * Cette colonne est un `json` libre en base et alimentée par un formulaire
 * public sans authentification : sans schéma, n'importe qui peut y écrire
 * n'importe quoi, jusqu'à la limite de 50 Mo du body parser. Les bornes
 * ci-dessous sont donc autant une contrainte produit qu'une limite d'abus.
 */

export const THEME_IDS = [
  "blush",
  "midnight",
  "citrus",
  "forest",
  "sepia",
  "neon",
  "bytechnum",
] as const;
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
// Huit propositions au catalogue, plus la marge pour les plats saisis
// librement par le créateur.
export const MAX_MENU_OPTIONS = 12;

/** Longueur d'un plat saisi librement — un identifiant de catalogue est bien plus court. */
export const MAX_MENU_LABEL = 60;
export const MAX_TEASES = 12;

/** Durées de vie proposées par l'éditeur, en jours. */
export const LINK_DURATIONS = [7, 30, 90] as const;

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const DEFAULT_SLOT_DURATION_MIN = 120;

/**
 * Un créneau proposé par le créateur.
 *
 * `label` porte la formulation libre affichée au destinataire (« Ce vendredi à
 * 19h30 »), `startsAt` la date réelle. Le format d'origine ne stockait que le
 * texte, ce qui rendait tout fichier calendrier impossible à générer : un
 * `.ics` exige un DTSTART.
 */
export const dateSlotSchema = z.object({
  id: z.string().min(1).max(24),
  label: shortText(60),
  startsAt: z.iso.datetime(),
  durationMin: z.number().int().min(15).max(720).default(DEFAULT_SLOT_DURATION_MIN),
});

export type DateSlot = z.infer<typeof dateSlotSchema>;

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

  selectedDates: z.array(dateSlotSchema).min(1).max(MAX_DATE_SLOTS),
  // `customTimeNote` a été retiré : il n'était affiché nulle part, et le
  // libellé porté par chaque créneau remplit désormais ce rôle. Les anciennes
  // configurations le conservent en base, Zod l'ignore simplement.

  // Une entrée est soit un identifiant du catalogue, soit le libellé d'un plat
  // saisi librement : le champ n'est donc pas une énumération. La limite passe
  // de 32 à 60 caractères pour accueillir un intitulé rédigé.
  selectedMenuOptions: z.array(shortText(MAX_MENU_LABEL)).min(1).max(MAX_MENU_OPTIONS),
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
  // Date réelle du créneau retenu, recopiée depuis le créneau choisi. Nulle
  // pour les invitations créées avant les créneaux datés : aucun fichier
  // calendrier n'est alors générable.
  startsAt: z.iso.datetime().nullable().default(null),
  durationMin: z.number().int().min(15).max(720).default(DEFAULT_SLOT_DURATION_MIN),
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
    config.finalMessage,
    ...config.teases,
    // Seul le libellé d'un créneau est rédigé : ni son identifiant ni sa date.
    ...config.selectedDates.map(slot => slot.label),
  ];
}

/**
 * Lit `selectedDates` en tolérant l'ancien format.
 *
 * Les invitations créées avant les créneaux datés stockent un simple
 * `string[]`. Elles restent lisibles — le libellé s'affiche normalement — mais
 * sans date exploitable, donc sans fichier calendrier.
 */
export function normalizeDateSlots(value: unknown): DateSlot[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry, i): DateSlot[] => {
    if (typeof entry === "string") {
      return [{ id: `legacy-${i}`, label: entry, startsAt: "", durationMin: DEFAULT_SLOT_DURATION_MIN }];
    }
    const parsed = dateSlotSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Un créneau hérité de l'ancien format n'a pas de date exploitable. */
export function slotStartsAt(slot: DateSlot): string | null {
  return slot.startsAt || null;
}
