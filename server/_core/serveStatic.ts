import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { applyCanonical } from "../canonical";
import { applySocialMeta } from "../socialMeta";
import { ENV } from "./env";

/**
 * Service des fichiers compilés, en production.
 *
 * Volontairement séparé de `vite.ts` : ce dernier importe Vite et ses plugins,
 * et un import statique aurait suffi à les faire entrer dans le bundle de
 * production, donc à exiger leur installation sur le serveur — une centaine de
 * mégaoctets d'outillage de compilation pour du code jamais exécuté.
 */
type ServeStaticOptions = {
  /** Dossier des fichiers compilés. Par défaut, celui du build. */
  distPath?: string;
  /** Adresse publique du site. Par défaut, PUBLIC_BASE_URL. */
  publicBaseUrl?: string;
};

export function serveStatic(app: Express, options: ServeStaticOptions = {}) {
  const distPath =
    options.distPath ??
    (process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public"));
  const publicBaseUrl = options.publicBaseUrl ?? ENV.publicBaseUrl;

  if (!fs.existsSync(distPath)) {
    console.error(
      `Dossier de build introuvable : ${distPath}. Lancez « pnpm build » au préalable.`
    );
  }

  // `index: false` : l'accueil passe lui aussi par le repli ci-dessous, sans
  // quoi il serait servi tel quel, sans son adresse canonique.
  app.use(express.static(distPath, { index: false }));

  // Repli sur index.html : l'application est une SPA, toute route inconnue du
  // serveur est une route du client.
  const indexPath = path.resolve(distPath, "index.html");
  app.use("*", async (req, res, next) => {
    try {
      const html = await fs.promises.readFile(indexPath, "utf-8");
      const page = applyCanonical(
        applySocialMeta(html, req.originalUrl),
        req.originalUrl,
        publicBaseUrl
      );
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (error) {
      next(error);
    }
  });
}
