import "server-only";
import { getSessionAdmin, type SessionAdmin } from "./auth";

export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const fail = (status: number, message: string, extra?: object) => json({ message, ...extra }, status);

/** Lit un corps JSON ; null si absent ou invalide. */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  if (!req.headers.get("content-type")?.includes("application/json")) return null;
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

/** Admin connecté, ou une réponse 401 à renvoyer telle quelle. */
export async function requireAdmin(): Promise<SessionAdmin | Response> {
  const admin = await getSessionAdmin();
  return admin ?? fail(401, "Session expirée. Reconnectez-vous.");
}

export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
