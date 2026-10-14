import type { NextRequest } from "next/server";
import { createVehicle, listVehicles } from "@/lib/vehicles";
import { getSessionAdmin } from "@/lib/auth";
import { clientIp, rateLimit, recordHit } from "@/lib/rate-limit";
import { fail, json, readJson } from "@/lib/http";

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return json(
    listVehicles({
      q: sp.get("q") ?? "",
      sort: sp.get("sort") ?? "date",
      dir: sp.get("dir") ?? "desc",
      page: Number(sp.get("page")) || 1,
    }),
  );
}

// Visiteurs : 10 enregistrements réussis / minute par IP. Admins connectés : aucune limite.
const CREATE_LIMIT = 10;
const CREATE_WINDOW = 60_000;

export async function POST(req: NextRequest) {
  const body = await readJson(req);
  if (!body) return fail(400, "Requête invalide.");
  const limited = !(await getSessionAdmin());
  const key = `create:${clientIp(req)}`;
  if (limited && !rateLimit(key, CREATE_LIMIT, CREATE_WINDOW, false))
    return fail(429, "Trop d'enregistrements depuis votre connexion. Réessayez dans une minute.");
  const res = createVehicle(body);
  if (!res.ok) return json({ errors: res.errors }, 400);
  if (limited) recordHit(key, CREATE_WINDOW);
  return json({ vehicle: res.vehicle }, 201);
}
