import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import type { Sucursal } from '../../api/catalogs';
import {
  createInsumo,
  updateInsumo,
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  CONSULTING_ROOMS,
  type InventorySupply,
} from '../../api/inventory';

type InsumoFormModalProps = {
  insumo: InventorySupply | null;
  sucursales: Sucursal[];
  onClose: () => void;
  onSaved: (insumo: InventorySupply) => void;
};

// La sede que devuelve Dental-Demo-Back viene con su propio id (Location.id
// del otro sistema), no el sucursalId nativo de esta plataforma — se
// matchea por nombre para preseleccionarla al editar. Si no matchea (nombres
// distintos, o la sucursal se renombró de un lado sin el otro), se deja sin
// preseleccionar y el admin elige de nuevo antes de guardar.
function matchSucursalByName(sucursales: Sucursal[], locationName: string | undefined | null): string {
  if (!locationName) return '';
  const found = sucursales.find((s) => s.name.trim().toLowerCase() === locationName.trim().toLowerCase());
  return found?.id ?? '';
}

function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function InsumoFormModal({ insumo, sucursales, onClose, onSaved }: InsumoFormModalProps) {
  const [name, setName] = useState(insumo?.name ?? '');
  const [sucursalId, setSucursalId] = useState(matchSucursalByName(sucursales, insumo?.location?.name));
  const [consultingRoom, setConsultingRoom] = useState(insumo?.consultingRoom ?? '');
  const [category, setCategory] = useState(insumo?.category ?? '');
  const [supplier, setSupplier] = useState(insumo?.supplier ?? '');
  const [description, setDescription] = useState(insumo?.description ?? '');
  const [purchaseDate, setPurchaseDate] = useState(insumo?.purchaseDate ? insumo.purchaseDate.slice(0, 10) : todayInputValue());
  const [unit, setUnit] = useState(insumo?.unit ?? '');
  const [quantity, setQuantity] = useState(insumo?.quantity != null ? String(insumo.quantity) : '');
  const [unitCost, setUnitCost] = useState(insumo?.unitCost != null ? String(insumo.unitCost) : '');
  const [totalCost, setTotalCost] = useState(insumo?.totalCost != null ? String(insumo.totalCost) : '');
  const [totalCostTouched, setTotalCostTouched] = useState(false);
  const [minimumStock, setMinimumStock] = useState(insumo?.minimumStock != null ? String(insumo.minimumStock) : '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Igual que en Dental-Demo-Back (buildSupplyPayload): mientras el usuario no
  // haya escrito un total a mano, se recalcula solo a partir de cantidad ×
  // costo unitario.
  function handleQuantityOrCostChange(nextQuantity: string, nextUnitCost: string) {
    if (!totalCostTouched) {
      const q = Number(nextQuantity);
      const c = Number(nextUnitCost);
      if (nextQuantity && nextUnitCost && Number.isFinite(q) && Number.isFinite(c)) {
        setTotalCost(String(Math.round(q * c)));
      }
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (sucursales.length > 0 && !sucursalId) {
      setError('Selecciona una sede');
      return;
    }
    if (quantity && !Number.isFinite(Number(quantity))) {
      setError('Cantidad comprada inválida');
      return;
    }
    if (unitCost && !Number.isFinite(Number(unitCost))) {
      setError('Costo unitario inválido');
      return;
    }
    if (totalCost && !Number.isFinite(Number(totalCost))) {
      setError('Costo total inválido');
      return;
    }
    if (minimumStock && !Number.isFinite(Number(minimumStock))) {
      setError('Stock mínimo inválido');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        sucursalId: sucursalId || undefined,
        name: name.trim(),
        category: category || undefined,
        supplier: supplier || undefined,
        description: description || undefined,
        purchaseDate: purchaseDate || undefined,
        quantity: quantity ? Number(quantity) : undefined,
        unit: unit || undefined,
        unitCost: unitCost ? Math.round(Number(unitCost)) : undefined,
        totalCost: totalCost ? Math.round(Number(totalCost)) : undefined,
        minimumStock: minimumStock ? Number(minimumStock) : undefined,
        consultingRoom: consultingRoom || null,
      };
      const saved = insumo ? await updateInsumo(insumo.id, payload) : await createInsumo(payload);
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el insumo'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={insumo ? 'Editar insumo' : 'Nuevo insumo'} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4">
        <p className="-mt-2 text-xs text-slate-400">
          Si ingresas cantidad y costo unitario, el total se calcula automáticamente.
        </p>

        <div>
          <label className="text-sm font-medium text-slate-700">Nombre del insumo</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Ácido Hialurónico"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Sede {sucursales.length > 0 && <span className="text-red-500">*</span>}
          </label>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          >
            <option value="">Selecciona una sede</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Consultorio</label>
            <select
              value={consultingRoom}
              onChange={(e) => setConsultingRoom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">Sin consultorio asignado</option>
              {CONSULTING_ROOMS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">Sin categoría</option>
              {INVENTORY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Proveedor</label>
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Fecha de compra</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Unidad</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">—</option>
              {INVENTORY_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Cantidad comprada</label>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                handleQuantityOrCostChange(e.target.value, unitCost);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Costo unitario</label>
            <input
              type="number"
              min={0}
              value={unitCost}
              onChange={(e) => {
                setUnitCost(e.target.value);
                handleQuantityOrCostChange(quantity, e.target.value);
              }}
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Costo total</label>
            <input
              type="number"
              min={0}
              value={totalCost}
              onChange={(e) => {
                setTotalCostTouched(true);
                setTotalCost(e.target.value);
              }}
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
            <p className="mt-0.5 text-xs text-slate-400">Puedes ingresarlo manualmente si no tienes costo unitario.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Stock actual</label>
            <input
              disabled
              value={insumo?.currentStock ?? 0}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none"
            />
            <p className="mt-0.5 text-xs text-slate-400">
              El stock actual se actualizará al registrar lotes o movimientos de inventario.
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Stock mínimo</label>
          <p className="mt-0.5 text-xs text-slate-400">Debajo de este número el insumo se marca "Bajo stock".</p>
          <input
            type="number"
            min={0}
            value={minimumStock}
            onChange={(e) => setMinimumStock(e.target.value)}
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
            {isSaving ? 'Guardando...' : 'Guardar insumo'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
