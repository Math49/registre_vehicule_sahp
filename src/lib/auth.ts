import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "sahp_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 jours
// Cookie « Secure » (HTTPS uniquement) en production, sauf COOKIE_SECURE=false (accès en HTTP simple).
const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE !== "false" : process.env.NODE_ENV === "production";

export type SessionAdmin = { id: number; username: string };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Crée une session pour l'admin et pose le cookie httpOnly. */
export async function startSession(adminId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_TTL_MS;
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  db.prepare("INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), adminId, expires);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  jar.delete(SESSION_COOKIE);
}

/** Admin connecté, ou null. */
export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT a.id, a.username FROM sessions s JOIN admins a ON a.id = s.admin_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), Date.now()) as SessionAdmin | undefined;
  return row ?? null;
}
