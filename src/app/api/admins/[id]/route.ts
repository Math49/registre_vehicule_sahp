import { deleteAdmin, getAdmin, setAdminPassword } from "@/lib/admins";
import { validatePassword } from "@/lib/validation";
import { fail, json, parseId, readJson, requireAdmin } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// Changement de mot de passe.
export async function PATCH(req: Request, ctx: Ctx) {
  const me = await requireAdmin();
  if (me instanceof Response) return me;
  const id = parseId((await ctx.params).id);
  const body = await readJson(req);
  if (!id || !body) return fail(400, "Requête invalide.");
  const target = getAdmin(id);
  if (!target) return fail(404, "Compte introuvable.");
  const password = String(body.password ?? "");
  const err = validatePassword(password);
  if (err) return json({ errors: { p: err } }, 400);
  setAdminPassword(id, password, me.id);
  return json({ admin: target });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const me = await requireAdmin();
  if (me instanceof Response) return me;
  const id = parseId((await ctx.params).id);
  if (!id) return fail(400, "Requête invalide.");
  if (id === me.id) return fail(403, "Vous ne pouvez pas supprimer votre propre compte.");
  const target = getAdmin(id);
  if (!target) return fail(404, "Compte introuvable.");
  deleteAdmin(id);
  return json({ admin: target });
}
