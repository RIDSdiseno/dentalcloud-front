import { useState } from 'react';
import { Modal } from './Modal';

// Pide un motivo obligatorio antes de continuar una acción sensible (ej.
// modificar un presupuesto ya "en tratamiento", borrar una evolución) — el
// motivo queda guardado del lado del backend para auditoría, esto solo
// captura el texto y bloquea "Aceptar" hasta que se escriba algo.
export function ReasonModal({
  title,
  description,
  placeholder,
  acceptLabel = 'Aceptar',
  onClose,
  onAccept,
}: {
  title: string;
  description: string;
  placeholder?: string;
  acceptLabel?: string;
  onClose: () => void;
  onAccept: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleAccept() {
    if (!reason.trim()) return;
    setIsSaving(true);
    try {
      await onAccept(reason.trim());
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600">{description}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          autoFocus
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isSaving || !reason.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Guardando...' : acceptLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
