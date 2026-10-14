import { authenticate } from "@/lib/admins";
import { startSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fail, json, readJson } from "@/lib/http";

export async function POST(req: Request) {
  const body = await readJson(req);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!rateLimit(`login:${clientIp(req)}`, 10, 10 * 60_000))
    return fail(429, "Trop de tentatives. Réessayez dans quelques minutes.");
  const admin = username && password ? authenticate(username, password) : null;
  if (!admin) return fail(401, "Identifiants invalides");
  await startSession(admin.id);
  return json({ username: admin.username });
}
