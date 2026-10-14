import { Registry } from "@/components/Registry";
import { getSessionAdmin } from "@/lib/auth";
import { listVehicles } from "@/lib/vehicles";

export default async function HomePage() {
  const admin = await getSessionAdmin();
  return <Registry initial={listVehicles({})} isAdmin={!!admin} />;
}
