#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { builtinModules } from "node:module";

/**
 * Génère le package.json de production à partir des imports réels du bundle.
 *
 * `esbuild --packages=external` laisse toutes les dépendances hors du bundle :
 * elles doivent exister dans node_modules à l'exécution. Mais le package.json
 * du dépôt liste aussi tout le nécessaire du client — React, Recharts, Radix —
 * qui n'a rien à faire sur le serveur, et dont une dépendance de
 * développement provoque en prime un conflit de résolution avec npm.
 *
 * On lit donc les spécificateurs que le bundle importe vraiment, et on n'en
 * déclare pas d'autres.
 */

// Seul le point d'entrée est analysé : le découpage de code place le chemin de
// développement (Vite et ses plugins) dans un fragment séparé, jamais chargé en
// production, dont les dépendances n'ont donc pas à être installées.
const bundle = readFileSync("dist/index.js", "utf8");
const source = JSON.parse(readFileSync("package.json", "utf8"));

/**
 * Dépendances de pair, invisibles dans nos imports.
 *
 * `server/db.ts` importe `drizzle-orm/mysql2` ; c'est cet adaptateur qui
 * charge `mysql2`, jamais notre code. Sans déclaration explicite, le serveur
 * démarrerait puis échouerait à la première requête.
 */
const PAIRS_REQUISES = ["mysql2"];

const natifs = new Set([...builtinModules, ...builtinModules.map(m => `node:${m}`)]);

const specificateurs = new Set();
const motifs = [
  /\bfrom\s*"([^"]+)"/g,
  /\brequire\(\s*"([^"]+)"\s*\)/g,
  /\bimport\(\s*"([^"]+)"\s*\)/g,
  // Import d'effet de bord : `import "dotenv/config"`. Sans ce motif, dotenv
  // et mysql2 manquaient à l'appel et l'application tombait au démarrage.
  /\bimport\s*"([^"]+)"/g,
];
for (const motif of motifs) {
  for (const [, valeur] of bundle.matchAll(motif)) {
    // On ignore les chemins relatifs et les modules natifs de Node.
    if (valeur.startsWith(".") || valeur.startsWith("/") || natifs.has(valeur)) continue;
    // `@scope/nom/sous-chemin` se ramène au paquet `@scope/nom`.
    const parts = valeur.split("/");
    specificateurs.add(valeur.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]);
  }
}

for (const pair of PAIRS_REQUISES) specificateurs.add(pair);

const dependencies = {};
const manquants = [];
for (const nom of [...specificateurs].sort()) {
  const version = source.dependencies?.[nom] ?? source.devDependencies?.[nom];
  if (version) dependencies[nom] = version;
  else manquants.push(nom);
}

if (manquants.length > 0) {
  console.error("Dépendances importées mais absentes du package.json :", manquants.join(", "));
  process.exit(1);
}

writeFileSync(
  "dist/package.json",
  JSON.stringify(
    {
      name: `${source.name}-production`,
      version: source.version,
      private: true,
      type: "module",
      scripts: { start: "node index.js" },
      dependencies,
    },
    null,
    2
  ) + "\n"
);

console.log(`dist/package.json : ${Object.keys(dependencies).length} dépendances d'exécution`);
for (const [nom, v] of Object.entries(dependencies)) console.log(`  ${nom.padEnd(24)} ${v}`);
