import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { beforeEach } from "vitest";

/**
 * Setup Vitest : bascule toute la suite sur une base dédiée, jamais sur la base
 * de développement — les tests tronquent les tables entre chaque cas.
 *
 * La base cible est dérivée de DATABASE_URL en suffixant `_test`, sauf si
 * TEST_DATABASE_URL est fourni explicitement.
 */
function resolveTestDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;

  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      "Ni TEST_DATABASE_URL ni DATABASE_URL ne sont définis. Copier .env.example vers .env."
    );
  }

  const url = new URL(base);
  const name = url.pathname.replace(/^\//, "");
  if (!name) {
    throw new Error(`DATABASE_URL ne contient pas de nom de base : ${base}`);
  }
  if (name.endsWith("_test")) return base;

  url.pathname = `/${name}_test`;
  return url.toString();
}

const testDatabaseUrl = resolveTestDatabaseUrl();

// Doit être posé avant que server/db.ts ne lise process.env à son premier appel.
process.env.DATABASE_URL = testDatabaseUrl;
process.env.IP_HASH_SALT ||= "test-salt";

// Les tables sont vidées dans l'ordre inverse des dépendances : `responses`
// référence `invitations` avec une clé étrangère.
const TABLES_TO_CLEAR = ["responses", "invitations", "rateLimits", "operationEvents"] as const;

// Connexion unique et non poolée : la migration 0003 s'appuie sur
// PREPARE/EXECUTE, qui sont liés à une session MySQL. Un pool répartirait ces
// instructions sur des connexions différentes et la contrainte échouerait.
const connection = await mysql.createConnection(testDatabaseUrl);
const db = drizzle(connection);

await migrate(db, { migrationsFolder: "./drizzle" });

beforeEach(async () => {
  for (const table of TABLES_TO_CLEAR) {
    await connection.query(`DELETE FROM \`${table}\``);
  }
});
