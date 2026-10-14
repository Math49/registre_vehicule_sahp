"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastType = "ok" | "err";
type ToastState = { msg: string; type: ToastType; key: number } | null;

const ToastContext = createContext<(msg: string, type?: ToastType) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((msg: string, type: ToastType = "ok") => {
    clearTimeout(timer.current);
    setToast({ msg, type, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite">
        {toast && (
          <div key={toast.key} role="status" className={`toast${toast.type === "err" ? " toast--err" : ""}`}>
            <span className="toast__dot" aria-hidden="true">
              {toast.type === "err" ? "!" : "✓"}
            </span>
            <span className="toast__msg">{toast.msg}</span>
            <button type="button" className="toast__close" onClick={() => setToast(null)} aria-label="Fermer">
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
