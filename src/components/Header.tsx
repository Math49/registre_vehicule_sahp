import Image from "next/image";
import Link from "next/link";
import { getSessionAdmin } from "@/lib/auth";
import { HeaderNav } from "./HeaderNav";

export async function Header() {
  const admin = await getSessionAdmin();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          <Image src="/logo-sahp.webp" alt="Badge SAHP" width={46} height={46} className="brand__logo" priority />
          <span className="brand__text">
            <span className="brand__kicker">San Andreas Highway Patrol</span>
            <span className="brand__title">Registre des véhicules</span>
          </span>
        </Link>
        <div className="site-header__spacer" />
        <HeaderNav me={admin?.username ?? null} />
      </div>
      <div className="header-rule" />
      <div className="header-stripes" />
    </header>
  );
}
