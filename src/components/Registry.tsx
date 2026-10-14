"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SortDir, SortKey, Vehicle, VehiclePage } from "@/lib/vehicles";
import { formatDate } from "@/lib/format";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconPencil, IconSearch, IconTrash } from "./Icons";
import { CopyPlate, MiniPlate } from "./Plate";
import { useToast } from "./Toast";
import { VehicleForm } from "./VehicleForm";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "plate", label: "Plaque" },
  { key: "owner", label: "Propriétaire" },
  { key: "model", label: "Modèle" },
  { key: "serial", label: "N° de série" },
  { key: "date", label: "Enregistré le" },
];

type ModalState = { type: "create" } | { type: "edit"; vehicle: Vehicle } | { type: "delete"; vehicle: Vehicle } | null;

/** Numéros de page à afficher, avec « … » au-delà de 7 pages. */
function pageList(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "gap")[] = [1];
  const from = Math.max(2, Math.min(page - 1, pages - 4));
  const to = Math.min(pages - 1, Math.max(page + 1, 5));
  if (from > 2) out.push("gap");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < pages - 1) out.push("gap");
  out.push(pages);
  return out;
}

export function Registry({ initial, isAdmin }: { initial: VehiclePage; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [dir, setDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const firstRun = useRef(true);

  // Recherche différée pendant la frappe.
  useEffect(() => {
    if (queryInput === query) return;
    const t = setTimeout(() => {
      setQuery(queryInput);
      setPage(1);
    }, 200);
    return () => clearTimeout(t);
  }, [queryInput, query]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const ctrl = new AbortController();
    const params = new URLSearchParams({ q: query, sort, dir, page: String(page) });
    setLoading(true);
    fetch(`/api/vehicles?${params}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: VehiclePage) => {
        setData(d);
        if (d.page !== page) setPage(d.page);
        setLoading(false);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setLoading(false);
        toast("Impossible de charger le registre.", "err");
        console.error(e);
      });
    return () => ctrl.abort();
  }, [query, sort, dir, page, reloadKey, toast]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const highlight = (id: number) => {
    clearTimeout(flashTimer.current);
    setFlash(id);
    flashTimer.current = setTimeout(() => setFlash(null), 3000);
  };
  const reload = () => setReloadKey((k) => k + 1);

  const clearQuery = () => {
    setQueryInput("");
    setQuery("");
    setPage(1);
  };

  const onSort = (key: SortKey) => {
    setDir(sort === key && dir === "asc" ? "desc" : "asc");
    setSort(key);
    setPage(1);
  };

  const sessionExpired = () => {
    setModal(null);
    toast("Session expirée. Reconnectez-vous.", "err");
    router.refresh();
  };

  const onSaved = (v: Vehicle, created: boolean) => {
    setModal(null);
    if (created) {
      setQueryInput("");
      setQuery("");
      setSort("date");
      setDir("desc");
      setPage(1);
      toast(`Véhicule ${v.plate.trim()} enregistré au registre.`);
    } else {
      toast(`Modifications enregistrées — ${v.plate.trim()}.`);
    }
    reload();
    highlight(v.id);
  };

  const confirmDelete = async (v: Vehicle) => {
    const res = await fetch(`/api/vehicles/${v.id}`, { method: "DELETE" });
    if (res.status === 401) return sessionExpired();
    if (!res.ok && res.status !== 404) {
      toast("Échec de la suppression. Réessayez.", "err");
      return;
    }
    setModal(null);
    toast(`Véhicule ${v.plate.trim()} supprimé.`);
    reload();
  };

  const { items, total, matching, pages, perPage } = data;
  const current = data.page;
  const hasRows = items.length > 0;
  const noResults = total > 0 && matching === 0;
  const emptyRegistry = total === 0;
  const counterLabel = query
    ? `${matching} résultat${matching > 1 ? "s" : ""} · véhicules au total`
    : total > 1
      ? "véhicules enregistrés"
      : "véhicule enregistré";

  return (
    <main className="page">
      <div className="page-head">
        <div className="page-head__titles">
          <div className="page-head__kickers">
            <span className="kicker">Base publique · Comté de Los Santos &amp; Blaine</span>
            {isAdmin && <span className="pill-admin">Mode admin</span>}
          </div>
          <h1 className="page-title">Véhicules enregistrés</h1>
        </div>
        <div className="counter">
          <span className="counter__n">{total}</span>
          <span className="counter__label">{counterLabel}</span>
        </div>
      </div>

      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Rechercher dans le registre</span>
          <span className="search__icon">
            <IconSearch />
          </span>
          <input
            type="search"
            className="search__input"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Rechercher une plaque, un propriétaire, un modèle, un n° de série…"
            maxLength={100}
          />
          {queryInput && (
            <button type="button" className="search__clear" onClick={clearQuery} title="Effacer" aria-label="Effacer la recherche">
              ×
            </button>
          )}
        </label>
        <button type="button" className="btn btn-primary btn--lg" onClick={() => setModal({ type: "create" })}>
          <span className="btn__plus" aria-hidden="true">
            +
          </span>{" "}
          Enregistrer un véhicule
        </button>
      </div>

      {hasRows && (
        <div className={`card${loading ? " is-loading" : ""}`} aria-busy={loading}>
          <div className="vt-scroll">
            <div className={`vt${isAdmin ? " vt--admin" : ""}`} role="table" aria-label="Véhicules enregistrés">
              <div className="vt-row vt-head" role="row">
                {COLUMNS.map((c) => {
                  const active = sort === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      className="th"
                      role="columnheader"
                      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                      onClick={() => onSort(c.key)}
                    >
                      {c.label}
                      {active ? (
                        <span className="th__arrow">{dir === "asc" ? "▲" : "▼"}</span>
                      ) : (
                        <span className="th__idle">↕</span>
                      )}
                    </button>
                  );
                })}
                {isAdmin && (
                  <span className="th th--static" role="columnheader">
                    Actions
                  </span>
                )}
              </div>
              {items.map((v) => (
                <div key={v.id} className={`vt-row${flash === v.id ? " is-flash" : ""}`} role="row">
                  <span role="cell">
                    <CopyPlate plate={v.plate} />
                  </span>
                  <span className="td-owner" role="cell">
                    {v.owner}
                  </span>
                  <span className="td-model" role="cell">
                    {v.model}
                  </span>
                  <span className="td-serial" role="cell">
                    {v.serial}
                  </span>
                  <span className="td-date" role="cell">
                    {formatDate(v.createdAt)}
                  </span>
                  {isAdmin && (
                    <span className="td-actions" role="cell">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Modifier"
                        aria-label={`Modifier ${v.plate.trim()}`}
                        onClick={() => setModal({ type: "edit", vehicle: v })}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        title="Supprimer"
                        aria-label={`Supprimer ${v.plate.trim()}`}
                        onClick={() => setModal({ type: "delete", vehicle: v })}
                      >
                        <IconTrash />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="vcards">
            {items.map((v) => (
              <div key={v.id} className={`vcard${flash === v.id ? " is-flash" : ""}`}>
                <div className="vcard__top">
                  <CopyPlate plate={v.plate} />
                  <span className="vcard__date">{formatDate(v.createdAt)}</span>
                </div>
                <div className="vcard__info">
                  <span className="vcard__owner">{v.owner}</span>
                  <span className="vcard__model">{v.model}</span>
                  <span className="vcard__serial">{v.serial}</span>
                </div>
                {isAdmin && (
                  <div className="vcard__actions">
                    <button type="button" className="vcard__edit" onClick={() => setModal({ type: "edit", vehicle: v })}>
                      Modifier
                    </button>
                    <button type="button" className="vcard__delete" onClick={() => setModal({ type: "delete", vehicle: v })}>
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="card-foot">
            <span>
              Affichage {(current - 1) * perPage + 1}–{Math.min(current * perPage, matching)} sur {matching}
            </span>
            <nav className="pager" aria-label="Pagination">
              <button
                type="button"
                className="pager__arrow"
                onClick={() => setPage(current - 1)}
                disabled={current <= 1}
                title="Page précédente"
                aria-label="Page précédente"
              >
                ‹
              </button>
              {pageList(current, pages).map((p, i) =>
                p === "gap" ? (
                  <span key={`gap-${i}`} className="pager__gap">
                    …
                  </span>
                ) : p === current ? (
                  <span key={p} className="pager__current" aria-current="page">
                    {p}
                  </span>
                ) : (
                  <button key={p} type="button" className="pager__page" onClick={() => setPage(p)}>
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                className="pager__arrow"
                onClick={() => setPage(current + 1)}
                disabled={current >= pages}
                title="Page suivante"
                aria-label="Page suivante"
              >
                ›
              </button>
            </nav>
          </div>
        </div>
      )}

      {noResults && (
        <div className="empty">
          <span className="plate-unknown" aria-hidden="true">
            <span className="plate-unknown__state">San Andreas</span>
            <span className="plate-unknown__text">? ? ? ?</span>
          </span>
          <h2 className="empty__title">Aucun résultat pour « {query} »</h2>
          <p className="empty__text">Vérifiez l&apos;orthographe, ou cherchez par plaque, propriétaire, modèle ou n° de série.</p>
          <button type="button" className="btn btn-secondary" onClick={clearQuery}>
            Effacer la recherche
          </button>
        </div>
      )}

      {emptyRegistry && (
        <div className="empty empty--registry">
          <Image src="/logo-sahp.webp" alt="" width={72} height={72} className="empty__logo" />
          <h2 className="empty__title">Le registre est vide</h2>
          <p className="empty__text">Aucun véhicule n&apos;a encore été enregistré auprès de la SAHP.</p>
          <button type="button" className="btn btn-primary btn--md" onClick={() => setModal({ type: "create" })}>
            Enregistrer le premier véhicule
          </button>
        </div>
      )}

      {(modal?.type === "create" || modal?.type === "edit") && (
        <VehicleForm
          vehicle={modal.type === "edit" ? modal.vehicle : undefined}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onUnauthorized={sessionExpired}
        />
      )}

      {modal?.type === "delete" && (
        <ConfirmDialog
          title="Supprimer le véhicule"
          text={`Supprimer le véhicule ${modal.vehicle.plate.trim()} de ${modal.vehicle.owner} ?`}
          recap={
            <div className="confirm__recap">
              <MiniPlate plate={modal.vehicle.plate} />
              <span className="confirm__recap-info">
                <span className="confirm__recap-model">{modal.vehicle.model}</span>
                <span className="confirm__recap-serial">{modal.vehicle.serial}</span>
              </span>
            </div>
          }
          onCancel={() => setModal(null)}
          onConfirm={() => confirmDelete(modal.vehicle)}
        />
      )}
    </main>
  );
}
