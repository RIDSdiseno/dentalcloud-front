import { useEffect, useState } from 'react';
import { fetchSucursales, type Sucursal } from '../../api/catalogs';
import { getErrorMessage } from '../../api/client';
import {
  fetchInsumos,
  fetchAlertas,
  archiveInsumo,
  INVENTORY_CATEGORIES,
  type InventorySupply,
  type InventoryAlerts,
  type InventorySupplyStatus,
} from '../../api/inventory';
import { formatCLP } from '../../utils/treatmentStatus';
import { BoxIcon, PlusIcon, EditIcon, TrashIcon } from '../../components/icons';
import { InsumoFormModal } from './InsumoFormModal';
import { LotesModal } from './LotesModal';

const STATUS_OPTIONS: { value: InventorySupplyStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'LOW_STOCK', label: 'Bajo stock' },
  { value: 'OUT_OF_STOCK', label: 'Sin stock' },
  { value: 'ARCHIVED', label: 'Archivado' },
];

const STATUS_BADGE: Record<InventorySupplyStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  LOW_STOCK: 'bg-amber-50 text-amber-700',
  OUT_OF_STOCK: 'bg-red-50 text-red-700',
  ARCHIVED: 'bg-slate-100 text-slate-500',
};

const STATUS_LABEL: Record<InventorySupplyStatus, string> = {
  ACTIVE: 'Activo',
  LOW_STOCK: 'Bajo stock',
  OUT_OF_STOCK: 'Sin stock',
  ARCHIVED: 'Archivado',
};

export function InventarioTab() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [insumos, setInsumos] = useState<InventorySupply[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlerts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState<InventorySupplyStatus | ''>('');
  const [sucursalId, setSucursalId] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventorySupply | null>(null);
  const [lotesFor, setLotesFor] = useState<InventorySupply | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchSucursales()
      .then(setSucursales)
      .catch(() => undefined);
  }, []);

  // Debounce corto porque, a diferencia de un filtro local, cada búsqueda
  // termina pegándole a Dental-Demo-Back vía federación (ver
  // TreatmentPlanFormModal's lotSearchQuery para el mismo criterio).
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const filters = {
      search: search || undefined,
      category: category || undefined,
      supplier: supplier || undefined,
      status: status || undefined,
      sucursalId: sucursalId || undefined,
    };
    Promise.all([fetchInsumos(filters), fetchAlertas(sucursalId || undefined)])
      .then(([items, alertsData]) => {
        setInsumos(items);
        setAlerts(alertsData);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el inventario')))
      .finally(() => setIsLoading(false));
  }, [search, category, supplier, status, sucursalId]);

  function handleSaved(saved: InventorySupply) {
    setInsumos((prev) => {
      const exists = prev.some((i) => i.id === saved.id);
      return exists ? prev.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  }

  function handleSupplyPatched(patch: Partial<InventorySupply> & { id: string }) {
    setInsumos((prev) => prev.map((i) => (i.id === patch.id ? { ...i, ...patch } : i)));
    setLotesFor((prev) => (prev && prev.id === patch.id ? { ...prev, ...patch } : prev));
  }

  async function handleArchive(insumo: InventorySupply) {
    if (!window.confirm(`¿Archivar "${insumo.name}"? Deja de contar como stock activo.`)) return;
    setBusyId(insumo.id);
    setError(null);
    try {
      const updated = await archiveInsumo(insumo.id);
      setInsumos((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo archivar el insumo'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500">Insumos, lotes y stock — administrado en Dental-Demo-Back.</p>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo insumo
        </button>
      </div>

      {alerts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-400">Lotes vencidos</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{alerts.expiredLots}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-400">Lotes por vencer</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{alerts.expiringLots}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-400">Sin stock</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{alerts.suppliesWithoutStock}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-400">Bajo stock</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{alerts.lowStockSupplies}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nombre/proveedor..."
          className="min-w-50 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
        >
          <option value="">Categoría</option>
          {INVENTORY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="Proveedor"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as InventorySupplyStatus | '')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {sucursales.length > 1 && (
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          >
            <option value="">Todas las sedes</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {!isLoading && insumos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <BoxIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500">Aún no hay insumos en el inventario.</p>
          </div>
        )}

        {insumos.length > 0 && (
          <table className="w-full min-w-176 text-left text-sm">
            <thead className="bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Sede</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Costo total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {insumos.map((insumo) => (
                <tr key={insumo.id} className={`hover:bg-slate-50 ${insumo.status === 'ARCHIVED' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{insumo.name}</td>
                  <td className="px-4 py-3 text-slate-500">{insumo.category ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{insumo.location?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{insumo.supplier ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {insumo.currentStock ?? 0}
                    {insumo.minimumStock != null && <span className="text-xs text-slate-400"> / mín. {insumo.minimumStock}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{insumo.totalCost != null ? formatCLP(insumo.totalCost) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[insumo.status]}`}>
                      {STATUS_LABEL[insumo.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setLotesFor(insumo)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Lotes{insumo.lotSummary ? ` (${insumo.lotSummary.totalLots})` : ''}
                      </button>
                      <button
                        type="button"
                        aria-label={`Editar ${insumo.name}`}
                        onClick={() => {
                          setEditing(insumo);
                          setShowForm(true);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      {insumo.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          disabled={busyId === insumo.id}
                          aria-label={`Archivar ${insumo.name}`}
                          onClick={() => handleArchive(insumo)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <InsumoFormModal
          insumo={editing}
          sucursales={sucursales}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {lotesFor && <LotesModal supply={lotesFor} onClose={() => setLotesFor(null)} onSupplyChanged={handleSupplyPatched} />}
    </div>
  );
}
