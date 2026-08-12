import { deleteExpiredInvitations, deleteOldRateLimits } from "./invitationsDb";

/**
 * Purge RGPD.
 *
 * La page d'accueil annonce que « passé ce délai, l'invitation est
 * automatiquement purgée » : aucun code ne le faisait. Ce module tient cette
 * promesse.
 *
 * Une invitation contient l'e-mail du créateur, les prénoms des deux personnes
 * et un message libre ; une réponse contient les choix du destinataire. Passée
 * la date d'expiration choisie à la création (7, 30 ou 90 jours), il n'y a plus
 * aucune raison de les conserver.
 */

/** Intervalle entre deux passages. Une heure suffit pour une purge quotidienne. */
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

export type PurgeReport = {
  invitationsSupprimees: number;
  compteursSupprimes: number;
};

export async function runPurge(): Promise<PurgeReport> {
  const invitationsSupprimees = await deleteExpiredInvitations();
  const compteursSupprimes = await deleteOldRateLimits();
  return { invitationsSupprimees, compteursSupprimes };
}

/**
 * Démarre la purge périodique et renvoie de quoi l'arrêter.
 *
 * `unref()` évite que le minuteur maintienne le process en vie : un serveur
 * qu'on arrête ne doit pas attendre la prochaine échéance.
 */
export function startPurgeSchedule(intervalMs = PURGE_INTERVAL_MS): () => void {
  const execute = async () => {
    try {
      const report = await runPurge();
      if (report.invitationsSupprimees > 0 || report.compteursSupprimes > 0) {
        console.info(
          `[Purge] ${report.invitationsSupprimees} invitation(s) expirée(s) et ` +
            `${report.compteursSupprimes} compteur(s) de rate limiting supprimés.`
        );
      }
    } catch (error) {
      // Une purge ratée ne doit pas faire tomber le serveur : le prochain
      // passage réessaiera.
      console.error("[Purge] Échec du passage de purge:", error);
    }
  };

  void execute();

  const timer = setInterval(execute, intervalMs);
  timer.unref?.();

  return () => clearInterval(timer);
}
