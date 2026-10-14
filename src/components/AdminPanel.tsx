"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AdminAccount } from "@/lib/admins";
import { formatDate, initials } from "@/lib/format";
import { validatePassword, validateUsername, type AccountField, type FieldErrors } from "@/lib/validation";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconTrash } from "./Icons";
import { Modal, ModalHead, useModalId } from "./Modal";
import { useToast } from "./Toast";

type ModalState = { type: "add" } | { type: "password"; admin: AdminAccount } | { type: "delete"; admin: AdminAccount } | null;

export function AdminPanel({ admins, meId }: { admins: AdminAccount[]; meId: number }) {
  const router = useRouter();
  const toast = useToast();
  const [modal, setModal] = useState<ModalState>(null);

  const sessionExpired = () => {
    setModal(null);
    toast("Session expirée. Reconnectez-vous.", "err");
    router.push("/connexion");
    router.refresh();
  };

  const confirmDelete = async (a: AdminAccount) => {
    const res = await fetch(`/api/admins/${a.id}`, { method: "DELETE" });
    if (res.status === 401) return sessionExpired();
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 404) {
      toast(data.message || "Échec de la suppression. Réessayez.", "err");
      return;
    }
    setModal(null);
    toast(`Compte ${a.username} supprimé.`);
    router.refresh();
  };

  return (
    <main className="page page--narrow">
      <Link href="/" className="btn-link back-link">
        ← Registre des véhicules
      </Link>
      <div className="page-head">
        <div className="page-head__titles">
          <span className="kicker">Panel admin</span>
          <h1 className="page-title">Comptes administrateurs</h1>
        </div>
        <button type="button" className="btn btn-primary btn--md" onClick={() => setModal({ type: "add" })}>
          <span className="btn__plus" aria-hidden="true">
            +
          </span>{" "}
          Ajouter un admin
        </button>
      </div>

      <div className="card">
        <div className="at-row at-head">
          <span>Identifiant</span>
          <span>Créé le</span>
          <span className="ta-right">Actions</span>
        </div>
        {admins.map((a) => {
          const isMe = a.id === meId;
          return (
            <div className="at-row" key={a.id}>
              <span className="at-user">
                <span className="at-avatar" aria-hidden="true">
                  {initials(a.username)}
                </span>
                <span className="at-name">{a.username}</span>
                {isMe && <span className="pill-me">Vous</span>}
              </span>
              <span className="at-date">{formatDate(a.createdAt)}</span>
              <span className="at-actions">
                <button type="button" className="btn-sm" onClick={() => setModal({ type: "password", admin: a })}>
                  Changer le mot de passe
                </button>
                {isMe ? (
                  <span
                    className="icon-btn icon-btn--disabled"
                    title="Vous ne pouvez pas supprimer votre propre compte"
                    aria-label="Vous ne pouvez pas supprimer votre propre compte"
                  >
                    <IconTrash />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    title="Supprimer"
                    aria-label={`Supprimer ${a.username}`}
                    onClick={() => setModal({ type: "delete", admin: a })}
                  >
                    <IconTrash />
                  </button>
                )}
              </span>
            </div>
          );
        })}
        <div className="card-foot">
          {admins.length} compte{admins.length > 1 ? "s" : ""} · Votre propre compte ne peut pas être supprimé.
        </div>
      </div>

      {(modal?.type === "add" || modal?.type === "password") && (
        <AccountModal
          target={modal.type === "password" ? modal.admin : undefined}
          onClose={() => setModal(null)}
          onUnauthorized={sessionExpired}
          onDone={(msg) => {
            setModal(null);
            toast(msg);
            router.refresh();
          }}
        />
      )}

      {modal?.type === "delete" && (
        <ConfirmDialog
          title="Supprimer le compte"
          text={`Supprimer le compte ${modal.admin.username} ?`}
          onCancel={() => setModal(null)}
          onConfirm={() => confirmDelete(modal.admin)}
        />
      )}
    </main>
  );
}

