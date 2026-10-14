import type { NextRequest } from "next/server";
import { createVehicle, listVehicles } from "@/lib/vehicles";
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

// Création publique : 10 enregistrements réussis / 10 min par IP.
const CREATE_LIMIT = 10;
const CREATE_WINDOW = 10 * 60_000;

export async function POST(req: NextRequest) {
  const body = await readJson(req);
  if (!body) return fail(400, "Requête invalide.");
  const key = `create:${clientIp(req)}`;
  if (!rateLimit(key, CREATE_LIMIT, CREATE_WINDOW, false))
    return fail(429, "Trop d'enregistrements depuis votre connexion. Réessayez dans quelques minutes.");
  const res = createVehicle(body);
  if (!res.ok) return json({ errors: res.errors }, 400);
  recordHit(key, CREATE_WINDOW);
  return json({ vehicle: res.vehicle }, 201);
}
