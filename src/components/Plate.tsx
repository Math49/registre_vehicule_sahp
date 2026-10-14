"use client";

import { useToast } from "./Toast";

/** Mini plaque San Andreas (104×36). Toujours blanche, même en mode sombre. */
export function MiniPlate({ plate }: { plate: string }) {
  return (
    <span className="plate">
      <span className="plate__state">San Andreas</span>
      <span className="plate__text">{plate}</span>
    </span>
  );
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Repli pour les contextes non sécurisés (http hors localhost).
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    t.remove();
    return ok;
  }
}

/** Mini plaque cliquable : copie immédiate dans le presse-papiers. */
export function CopyPlate({ plate }: { plate: string }) {
  const toast = useToast();
  const copy = async () => {
    if (await writeClipboard(plate)) toast(`Plaque ${plate.trim()} copiée dans le presse-papiers.`);
    else toast("Copie impossible.", "err");
  };
  return (
    <button
      type="button"
      className="plate"
      onClick={copy}
      title="Cliquer pour copier la plaque"
      aria-label={`Copier la plaque ${plate.trim()}`}
    >
      <span className="plate__state" aria-hidden="true">
        San Andreas
      </span>
      <span className="plate__text" aria-hidden="true">
        {plate}
      </span>
    </button>
  );
}

/** Grande plaque d'aperçu (220×110) du formulaire. */
export function PlatePreview({ plate }: { plate: string }) {
  return (
    <div className="plate-preview">
      <div className="plate-big" aria-hidden="true">
        <span className="plate-big__rivet" style={{ left: 10 }} />
        <span className="plate-big__rivet" style={{ right: 10 }} />
        <span className="plate-big__state">San Andreas</span>
        <span className={`plate-big__text${plate ? "" : " is-empty"}`}>{plate || "········"}</span>
        <span className="plate-big__foot">SAHP · REGISTRE</span>
      </div>
      <span className="plate-preview__caption">Aperçu en direct</span>
    </div>
  );
}
