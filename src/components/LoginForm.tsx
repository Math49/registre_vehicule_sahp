"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "./Toast";

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Identifiants invalides");
        return;
      }
      router.push("/");
      router.refresh();
      toast(`Connecté en tant que ${data.username}.`);
    } catch {
      setError("Connexion impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const invalid = error ? " is-invalid" : "";

  return (
    <main className="login-main">
      <form className="login-card" onSubmit={submit}>
        <div className="login-card__top">
          <Image src="/logo-sahp.webp" alt="Badge SAHP" width={96} height={96} className="login-card__badge" priority />
          <h1 className="login-card__title" style={{ margin: 0 }}>
            Espace administrateur
          </h1>
          <span className="login-card__kicker">Accès restreint</span>
        </div>
        <div className="login-card__body">
          <p className="login-card__intro">Réservé aux administrateurs du registre. La consultation du registre reste publique.</p>
          {error && (
            <div role="alert" className="alert">
              <span className="alert__dot" aria-hidden="true">
                !
              </span>
              {error}
            </div>
          )}
          <label className="field">
            <span className="field__label">Identifiant</span>
            <input
              className={`input input--mono${invalid}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin.nom"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Mot de passe</span>
            <input
              type="password"
              className={`input${invalid}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary btn--block" disabled={busy}>
            Se connecter
          </button>
          <Link href="/" className="btn-link">
            ← Retour au registre public
          </Link>
        </div>
      </form>
    </main>
  );
}
