import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createMovimiento, type InventoryLot, type InventorySupply } from '../../api/inventory';

type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

const MOVEMENT_LABELS: Record<MovementType, string> = {
  IN: 'Entrada (suma al stock)',
  OUT: 'Salida (resta del stock)',
  ADJUSTMENT: 'Ajuste (fija la cantidad exacta)',
};

type MovimientoModalProps = {
  supplyId: string;
  lote: InventoryLot;
  onClose: () => void;
  onSaved: (result: { lot: InventoryLot; supply: InventorySupply }) => void;
};

export function MovimientoModal({ supplyId, lote, onClose, onSaved }: MovimientoModalProps) {
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    const quantityValue = Number(quantity);
    if (!quantity || !Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError('Ingresa una cantidad mayor que cero');
      return;
    }
    if (movementType === 'ADJUSTMENT' && !reason.trim()) {
      setError('Un ajuste debe incluir un motivo');
      return;
    }

    setIsSaving(true);
    try {
      const result = await createMovimiento(supplyId, lote.id, {
        movementType,
        quantity: quantityValue,
        reason: reason.trim() || undefined,
      });
      onSaved(result);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar el movimiento'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={`Movimiento — Lote ${lote.lotNumber}`} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Stock actual del lote: <span className="font-semibold">{lote.currentQuantity}</span>
        </p>

        <div>
          <label className="text-sm font-medium text-slate-700">Tipo de movimiento</label>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  movementType === type ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="movementType"
                  checked={movementType === type}
                  onChange={() => setMovementType(type)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                {MOVEMENT_LABELS[type]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            {movementType === 'ADJUSTMENT' ? 'Cantidad final del lote' : 'Cantidad'} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Motivo {movementType === 'ADJUSTMENT' && <span className="text-red-500">*</span>}
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={movementType === 'ADJUSTMENT' ? 'Ej: conteo físico, producto dañado...' : 'Opcional'}
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
            {isSaving ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
