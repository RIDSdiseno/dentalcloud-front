import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { AlertTriangleIcon } from '../../components/icons';

type Entry = { label: string; password: string };

export function GeneratedPasswordDialog({ entries, onClose }: { entries: Entry[]; onClose: () => void }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleCopy(password: string, index: number) {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 2000);
    } catch {
      // Si el navegador bloquea el portapapeles, la contraseña sigue visible para copiar a mano.
    }
  }

  return (
    <Modal title="Contraseña generada para RIDS RX" onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          Guarda esta información ahora — no se podrá volver a ver. Compártela con la persona correspondiente para
          que pueda ingresar directamente a RIDS RX.
        </p>

        <div className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <div key={`${entry.label}-${index}`} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-700">{entry.label}</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-slate-100 px-2 py-1.5 text-sm text-slate-800">
                  {entry.password}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(entry.password, index)}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {copiedIndex === index ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Entendido
          </button>
        </div>
      </div>
    </Modal>
  );
}
