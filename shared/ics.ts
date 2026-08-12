/**
 * Génération de fichiers iCalendar (RFC 5545).
 *
 * Ce module remplace deux implémentations qui produisaient des fichiers
 * invalides : celle du serveur recevait une date et une heure sans jamais s'en
 * servir (aucun DTSTART), celle du client n'émettait même pas de VEVENT.
 *
 * Contraintes du format effectivement respectées ici :
 *  - fins de ligne CRLF ;
 *  - échappement de `\`, `;`, `,` et des retours à la ligne ;
 *  - repli des lignes à 75 octets, sans couper un caractère multi-octets ;
 *  - horodatages UTC au format `YYYYMMDDTHHMMSSZ`.
 *
 * Le module est partagé client/serveur : pas de `Buffer`, uniquement des API
 * disponibles des deux côtés.
 */

const CRLF = "\r\n";
const MAX_OCTETS = 75;

const encoder = new TextEncoder();

function octetLength(text: string): number {
  return encoder.encode(text).length;
}

/**
 * Replie une ligne à 75 octets. Le découpage se fait par point de code, ce qui
 * garantit qu'un caractère accentué ou un emoji n'est jamais coupé en deux.
 */
function foldLine(line: string): string {
  if (octetLength(line) <= MAX_OCTETS) return line;

  const parts: string[] = [];
  let current = "";
  // Les lignes de continuation commencent par une espace, qui compte dans la
  // limite : elles ne peuvent donc porter que 74 octets utiles.
  let budget = MAX_OCTETS;

  for (const char of line) {
    const size = octetLength(char);
    if (octetLength(current) + size > budget) {
      parts.push(current);
      current = char;
      budget = MAX_OCTETS - 1;
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);

  return parts.join(`${CRLF} `);
}

/** Échappe une valeur de propriété texte (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Formate une date en horodatage UTC iCalendar : `20260814T173000Z`. */
export function formatIcsDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Date invalide fournie au générateur iCalendar.");
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export type IcsEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  /** Durée en minutes ; sert à calculer DTEND quand `end` n'est pas fourni. */
  durationMinutes?: number;
  end?: Date;
};

export function buildIcsEvent(event: IcsEvent): string {
  const start = new Date(event.start);
  const end =
    event.end ?? new Date(start.getTime() + (event.durationMinutes ?? 120) * 60 * 1000);

  const properties: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dis oui//Rendez-vous//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];

  if (event.description) {
    properties.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  if (event.location) {
    properties.push(`LOCATION:${escapeText(event.location)}`);
  }

  properties.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");

  // Un fichier iCalendar se termine par un CRLF final.
  return properties.map(foldLine).join(CRLF) + CRLF;
}

/**
 * Construit l'événement du rendez-vous à partir d'une réponse de destinataire.
 * Renvoie `null` quand le créneau retenu n'a pas de date réelle — c'est le cas
 * des invitations créées avant l'introduction des créneaux datés, dont les
 * créneaux n'étaient que du texte libre (« Ce vendredi à 19h30 »).
 */
export function buildRendezVousIcs(params: {
  senderName: string;
  recipientName: string;
  startsAt: string | null;
  durationMinutes?: number;
  slotLabel: string;
  menu?: string;
  venue?: string;
  note?: string;
}): string | null {
  if (!params.startsAt) return null;

  const start = new Date(params.startsAt);
  if (Number.isNaN(start.getTime())) return null;

  const descriptionParts = [`Créneau : ${params.slotLabel}`];
  if (params.menu) descriptionParts.push(`Menu : ${params.menu}`);
  if (params.note) descriptionParts.push(`Message : « ${params.note} »`);

  return buildIcsEvent({
    uid: `${start.getTime()}-${Math.random().toString(36).slice(2, 10)}@dis-oui`,
    title: `Rendez-vous : ${params.senderName} & ${params.recipientName}`,
    description: descriptionParts.join("\n"),
    location: params.venue || "Lieu à confirmer",
    start,
    durationMinutes: params.durationMinutes ?? 120,
  });
}
