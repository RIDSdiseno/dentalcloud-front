import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createLote, updateLote, type InventoryLot } from '../../api/inventory';

type LoteFormModalProps = {
  supplyId: string;
  lote: InventoryLot | null;
  onClose: () => void;
  onSaved: (lote: InventoryLot) => void;
};

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export function LoteFormModal({ supplyId, lote, onClose, onSaved }: LoteFormModalProps) {
  const [lotNumber, setLotNumber] = useState(lote?.lotNumber ?? '');
  const [manufacturer, setManufacturer] = useState(lote?.manufacturer ?? '');
  const [presentation, setPresentation] = useState(lote?.presentation ?? '');
  const [concentration, setConcentration] = useState(lote?.concentration ?? '');
  const [healthRegistration, setHealthRegistration] = useState(lote?.healthRegistration ?? '');
  const [receivedAt, setReceivedAt] = useState(toDateInputValue(null));
  const [expirationDate, setExpirationDate] = useState(toDateInputValue(lote?.expirationDate ?? null));
  const [quantity, setQuantity] = useState(
    lote ? String(lote.currentQuantity) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!lotNumber.trim()) {
      setError('El número de lote es requerido');
      return;
    }
    const quantityValue = Number(quantity);
    if (!quantity || !Number.isFinite(quantityValue) || quantityValue < 0) {
      setError(lote ? 'Ingresa la cantidad actual' : 'Ingresa la cantidad inicial');
      return;
    }

    setIsSaving(true);
    try {
      const shared = {
        lotNumber: lotNumber.trim(),
        manufacturer: manufacturer || null,
        presentation: presentation || null,
        concentration: concentration || null,
        healthRegistration: healthRegistration || null,
        receivedAt: receivedAt || undefined,
        expirationDate: expirationDate || null,
      };
      const saved = lote
        ? await updateLote(supplyId, lote.id, { ...shared, quantity: quantityValue })
        : await createLote(supplyId, { ...shared, initialQuantity: quantityValue });
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el lote'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={lote ? 'Editar lote' : 'Nuevo lote'} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            N° de lote <span className="text-red-500">*</span>
          </label>
          <input
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            placeholder="Ej: L-2451"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Fabricante</label>
            <input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Presentación</label>
            <input
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Concentración</label>
            <input
              value={concentration}
              onChange={(e) => setConcentration(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Registro sanitario</label>
            <input
              value={healthRegistration}
              onChange={(e) => setHealthRegistration(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Fecha de recepción</label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Vencimiento</label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
            <p className="mt-0.5 text-xs text-slate-400">Vacío = sin vencimiento.</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            {lote ? 'Cantidad actual' : 'Cantidad inicial'} <span className="text-red-500">*</span>
          </label>
          {lote && (
            <p className="mt-0.5 text-xs text-slate-400">
              Cambiar este número edita el stock directo — para registrar una entrada/salida normal usa "Movimiento" en
              vez de editar el lote.
            </p>
          )}
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
