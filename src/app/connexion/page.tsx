import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSessionAdmin } from "@/lib/auth";

export const metadata = { title: "Connexion — Registre SAHP" };

export default async function LoginPage() {
  if (await getSessionAdmin()) redirect("/");
  return <LoginForm />;
}
