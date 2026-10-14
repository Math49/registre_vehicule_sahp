"use client";

import { useEffect, useId, useRef, type FormEvent, type MouseEvent, type ReactNode, type Ref } from "react";

type Props = {
  onClose: () => void;
  size?: "sm" | "md" | "lg";
  alignTop?: boolean;
  role?: "dialog" | "alertdialog";
  labelledBy?: string;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
};

/** Overlay + carte. Ferme sur clic extérieur ou Échap ; met le focus sur le premier champ. */
export function Modal({ onClose, size = "lg", alignTop, role = "dialog", labelledBy, onSubmit, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input, [data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  const common = {
    className: `modal${size === "sm" ? " modal--sm" : size === "md" ? " modal--md" : ""}`,
    role,
    "aria-modal": true,
    "aria-labelledby": labelledBy,
    onMouseDown: (e: MouseEvent) => e.stopPropagation(),
  } as const;

  return (
    <div className={`overlay${alignTop ? " overlay--top" : ""}`} onMouseDown={onClose}>
      {onSubmit ? (
        <form {...common} ref={ref as Ref<HTMLFormElement>} onSubmit={onSubmit} noValidate>
          {children}
        </form>
      ) : (
        <div {...common} ref={ref as Ref<HTMLDivElement>}>
          {children}
        </div>
      )}
    </div>
  );
}

export function ModalHead({ kicker, title, onClose, id }: { kicker: string; title: string; onClose: () => void; id: string }) {
  return (
    <div className="modal__head">
      <div className="modal__titles">
        <span className="modal__kicker">{kicker}</span>
        <h2 className="modal__title" id={id}>
          {title}
        </h2>
      </div>
      <button type="button" className="modal__close" onClick={onClose} title="Fermer" aria-label="Fermer">
        ×
      </button>
    </div>
  );
}

export const useModalId = () => useId();
