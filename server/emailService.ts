import { ENV } from "./_core/env";
import { logEvent } from "./operationLog";
import { envoyerCourriel, transportActif } from "./mailTransport";
import { buildRendezVousIcs } from "@shared/ics";
import type { InvitationAnswer, ThemeId } from "@shared/invitationConfig";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

/**
 * Les classes Tailwind des thèmes ne servent à rien dans un e-mail : les
 * clients de messagerie n'exécutent pas de CSS externe. On garde donc une
 * teinte d'accent en hexadécimal par thème.
 */
const THEME_ACCENTS: Record<ThemeId, string> = {
  blush: "#e11d48",
  midnight: "#6366f1",
  citrus: "#f97316",
  forest: "#10b981",
  sepia: "#92400e",
  neon: "#06b6d4",
  bytechnum: "#4f6bf6",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type CreatorNotification = {
  toEmail: string;
  recipientName: string;
  senderName: string;
  answerDetails: InvitationAnswer;
  trackingUrl: string;
  theme: ThemeId;
};

function buildHtml(options: CreatorNotification, hasCalendarFile: boolean): string {
  const accent = THEME_ACCENTS[options.theme] ?? THEME_ACCENTS.blush;
  const { answerDetails: answer } = options;
  const trackingUrl = `${ENV.publicBaseUrl}${options.trackingUrl}`;

  const rows: Array<[string, string]> = [["Créneau", answer.day]];
  if (answer.time) rows.push(["Heure", answer.time]);
  if (answer.menu) rows.push(["Menu", answer.menu]);
  if (answer.venue) rows.push(["Lieu proposé", answer.venue]);
  if (answer.customNote) rows.push(["Petit mot", `« ${answer.customNote} »`]);
  if (answer.refusCount > 0) {
    rows.push(["Tentatives de refus", `${answer.refusCount} avant de dire oui`]);
  }

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#78716c;font-size:13px;width:150px;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#1c1917;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e7e5e4;">
      <tr><td>
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${accent};font-weight:700;">
          Dis oui · Bonne nouvelle
        </p>
        <h1 style="margin:0 0 16px;font-size:24px;color:#1c1917;">
          ${escapeHtml(options.recipientName)} a dit oui !
        </h1>
        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Voici les choix de ${escapeHtml(options.recipientName)} pour votre rendez-vous.
        </p>

        <table role="presentation" style="width:100%;border-top:1px solid #e7e5e4;border-bottom:1px solid #e7e5e4;margin-bottom:24px;">
          ${rowsHtml}
        </table>

        ${
          hasCalendarFile
            ? `<p style="margin:0 0 24px;font-size:13px;color:#57534e;">
                 Le fichier <strong>rendez-vous.ics</strong> joint à cet e-mail ajoute
                 l'événement à votre agenda en un clic.
               </p>`
            : ""
        }

        <a href="${escapeHtml(trackingUrl)}"
           style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">
          Voir la page de suivi
        </a>

        <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e7e5e4;font-size:11px;color:#a8a29e;line-height:1.6;">
          Vous recevez cet e-mail parce que vous avez créé une invitation sur Dis oui.<br />
          Un produit <strong style="color:#2d2d2d;">ByTechnum</strong> — la technologie à votre portée.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  icsContent: string | null;
}): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: ENV.resendFrom,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.icsContent
          ? {
              attachments: [
                {
                  filename: "rendez-vous.ics",
                  content: Buffer.from(params.icsContent, "utf8").toString("base64"),
                },
              ],
            }
          : {}),
      }),
    });

    if (!response.ok) {
      console.error(`[Email] Resend a répondu ${response.status}: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Email] Envoi via Resend impossible:", error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Notifie le créateur de la réponse reçue, fichier calendrier en pièce jointe.
 *
 * Sans `RESEND_API_KEY`, le contenu est affiché en console : le développement
 * local ne nécessite aucun compte. La fonction ne lève jamais — la réponse du
 * destinataire est déjà enregistrée, un échec d'envoi ne doit pas la perdre.
 */
export async function sendCreatorNotification(
  options: CreatorNotification
): Promise<{ sent: boolean; hasCalendarFile: boolean }> {
  const icsContent = buildRendezVousIcs({
    senderName: options.senderName,
    recipientName: options.recipientName,
    startsAt: options.answerDetails.startsAt,
    durationMinutes: options.answerDetails.durationMin,
    slotLabel: options.answerDetails.day,
    menu: options.answerDetails.menu,
    venue: options.answerDetails.venue,
    note: options.answerDetails.customNote,
  });

  const hasCalendarFile = icsContent !== null;
  const subject = `${options.recipientName} a dit oui !`;
  const html = buildHtml(options, hasCalendarFile);
  const transport = transportActif();

  if (transport === "console") {
    console.info(
      `[Email] Aucun transport configuré — envoi simulé.\n` +
        `  Destinataire : ${options.toEmail}\n` +
        `  Objet        : ${subject}\n` +
        `  Créneau      : ${options.answerDetails.day}\n` +
        `  Fichier .ics : ${hasCalendarFile ? "joint" : "aucun (créneau sans date réelle)"}`
    );
    return { sent: false, hasCalendarFile };
  }

  const sent =
    transport === "resend"
      ? await sendViaResend({ to: options.toEmail, subject, html, icsContent })
      : await envoyerCourriel({ to: options.toEmail, subject, html, icsContent });

  // Journalisé sans l'adresse : la console doit signaler qu'un envoi a échoué,
  // pas conserver à qui il était destiné.
  await logEvent("email", sent ? "ok" : "error", {
    hasCalendarFile,
    theme: options.theme,
    transport,
  });

  return { sent, hasCalendarFile };
}
