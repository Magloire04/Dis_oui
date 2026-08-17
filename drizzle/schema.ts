import { int, index, mysqlTable, text, timestamp, varchar, boolean, json, mysqlEnum } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 12 }).notNull().unique(),
  creatorEmail: text("creatorEmail").notNull(),
  // Facultatif : le renseigner vaut consentement à ce que le destinataire le
  // voie, puisque `wa.me` l'affiche dès l'ouverture de la conversation.
  creatorPhone: varchar("creatorPhone", { length: 24 }),
  creatorToken: varchar("creatorToken", { length: 64 }).notNull().unique(),
  config: json("config").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  allowMultiple: boolean("allowMultiple").default(false).notNull(),
  openedAt: timestamp("openedAt"),
  ipHash: varchar("ipHash", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

// La cascade est ce qui rend la purge RGPD possible en une seule requête :
// supprimer une invitation expirée emporte ses réponses.
export const responses = mysqlTable("responses", {
  id: int("id").autoincrement().primaryKey(),
  invitationId: int("invitationId")
    .notNull()
    .references(() => invitations.id, { onDelete: "cascade" }),
  answer: json("answer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ResponseRecord = typeof responses.$inferSelect;
export type InsertResponseRecord = typeof responses.$inferInsert;

/**
 * Journal d'exploitation, lu par la console d'administration.
 *
 * N'y sont consignés que les événements rares qui doivent survivre à un
 * redémarrage : échec d'envoi, passage de purge, rejet de modération, blocage
 * de débit. Les mesures de performance, elles, restent en mémoire (voir
 * server/metrics.ts) : les inscrire ici transformerait chaque lecture en
 * écriture.
 *
 * `detail` ne doit jamais contenir de donnée personnelle — ni e-mail, ni
 * prénom, ni contenu d'invitation. Ce journal n'est pas soumis à la purge des
 * invitations, il ne doit donc rien porter d'identifiant.
 */
export const operationEvents = mysqlTable(
  "operationEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    /** `email`, `purge`, `moderation`, `rate_limit`. */
    kind: varchar("kind", { length: 32 }).notNull(),
    /** `ok`, `error`, `blocked`. */
    outcome: varchar("outcome", { length: 16 }).notNull(),
    detail: json("detail"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("operationEvents_lookup_idx").on(table.kind, table.createdAt)]
);

export type OperationEvent = typeof operationEvents.$inferSelect;
export type InsertOperationEvent = typeof operationEvents.$inferInsert;

// L'index composite couvre l'unique requête faite sur cette table : compter les
// tentatives d'un couple (ipHash, actionType) sur une fenêtre glissante. Sans
// lui, chaque création d'invitation déclenche un scan complet.
export const rateLimits = mysqlTable(
  "rateLimits",
  {
    id: int("id").autoincrement().primaryKey(),
    ipHash: varchar("ipHash", { length: 64 }).notNull(),
    actionType: varchar("actionType", { length: 32 }).notNull(),
    timestamp: timestamp("timestamp").notNull(),
  },
  table => [index("rateLimits_lookup_idx").on(table.ipHash, table.actionType, table.timestamp)]
);

export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertRateLimit = typeof rateLimits.$inferInsert;
