"use client";

import { useState, type FormEvent } from "react";
import type { Vehicle } from "@/lib/vehicles";
import { formatDate } from "@/lib/format";
import {
  MODEL_MAX,
  OWNER_MAX,
  PLATE_LENGTH,
  errorCount,
  sanitizePlateInput,
  sanitizeSerialInput,
  validateVehicle,
  type FieldErrors,
  type VehicleField,
  type VehicleInput,
} from "@/lib/validation";
import { Modal, ModalHead, useModalId } from "./Modal";
import { PlatePreview } from "./Plate";
import { useToast } from "./Toast";

type Props = {
  vehicle?: Vehicle; // présent = modification (admin)
  onClose: () => void;
  onSaved: (v: Vehicle, created: boolean) => void;
  onUnauthorized: () => void;
};

const TEXT_FIELDS: {
  key: Exclude<VehicleField, "plate">;
  label: string;
  help: string;
  placeholder: string;
  className?: string;
  maxLength?: number;
  inputMode?: "numeric";
}[] = [
  {
    key: "owner",
    label: "Nom du propriétaire",
    help: "Nom et prénom tels qu'inscrits sur la pièce d'identité.",
    placeholder: "Jean Dupont",
    maxLength: OWNER_MAX,
  },
  {
    key: "model",
    label: "Modèle du véhicule",
    help: "Marque et modèle, ex. Vapid Stanier.",
    placeholder: "Vapid Stanier",
    maxLength: MODEL_MAX,
  },
  {
    key: "serial",
    label: "N° de série",
    help: "Numéro attribué par le serveur à la création du véhicule. Unique.",
    placeholder: "15600",
    className: "input--mono input--serial",
    inputMode: "numeric",
  },
];

export function VehicleForm({ vehicle, onClose, onSaved, onUnauthorized }: Props) {
  const toast = useToast();
  const titleId = useModalId();
  const editing = !!vehicle;
  const [form, setForm] = useState<VehicleInput>(
    vehicle
      ? { owner: vehicle.owner, model: vehicle.model, serial: vehicle.serial, plate: vehicle.plate }
      : { owner: "", model: "", serial: "", plate: "" },
  );
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors<VehicleField>>({});
  const [busy, setBusy] = useState(false);
  const [openedAt] = useState(() => Date.now());

  // Validation locale après la première tentative ; erreurs serveur (ex. doublon) en complément.
  const errors: FieldErrors<VehicleField> = { ...serverErrors, ...(tried ? validateVehicle(form) : {}) };
  const nErrors = errorCount(errors);

  const set = (key: VehicleField, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setServerErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTried(true);
    if (errorCount(validateVehicle(form)) || busy) return;
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/vehicles/${vehicle.id}` : "/api/vehicles", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return onSaved(data.vehicle, !editing);
      if (res.status === 401) return onUnauthorized();
      if (res.status === 400 && data.errors) return setServerErrors(data.errors);
      toast(data.message || "Échec de l'enregistrement. Réessayez.", "err");
    } catch {
      toast("Échec de l'enregistrement. Réessayez.", "err");
    } finally {
      setBusy(false);
    }
  };

  const plen = form.plate.length;
  const plateState = errors.plate ? "is-invalid" : plen === PLATE_LENGTH ? "is-valid" : "";

  return (
    <Modal onClose={onClose} alignTop labelledBy={titleId} onSubmit={submit}>
      <ModalHead
        id={titleId}
        kicker={editing ? "Administration" : "Nouveau véhicule"}
        title={editing ? "Modifier le véhicule" : "Enregistrer un véhicule"}
        onClose={onClose}
      />
      <div className="modal__body">
        {nErrors > 0 && (
          <div role="alert" className="alert">
            {nErrors === 1 ? "1 champ à corriger avant l'enregistrement." : `${nErrors} champs à corriger avant l'enregistrement.`}
          </div>
        )}

        {TEXT_FIELDS.map((f) => {
          const err = errors[f.key];
          const id = `${titleId}-${f.key}`;
          return (
            <div className="field" key={f.key}>
              <label className="field__label" htmlFor={id}>
                {f.label} <span className="field__req">*</span>
              </label>
              <input
                id={id}
                className={`input ${f.className ?? ""}${err ? " is-invalid" : ""}`}
                value={form[f.key]}
                onChange={(e) => set(f.key, f.key === "serial" ? sanitizeSerialInput(e.target.value) : e.target.value)}
                placeholder={f.placeholder}
                inputMode={f.inputMode}
                maxLength={f.maxLength}
                autoComplete="off"
                aria-invalid={!!err}
                aria-describedby={`${id}-hint`}
              />
              <span id={`${id}-hint`} className={err ? "field__error" : "field__help"}>
                {err || f.help}
              </span>
            </div>
          );
        })}

        <div className="field">
          <div className="plate-field__head">
            <label className="field__label" htmlFor={`${titleId}-plate`}>
              Plaque d&apos;immatriculation <span className="field__req">*</span>
            </label>
            <span className={`plate-field__count ${plen === PLATE_LENGTH ? "is-full" : errors.plate ? "is-invalid" : ""}`}>
              {plen}/{PLATE_LENGTH}
            </span>
          </div>
          <div className="plate-field__row">
            <div className="plate-field__input">
              <input
                id={`${titleId}-plate`}
                className={`input input--plate ${plateState}`}
                value={form.plate}
                onChange={(e) => set("plate", sanitizePlateInput(e.target.value))}
                maxLength={PLATE_LENGTH}
                placeholder="46EEK572"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!errors.plate}
                aria-describedby={`${titleId}-plate-hint`}
              />
              <span id={`${titleId}-plate-hint`} className={errors.plate ? "field__error" : "field__help"}>
                {errors.plate || "Exactement 8 caractères, espaces compris. Lettres et chiffres, converti en majuscules."}
              </span>
            </div>
            <PlatePreview plate={form.plate} />
          </div>
        </div>
      </div>
      <div className="modal__foot modal__foot--split">
        <span className="modal__note">
          {editing ? `Enregistré le ${formatDate(vehicle.createdAt)}` : `Date d'enregistrement : ${formatDate(openedAt)}`}
        </span>
        <div className="modal__actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editing ? "Enregistrer les modifications" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