function AccountModal({
  target,
  onClose,
  onDone,
  onUnauthorized,
}: {
  target?: AdminAccount;
  onClose: () => void;
  onDone: (msg: string) => void;
  onUnauthorized: () => void;
}) {
  const toast = useToast();
  const titleId = useModalId();
  const [acc, setAcc] = useState({ u: "", p: "", c: "" });
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors<AccountField>>({});
  const [busy, setBusy] = useState(false);

  const validate = (): FieldErrors<AccountField> => {
    const e: FieldErrors<AccountField> = {};
    if (!target) e.u = validateUsername(acc.u);
    e.p = validatePassword(acc.p);
    if (!acc.c) e.c = "Champ requis.";
    else if (acc.c !== acc.p) e.c = "Les mots de passe ne correspondent pas.";
    return e;
  };
  const errors: FieldErrors<AccountField> = { ...serverErrors, ...(tried ? stripEmpty(validate()) : {}) };

  const set = (k: AccountField, v: string) => {
    setAcc((a) => ({ ...a, [k]: v }));
    setServerErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTried(true);
    if (Object.keys(stripEmpty(validate())).length || busy) return;
    setBusy(true);
    try {
      const res = await fetch(target ? `/api/admins/${target.id}` : "/api/admins", {
        method: target ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target ? { password: acc.p } : { username: acc.u.trim(), password: acc.p }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return onDone(target ? `Mot de passe de ${target.username} mis à jour.` : `Compte ${data.admin.username} créé.`);
      if (res.status === 401) return onUnauthorized();
      if (res.status === 400 && data.errors) return setServerErrors(data.errors);
      toast(data.message || "Échec de l'opération. Réessayez.", "err");
    } catch {
      toast("Échec de l'opération. Réessayez.", "err");
    } finally {
      setBusy(false);
    }
  };

  const fields: { k: AccountField; label: string; help: string; type: string; mono?: boolean; placeholder?: string; auto: string }[] = [
    ...(target
      ? []
      : [{ k: "u" as const, label: "Identifiant", help: "Lettres minuscules et points, ex. admin.nom.", type: "text", mono: true, placeholder: "admin.nom", auto: "off" }]),
    { k: "p", label: target ? "Nouveau mot de passe" : "Mot de passe", help: "8 caractères minimum.", type: "password", auto: "new-password" },
    { k: "c", label: "Confirmation", help: "Saisissez à nouveau le mot de passe.", type: "password", auto: "new-password" },
  ];

  return (
    <Modal onClose={onClose} size="md" labelledBy={titleId} onSubmit={submit}>
      <ModalHead
        id={titleId}
        kicker={target ? `Compte ${target.username}` : "Panel admin"}
        title={target ? "Changer le mot de passe" : "Ajouter un admin"}
        onClose={onClose}
      />
      <div className="modal__body">
        {fields.map((f) => {
          const err = errors[f.k];
          const id = `${titleId}-${f.k}`;
          return (
            <div className="field" key={f.k}>
              <label className="field__label" htmlFor={id}>
                {f.label}
              </label>
              <input
                id={id}
                type={f.type}
                className={`input${f.mono ? " input--mono" : ""}${err ? " is-invalid" : ""}`}
                value={acc[f.k]}
                onChange={(e) => set(f.k, f.k === "u" ? e.target.value.toLowerCase() : e.target.value)}
                placeholder={f.placeholder}
                autoComplete={f.auto}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!err}
                aria-describedby={`${id}-hint`}
              />
              <span id={`${id}-hint`} className={err ? "field__error" : "field__help"}>
                {err || f.help}
              </span>
            </div>
          );
        })}
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {target ? "Mettre à jour" : "Créer le compte"}
        </button>
      </div>
    </Modal>
  );
}

function stripEmpty<T extends object>(e: T): T {
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as T;
}
