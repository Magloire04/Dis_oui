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
