import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import { ENV } from "./_core/env";

/**
 * Authentification du tableau de bord d'administration.
 *
 * Un administrateur unique, un mot de passe en variable d'environnement, une
 * session signée en cookie. Ni table utilisateurs, ni inscription, ni mot de
 * passe oublié : la surface d'attaque se limite à un secret que seul l'éditeur
 * détient.
 */

export const ADMIN_COOKIE = "admin_session";

/** Durée d'une session. Assez courte pour qu'un poste laissé ouvert expire. */
const SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Fenêtre et quota des tentatives de connexion, par empreinte d'adresse IP. */
export const LOGIN_ATTEMPT_LIMIT = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export class AdminNotConfiguredError extends Error {
  constructor() {
    super("La console d'administration n'est pas configurée sur ce serveur.");
  }
}

/**
 * Compare deux secrets sans fuite de temps.
 *
 * Les deux valeurs sont d'abord réduites à un condensé de longueur fixe :
 * `timingSafeEqual` exige des tampons de même taille, et lui passer les
 * chaînes brutes révélerait la longueur du mot de passe attendu.
 */
function secretsMatch(candidate: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(candidate).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function isAdminConfigured(): boolean {
  return ENV.adminPassword.length > 0;
}

function signingKey(): Uint8Array {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET est requis pour signer les sessions d'administration.");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createAdminSession(password: string): Promise<string> {
  if (!isAdminConfigured()) throw new AdminNotConfiguredError();
  if (!secretsMatch(password, ENV.adminPassword)) {
    throw new Error("Mot de passe incorrect.");
  }

  return await new SignJWT({ role: "superadmin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("dis-oui")
    .setAudience("dis-oui-admin")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(signingKey());
}

export async function verifyAdminSession(token: string | undefined): Promise<boolean> {
  if (!token || !isAdminConfigured()) return false;
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      issuer: "dis-oui",
      audience: "dis-oui-admin",
    });
    return payload.role === "superadmin";
  } catch {
    // Signature invalide, jeton expiré, ou secret changé depuis l'émission.
    return false;
  }
}

/**
 * Options du cookie de session.
 *
 * `sameSite: "strict"` : la console n'est jamais atteinte depuis un site tiers,
 * ce qui neutralise les requêtes intersites. `secure` est conditionné à la
 * production pour que le développement en HTTP local fonctionne.
 */
export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

export function readAdminCookie(req: Request): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const pair = raw.split(";").find(c => c.trim().startsWith(`${ADMIN_COOKIE}=`));
  return pair?.trim().slice(ADMIN_COOKIE.length + 1) || undefined;
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(ADMIN_COOKIE, { ...adminCookieOptions(), maxAge: -1 });
}
