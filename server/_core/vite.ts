import { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { applySocialMeta } from "../socialMeta";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // vite.config.ts exporte désormais une fonction de `mode`, pour n'activer
  // l'outillage Manus qu'en développement : il faut la résoudre avant de
  // fusionner la configuration.
  const resolvedConfig = viteConfig({ command: "serve", mode: "development" });

  const vite = await createViteServer({
    ...resolvedConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      // Après transformIndexHtml, pour que les métadonnées injectées ne soient
      // pas réécrites par Vite.
      const withMeta = applySocialMeta(page, req.originalUrl);
      res.status(200).set({ "Content-Type": "text/html" }).end(withMeta);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// `serveStatic` vit désormais dans ./serveStatic.ts : le garder ici aurait
// suffi à tirer Vite dans le bundle de production.
