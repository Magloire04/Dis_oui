import { deleteExpiredInvitations, deleteOldRateLimits } from "./invitationsDb";
import { deleteOldEvents, logEvent } from "./operationLog";

/**
 * Purge RGPD.
 *
 * La page d'accueil annonce que « passé ce délai, l'invitation est
 * automatiquement purgée » : aucun code ne le faisait. Ce module tient cette
 * promesse.
 *
 * Une invitation contient l'e-mail du créateur, les prénoms des deux personnes
 * et un message libre ; une réponse contient les choix du destinataire. Passée
 * la date d'expiration choisie à la création (1, 2, 5 ou 24 heures), il n'y a
 * plus aucune raison de les conserver.
 */

/**
 * Intervalle entre deux passages.
 *
 * Une heure convenait à des durées en jours. Depuis que le palier le plus
 * court vaut une heure, un passage horaire laissait une donnée survivre
 * jusqu'à une heure de plus — le double de la durée promise, alors que
 * l'accès, lui, est refusé à la seconde près.
 */
const PURGE_INTERVAL_MS = 15 * 60 * 1000;

export type PurgeReport = {
  invitationsSupprimees: number;
  compteursSupprimes: number;
  evenementsSupprimes: number;
};

export async function runPurge(): Promise<PurgeReport> {
  const invitationsSupprimees = await deleteExpiredInvitations();
  const compteursSupprimes = await deleteOldRateLimits();
  // Le journal d'exploitation a sa propre rétention : il n'est rattaché à
  // aucune invitation et ne partirait donc jamais par cascade.
  const evenementsSupprimes = await deleteOldEvents();

  const rapport = { invitationsSupprimees, compteursSupprimes, evenementsSupprimes };

  // Trace de chaque passage : la console doit pouvoir montrer que la purge
  // tourne, y compris quand elle n'a rien trouvé à supprimer.
  await logEvent("purge", "ok", rapport);

  return rapport;
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
      await logEvent("purge", "error", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  void execute();

  const timer = setInterval(execute, intervalMs);
  timer.unref?.();

  return () => clearInterval(timer);
}
