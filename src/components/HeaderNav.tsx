"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { initials } from "@/lib/format";
import { IconLock, IconMoon, IconSun } from "./Icons";
import { useToast } from "./Toast";

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("sahp-theme", next);
  } catch {}
}

export function HeaderNav({ me }: { me: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
    toast("Vous êtes déconnecté.");
  };

  return (
    <nav className="site-nav">
      <button type="button" className="theme-btn" onClick={toggleTheme} title="Changer de thème" aria-label="Changer de thème">
        <IconSun />
        <IconMoon />
      </button>
      {me ? (
        <>
          <span className="me-chip">
            <span className="me-chip__avatar" aria-hidden="true">
              {initials(me)}
            </span>
            <span className="me-chip__name">{me}</span>
          </span>
          <Link href="/admin" className="nav-btn" aria-current={pathname === "/admin" ? "page" : undefined}>
            Panel admin
          </Link>
          <button type="button" className="nav-ghost" onClick={logout}>
            Déconnexion
          </button>
        </>
      ) : (
        <Link href="/connexion" className="nav-btn nav-btn--login" aria-current={pathname === "/connexion" ? "page" : undefined}>
          <IconLock />
          Connexion
        </Link>
      )}
    </nav>
  );
}
