import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { runPurge } from "./purge";

/**
 * Déclencheur de purge appelable par une tâche planifiée.
 *
 * Sur un hébergement mutualisé, Passenger arrête l'application dès qu'elle
 * cesse de recevoir des requêtes : le `setInterval` de la purge ne tourne donc
 * que tant que quelqu'un visite le site. Or la promesse faite à l'utilisateur —
 * ses données disparaissent à l'échéance — ne peut pas dépendre du trafic.
 *
 * Un cron horaire appelle cette route, ce qui réveille l'application et
 * exécute la purge. Elle est protégée par un jeton distinct du mot de passe
 * d'administration : il transite dans une commande cron, donc dans un fichier
 * lisible sur le serveur.
 */

function jetonValide(fourni: string | undefined): boolean {
  if (!ENV.cronToken || !fourni) return false;

  // Comparaison à temps constant sur des condensés de longueur fixe.
  const a = crypto.createHash("sha256").update(fourni).digest();
  const b = crypto.createHash("sha256").update(ENV.cronToken).digest();
  return crypto.timingSafeEqual(a, b);
}

export function registerCronRoutes(app: Express): void {
  app.post("/api/cron/purge", async (req: Request, res: Response) => {
    const fourni =
      (req.headers["x-cron-token"] as string | undefined) ??
      (typeof req.query.token === "string" ? req.query.token : undefined);

    if (!jetonValide(fourni)) {
      // Volontairement muet sur la raison : jeton absent, mauvais, ou purge non
      // configurée se répondent à l'identique.
      res.status(404).json({ error: "Introuvable." });
      return;
    }

    try {
      const rapport = await runPurge();
      res.json({ ok: true, ...rapport });
    } catch (error) {
      console.error("[Cron] Purge en échec:", error);
      res.status(500).json({ ok: false });
    }
  });
}
