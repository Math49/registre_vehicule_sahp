import { createAdmin, listAdmins } from "@/lib/admins";
import { fail, json, readJson, requireAdmin } from "@/lib/http";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  return json({ admins: listAdmins() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson(req);
  if (!body) return fail(400, "Requête invalide.");
  const res = createAdmin(String(body.username ?? ""), String(body.password ?? ""));
  return res.ok ? json({ admin: res.admin }, 201) : json({ errors: res.errors }, 400);
}
