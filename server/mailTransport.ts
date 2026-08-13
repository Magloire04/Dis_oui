import nodemailer, { type Transporter } from "nodemailer";
import { ENV } from "./_core/env";

/**
 * Choix du canal d'envoi.
 *
 * Trois transports possibles, retenus dans cet ordre selon ce qui est
 * configuré. L'application n'a pas à savoir lequel sert : elle appelle
 * `envoyerCourriel` et reçoit un succès ou un échec.
 *
 *  - `smtp`     : serveur SMTP authentifié (SMTP_HOST renseigné)
 *  - `sendmail` : binaire local, cas de l'hébergement mutualisé cPanel, où
 *                 aucune boîte n'est nécessaire et où le SPF du domaine
 *                 autorise déjà le serveur
 *  - `resend`   : API HTTP, si une clé est fournie
 *  - aucun      : affichage en console, pour le développement local
 */
export type Transport = "smtp" | "sendmail" | "resend" | "console";

export type Courriel = {
  to: string;
  subject: string;
  html: string;
  /** Fichier calendrier, joint tel quel quand il existe. */
  icsContent: string | null;
};

export function transportActif(): Transport {
  if (ENV.smtpHost) return "smtp";
  if (ENV.mailTransport === "sendmail") return "sendmail";
  if (ENV.resendApiKey) return "resend";
  return "console";
}

let transporteur: Transporter | null = null;

/**
 * Le transporteur est construit une seule fois : nodemailer maintient un pool
 * de connexions, en recréer un à chaque envoi rouvrirait une session TLS.
 */
function obtenirTransporteur(): Transporter {
  if (transporteur) return transporteur;

  if (ENV.smtpHost) {
    transporteur = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      // 465 est du TLS implicite ; 587 négocie STARTTLS après connexion.
      secure: ENV.smtpPort === 465,
      auth: ENV.smtpUser ? { user: ENV.smtpUser, pass: ENV.smtpPassword } : undefined,
    });
  } else {
    transporteur = nodemailer.createTransport({
      sendmail: true,
      newline: "unix",
      path: ENV.sendmailPath,
    });
  }

  return transporteur;
}

/**
 * Envoie un courriel. Ne lève jamais : la réponse du destinataire est déjà
 * enregistrée quand cette fonction est appelée, et un échec d'envoi ne doit
 * pas la faire disparaître.
 */
export async function envoyerCourriel(courriel: Courriel): Promise<boolean> {
  try {
    const info = await obtenirTransporteur().sendMail({
      from: ENV.mailFrom,
      to: courriel.to,
      subject: courriel.subject,
      html: courriel.html,
      ...(courriel.icsContent
        ? {
            attachments: [
              {
                filename: "rendez-vous.ics",
                content: courriel.icsContent,
                contentType: "text/calendar; charset=utf-8; method=PUBLISH",
              },
            ],
          }
        : {}),
    });

    // `rejected` liste les destinataires refusés par le serveur : un envoi
    // « réussi » qui n'a atteint personne reste un échec.
    if (info.rejected && info.rejected.length > 0) {
      console.error("[Email] Destinataire refusé par le serveur:", info.rejected);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Email] Envoi impossible:", error);
    return false;
  }
}

/** Diagnostic affiché par la console d'administration. */
export async function verifierTransport(): Promise<{ transport: Transport; ok: boolean }> {
  const transport = transportActif();
  if (transport === "console") return { transport, ok: false };
  if (transport === "resend") return { transport, ok: true };

  try {
    await obtenirTransporteur().verify();
    return { transport, ok: true };
  } catch (error) {
    console.error("[Email] Transport indisponible:", error);
    return { transport, ok: false };
  }
}

/** Remise à zéro du transporteur mémorisé, pour les tests. */
export function reinitialiserTransport(): void {
  transporteur = null;
}
