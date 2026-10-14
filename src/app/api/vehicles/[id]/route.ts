import { deleteVehicle, updateVehicle } from "@/lib/vehicles";
import { fail, json, parseId, readJson, requireAdmin } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = parseId((await ctx.params).id);
  const body = await readJson(req);
  if (!id || !body) return fail(400, "Requête invalide.");
  const res = updateVehicle(id, body);
  if (!res) return fail(404, "Véhicule introuvable.");
  return res.ok ? json({ vehicle: res.vehicle }) : json({ errors: res.errors }, 400);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = parseId((await ctx.params).id);
  if (!id) return fail(400, "Requête invalide.");
  const v = deleteVehicle(id);
  return v ? json({ vehicle: v }) : fail(404, "Véhicule introuvable.");
}
