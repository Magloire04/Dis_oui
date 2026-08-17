import { z } from "zod";

/**
 * Numéro WhatsApp du créateur et message de notification.
 *
 * `wa.me` attend le numéro en chiffres seuls, indicatif pays compris et sans
 * le « + ». Un numéro saisi « +229 01 96 00 00 00 » doit donc devenir
 * « 2290196000000 » : c'est cette normalisation, et non le champ lui-même, qui
 * fait qu'un lien fonctionne ou ouvre une conversation dans le vide.
 */

/** Longueurs admises par la recommandation UIT-T E.164 : 8 à 15 chiffres. */
const MIN_CHIFFRES = 8;
const MAX_CHIFFRES = 15;

/** Ne garde que les chiffres. Le « + » de tête est porté par le format, pas par wa.me. */
export function normaliserNumero(saisie: string): string {
  return saisie.replace(/\D/g, "");
}

export function numeroValide(saisie: string): boolean {
  const chiffres = normaliserNumero(saisie);
  if (chiffres.length < MIN_CHIFFRES || chiffres.length > MAX_CHIFFRES) return false;
  // Un numéro national commence par 0 ; sans indicatif pays, `wa.me` ouvre une
  // conversation avec un correspondant qui n'existe pas, en silence.
  return !chiffres.startsWith("0");
}

/**
 * Schéma partagé par l'éditeur et l'API.
 *
 * Champ facultatif : une chaîne vide vaut « non renseigné » et devient `null`,
 * plutôt que d'enregistrer un numéro vide qui afficherait un bouton WhatsApp
 * inerte au destinataire.
 */
export const creatorPhoneSchema = z
  .string()
  .trim()
  .max(24)
  .refine(v => v === "" || numeroValide(v), {
    message: "Indiquez un numéro au format international, indicatif pays compris (ex. +229 01 96 00 00 00).",
  })
  .transform(v => (v === "" ? null : normaliserNumero(v)))
  .nullable()
  .optional();

export type DetailsReponse = {
  recipientName: string;
  creneau: string;
  dateLisible?: string;
  menu?: string;
  lieu?: string;
  note?: string;
  /** Adresse publique de l'invitation, celle que le créateur a envoyée. */
  lienInvitation?: string;
};

/**
 * Message pré-rempli envoyé par le destinataire au créateur.
 *
 * Il ne porte pas le lien de suivi : celui-ci contient le jeton du créateur,
 * qui donne accès à son adresse électronique et, sur une invitation à réponses
 * multiples, aux réponses des autres destinataires. Le créateur reçoit ce lien
 * par courriel, sur sa propre adresse.
 */
export function messageWhatsApp(d: DetailsReponse): string {
  const lignes = [
    `C'est oui ! ${d.recipientName} a répondu à ton invitation.`,
    "",
    `Créneau : ${d.creneau}`,
  ];
  if (d.dateLisible) lignes.push(`Date : ${d.dateLisible}`);
  if (d.menu) lignes.push(`Menu : ${d.menu}`);
  if (d.lieu) lignes.push(`Lieu : ${d.lieu}`);
  if (d.note) lignes.push(`Note : « ${d.note} »`);
  if (d.lienInvitation) lignes.push("", `Invitation : ${d.lienInvitation}`);
  return lignes.join("\n");
}

/** Lien `wa.me` prêt à ouvrir, message compris. */
export function lienWhatsApp(numero: string, message: string): string {
  return `https://wa.me/${normaliserNumero(numero)}?text=${encodeURIComponent(message)}`;
}
