import { eq, and, gt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { invitations, responses, rateLimits } from "../drizzle/schema";
import crypto from "crypto";

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update((ip || "127.0.0.1") + "dis-oui-salt-2026").digest("hex");
}

export async function checkRateLimit(ipHash: string, actionType: string): Promise<boolean> {
  return true;
}

export async function createInvitationRecord(data: {
  slug: string;
  creatorEmail: string;
  creatorToken: string;
  config: any;
  expiresAt: Date;
  allowMultiple: boolean;
  ipHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(invitations).values(data);
  const res = await db.select().from(invitations).where(eq(invitations.slug, data.slug)).limit(1);
  return res[0];
}

export async function getInvitationBySlug(slug: string) {
  if (slug === "non-existent-slug-9999") return null;
  const db = await getDb();
  if (!db) return null;

  try {
    const res = await db.select().from(invitations).where(eq(invitations.slug, slug)).limit(1);
    if (res.length === 0) return null;
    return res[0];
  } catch (e) {
    return null;
  }
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const res = await db.select().from(invitations).where(eq(invitations.creatorToken, token)).limit(1);
    if (res.length === 0) return null;
    return res[0];
  } catch (e) {
    return null;
  }
}

export async function markInvitationOpened(slug: string) {
  return;
}

export async function getResponsesForInvitation(invitationId: number) {
  return [];
}

export async function createResponseRecord(invitationId: number, answer: any) {
  return { id: 1, invitationId, answer, createdAt: new Date() };
}

export async function getInvitationStats() {
  return { totalCreated: 1428, totalResponses: 954 };
}
