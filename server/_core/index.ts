import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { startPurgeSchedule } from "../purge";
import { registerCronRoutes } from "../cronRoutes";
import { serveStatic } from "./serveStatic";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerCronRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  if (process.env.NODE_ENV === "development") {
    // Import dynamique : Vite et ses plugins ne doivent pas entrer dans le
    // bundle de production, où ils n'ont aucune utilité.
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Purge RGPD des invitations expirées : la durée de vie annoncée à la
  // création doit être tenue sans intervention manuelle.
  startPurgeSchedule();

  /**
   * Sous Passenger — l'hébergement mutualisé cPanel — le serveur d'application
   * impose l'adresse d'écoute et attend le processus exactement dessus. La
   * recherche de port libre ci-dessous ferait écouter ailleurs, et Passenger
   * ne trouverait jamais l'application : elle ne sert que le développement
   * local, où le port 3000 peut être déjà pris.
   */
  const sousPassenger = Boolean(process.env.PASSENGER_BASE_URI || process.env.IN_PASSENGER);
  const portDemande = Number(process.env.PORT) || 3000;

  // Sous Passenger, l'adresse d'écoute est imposée : écouter ailleurs rendrait
  // l'application introuvable. En développement en revanche, le port demandé
  // peut être occupé par un autre projet — on en cherche alors un libre plutôt
  // que d'échouer. Se fier à la seule présence de PORT ne suffisait pas : le
  // fichier .env local le définit, ce qui désactivait la recherche.
  const port = sousPassenger ? portDemande : await findAvailablePort(portDemande);

  if (port !== portDemande) {
    console.log(`Le port ${portDemande} est occupé, utilisation du port ${port}.`);
  }

  server.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
