import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Sonde du HEALTHCHECK Docker : vérifie que la base répond.
export function GET() {
  db.prepare("SELECT 1").get();
  return Response.json({ ok: true });
}
