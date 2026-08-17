import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

/**
 * Instruction jouée sur chaque connexion neuve du pool.
 *
 * Drizzle sérialise les `Date` en chiffres UTC. MySQL les interprétait dans
 * son propre fuseau — UTC+1 à Porto-Novo — et stockait donc une heure de
 * moins que demandé. La relecture appliquait le décalage inverse, si bien que
 * les allers-retours en JavaScript paraissaient justes : c'est ce qui a rendu
 * le défaut invisible. Mais tout calcul fait côté SQL était faux d'une heure,
 * dont la ventilation des durées de la console et les fenêtres « 24 h » et
 * « 7 jours » de l'activité.
 *
 * Sans conséquence tant que les durées se comptaient en jours. Sur un lien
 * d'une heure, c'est la totalité de la durée.
 */
const FUSEAU_UTC = "SET time_zone = '+00:00'";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
      // Une requête émise ici est mise en file avant toute autre sur cette
      // connexion : mysql2 sérialise les commandes par connexion.
      pool.on("connection", connection => {
        connection.query(FUSEAU_UTC);
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (e) {
    return undefined;
  }
}
