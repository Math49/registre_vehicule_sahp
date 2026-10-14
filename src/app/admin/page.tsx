import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { listAdmins } from "@/lib/admins";
import { getSessionAdmin } from "@/lib/auth";

export const metadata = { title: "Panel admin — Registre SAHP" };

export default async function AdminPage() {
  const me = await getSessionAdmin();
  if (!me) redirect("/connexion");
  return <AdminPanel admins={listAdmins()} meId={me.id} />;
}
