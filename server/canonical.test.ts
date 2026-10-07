import express from "express";
import fs from "fs";
import type { AddressInfo } from "net";
import os from "os";
import path from "path";
import type { Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyCanonical, canonicalUrlForPath } from "./canonical";
import { serveStatic } from "./_core/serveStatic";

const BASE = "https://disoui.exemple";

// Reproduit la structure de client/index.html.
const TEMPLATE = `<!doctype html>
<html lang="fr">
  <head>
    <title>Dis oui — Générateur d'invitations de rendez-vous interactives</title>
    <!-- social-meta:start -->
    <meta name="description" content="Créez une invitation de rendez-vous." />
    <!-- social-meta:end -->
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("canonicalUrlForPath", () => {
  it("désigne l'adresse propre de chaque page publique", () => {
    expect(canonicalUrlForPath("/", BASE)).toBe("https://disoui.exemple/");
    expect(canonicalUrlForPath("/editor", BASE)).toBe(
      "https://disoui.exemple/editor"
    );
    expect(canonicalUrlForPath("/confidentialite", BASE)).toBe(
      "https://disoui.exemple/confidentialite"
    );
    expect(canonicalUrlForPath("/mentions-legales", BASE)).toBe(
      "https://disoui.exemple/mentions-legales"
    );
  });

  it("ignore la chaîne de requête, l'ancre et la barre finale", () => {
    // Les appelants passent req.originalUrl, qui porte la chaîne de requête.
    expect(canonicalUrlForPath("/?ref=bytechnum", BASE)).toBe(
      "https://disoui.exemple/"
    );
    expect(canonicalUrlForPath("/editor?utm_source=whatsapp#haut", BASE)).toBe(
      "https://disoui.exemple/editor"
    );
    expect(canonicalUrlForPath("/mentions-legales/", BASE)).toBe(
      "https://disoui.exemple/mentions-legales"
    );
    expect(canonicalUrlForPath("/", `${BASE}/`)).toBe(
      "https://disoui.exemple/"
    );
  });

  it("ne déclare rien pour les liens privés, la console et les routes inconnues", () => {
    for (const route of [
      "/r/abc1234",
      "/track/jeton",
      "/admin",
      "/404",
      "/n-existe-pas",
    ]) {
      expect(canonicalUrlForPath(route, BASE)).toBeNull();
    }
  });

  it("ne publie jamais une adresse de développement", () => {
    expect(canonicalUrlForPath("/", "http://localhost:3000")).toBeNull();
    expect(canonicalUrlForPath("/", "")).toBeNull();
  });
});

describe("applyCanonical", () => {
  it("insère la balise dans l'en-tête", () => {
    const html = applyCanonical(TEMPLATE, "/?ref=bytechnum", BASE);

    expect(html).toContain(
      '<link rel="canonical" href="https://disoui.exemple/" />'
    );
    expect(html.indexOf('rel="canonical"')).toBeLessThan(
      html.indexOf("</head>")
    );
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
  });

  it("laisse le HTML intact quand la route n'a pas d'adresse canonique", () => {
    expect(applyCanonical(TEMPLATE, "/r/abc1234", BASE)).toBe(TEMPLATE);
    expect(applyCanonical(TEMPLATE, "/", "http://localhost:3000")).toBe(
      TEMPLATE
    );
  });
});

describe("serveStatic", () => {
  let server: Server;
  let origin: string;
  let distPath: string;

  beforeAll(async () => {
    distPath = fs.mkdtempSync(path.join(os.tmpdir(), "dis-oui-dist-"));
    fs.writeFileSync(path.join(distPath, "index.html"), TEMPLATE);
    fs.writeFileSync(path.join(distPath, "favicon.svg"), "<svg />");

    const app = express();
    serveStatic(app, { distPath, publicBaseUrl: BASE });
    server = app.listen(0);
    await new Promise(resolve => server.once("listening", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(distPath, { recursive: true, force: true });
  });

  it("sert l'accueil avec son adresse canonique, même atteint avec un paramètre de suivi", async () => {
    for (const url of ["/", "/?ref=bytechnum"]) {
      const html = await (await fetch(origin + url)).text();
      expect(html).toContain(
        '<link rel="canonical" href="https://disoui.exemple/" />'
      );
    }
  });

  it("donne à chaque page publique sa propre adresse canonique", async () => {
    const html = await (await fetch(`${origin}/mentions-legales`)).text();
    expect(html).toContain(
      '<link rel="canonical" href="https://disoui.exemple/mentions-legales" />'
    );
  });

  it("ne déclare aucune adresse canonique sur un lien privé", async () => {
    const html = await (await fetch(`${origin}/r/abc1234`)).text();
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain('content="noindex, nofollow"');
  });

  it("sert toujours les fichiers statiques", async () => {
    const response = await fetch(`${origin}/favicon.svg`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<svg />");
  });
});
