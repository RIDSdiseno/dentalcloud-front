import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { fetchLotes, type InventoryLot, type InventorySupply } from '../../api/inventory';
import { PlusIcon, EditIcon } from '../../components/icons';
import { LoteFormModal } from './LoteFormModal';
import { MovimientoModal } from './MovimientoModal';

type LotesModalProps = {
  supply: InventorySupply;
  onClose: () => void;
  onSupplyChanged: (patch: Partial<InventorySupply> & { id: string }) => void;
};

const EXPIRATION_BADGE: Record<InventoryLot['expirationStatus'], string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  EXPIRING: 'bg-amber-50 text-amber-700',
  EXPIRED: 'bg-red-50 text-red-700',
  NO_EXPIRATION: 'bg-slate-100 text-slate-500',
};

export function LotesModal({ supply, onClose, onSupplyChanged }: LotesModalProps) {
  const [lotes, setLotes] = useState<InventoryLot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLote, setEditingLote] = useState<InventoryLot | null>(null);
  const [movementLote, setMovementLote] = useState<InventoryLot | null>(null);

  function load() {
    setIsLoading(true);
    fetchLotes(supply.id)
      .then(setLotes)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los lotes')))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supply.id]);

  function handleLoteSaved(saved: InventoryLot) {
    setLotes((prev) => {
      const exists = prev.some((l) => l.id === saved.id);
      return exists ? prev.map((l) => (l.id === saved.id ? saved : l)) : [...prev, saved];
    });
    if (saved.supply) {
      onSupplyChanged({ id: supply.id, currentStock: saved.supply.currentStock, status: saved.supply.status });
    }
    setShowForm(false);
    setEditingLote(null);
  }

  return (
    <Modal title={`Lotes — ${supply.name}`} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Stock total: <span className="font-semibold text-slate-700">{supply.currentStock ?? 0}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingLote(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo lote
          </button>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!isLoading && lotes.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Este insumo todavía no tiene lotes registrados.
          </p>
        )}

        {lotes.length > 0 && (
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full min-w-140 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Lote</th>
                  <th className="px-3 py-2">Vencimiento</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lotes.map((lote) => (
                  <tr key={lote.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {lote.lotNumber}
                      {lote.manufacturer && <p className="text-xs text-slate-400">{lote.manufacturer}</p>}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {lote.expirationDate ? lote.expirationDate.slice(0, 10) : 'Sin vencimiento'}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{lote.currentQuantity}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${EXPIRATION_BADGE[lote.expirationStatus]}`}>
                        {lote.expirationStatusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setMovementLote(lote)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Movimiento
                        </button>
                        <button
                          type="button"
                          aria-label={`Editar lote ${lote.lotNumber}`}
                          onClick={() => {
                            setEditingLote(lote);
                            setShowForm(true);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <LoteFormModal
          supplyId={supply.id}
          lote={editingLote}
          onClose={() => {
            setShowForm(false);
            setEditingLote(null);
          }}
          onSaved={handleLoteSaved}
        />
      )}

      {movementLote && (
        <MovimientoModal
          supplyId={supply.id}
          lote={movementLote}
          onClose={() => setMovementLote(null)}
          onSaved={({ lot, supply: updatedSupply }) => {
            setLotes((prev) => prev.map((l) => (l.id === lot.id ? lot : l)));
            onSupplyChanged({ id: supply.id, currentStock: updatedSupply.currentStock, status: updatedSupply.status });
            setMovementLote(null);
          }}
        />
      )}
    </Modal>
  );
}
