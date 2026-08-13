import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { applySocialMeta } from "../socialMeta";

/**
 * Service des fichiers compilés, en production.
 *
 * Volontairement séparé de `vite.ts` : ce dernier importe Vite et ses plugins,
 * et un import statique aurait suffi à les faire entrer dans le bundle de
 * production, donc à exiger leur installation sur le serveur — une centaine de
 * mégaoctets d'outillage de compilation pour du code jamais exécuté.
 */
export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Dossier de build introuvable : ${distPath}. Lancez « pnpm build » au préalable.`
    );
  }

  app.use(express.static(distPath));

  // Repli sur index.html : l'application est une SPA, toute route inconnue du
  // serveur est une route du client.
  const indexPath = path.resolve(distPath, "index.html");
  app.use("*", async (req, res, next) => {
    try {
      const html = await fs.promises.readFile(indexPath, "utf-8");
      res
        .status(200)
        .set({ "Content-Type": "text/html" })
        .end(applySocialMeta(html, req.originalUrl));
    } catch (error) {
      next(error);
    }
  });
}
