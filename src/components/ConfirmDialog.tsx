"use client";

import { useState, type ReactNode } from "react";
import { Modal, useModalId } from "./Modal";
import { IconTrash } from "./Icons";

type Props = {
  title: string;
  text: string;
  recap?: ReactNode;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
};

/** Dialogue de suppression (bande hachurée rouge, action irréversible). */
export function ConfirmDialog({ title, text, recap, onCancel, onConfirm }: Props) {
  const id = useModalId();
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal onClose={onCancel} size="sm" role="alertdialog" labelledBy={id}>
      <div className="confirm__stripe" />
      <div className="confirm__body">
        <div className="confirm__row">
          <span className="confirm__icon">
            <IconTrash size={18} />
          </span>
          <div className="confirm__texts">
            <h2 className="confirm__title" id={id}>
              {title}
            </h2>
            <p className="confirm__text">
              {text} <strong>Action irréversible.</strong>
            </p>
          </div>
        </div>
        {recap}
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn-secondary" onClick={onCancel} data-autofocus>
          Annuler
        </button>
        <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
          Supprimer
        </button>
      </div>
    </Modal>
  );
}
