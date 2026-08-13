#!/usr/bin/env node
import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

/**
 * Applique les migrations en production.
 *
 * `drizzle-kit` est une dépendance de développement : l'embarquer sur le
 * serveur tirerait tout l'outillage de compilation. Le migrateur de
 * `drizzle-orm`, lui, fait partie des dépendances d'exécution et suffit.
 *
 * La connexion est unique et non poolée : la migration 0003 s'appuie sur
 * PREPARE/EXECUTE, liés à une session MySQL. Un pool répartirait ces
 * instructions sur des connexions différentes et la contrainte échouerait
 * sans que rien ne le signale.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL est absent. Renseignez-le dans .env.");
  process.exit(1);
}

const connexion = await mysql.createConnection(url);

try {
  const [avant] = await connexion.query("select version() as v, @@default_storage_engine as e");
  console.log(`Serveur : ${avant[0].v} · moteur par défaut : ${avant[0].e}`);

  await migrate(drizzle(connexion), { migrationsFolder: "./drizzle" });
  console.log("Migrations appliquées.");

  const [tables] = await connexion.query(
    "select TABLE_NAME as nom, ENGINE as moteur from information_schema.TABLES where TABLE_SCHEMA = database() order by TABLE_NAME"
  );
  for (const t of tables) console.log(`  ${t.nom.padEnd(24)} ${t.moteur}`);

  const [fks] = await connexion.query(
    "select CONSTRAINT_NAME as nom, DELETE_RULE as suppression from information_schema.REFERENTIAL_CONSTRAINTS where CONSTRAINT_SCHEMA = database()"
  );
  if (fks.length === 0) {
    // La purge RGPD repose sur la cascade : sans elle, des réponses
    // resteraient en base après la suppression de leur invitation.
    console.error("ATTENTION : aucune clé étrangère. La purge laisserait des réponses orphelines.");
    process.exitCode = 1;
  } else {
    for (const f of fks) console.log(`  clé étrangère ${f.nom} → ON DELETE ${f.suppression}`);
  }
} finally {
  await connexion.end();
}
