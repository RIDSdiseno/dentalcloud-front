import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createChair, type Chair } from '../../api/chairs';

type ChairFormModalProps = {
  nextNumber: number;
  onClose: () => void;
  onCreated: (chair: Chair) => void;
};

export function ChairFormModal({ nextNumber, onClose, onCreated }: ChairFormModalProps) {
  const [number, setNumber] = useState(String(nextNumber));
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const chair = await createChair({ number: Number(number), name: name || undefined });
      onCreated(chair);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el sillón'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Agregar sillón" onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="number" className="text-sm font-medium text-slate-700">
            Número de sillón
          </label>
          <input
            id="number"
            type="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            min={1}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <div>
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Nombre (opcional)
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Sillón ${number || nextNumber}`}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Creando...' : 'Crear sillón'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
