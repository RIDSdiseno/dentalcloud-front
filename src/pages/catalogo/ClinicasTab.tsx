import { useEffect, useState } from 'react';
import {
  fetchAllSucursales,
  createSucursal,
  updateSucursal,
  deleteSucursal,
  type Sucursal,
} from '../../api/catalogs';
import { getErrorMessage } from '../../api/client';
import { PlusIcon, TrashIcon } from '../../components/icons';

export function ClinicasTab() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchAllSucursales()
      .then(setSucursales)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar las clínicas')))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createSucursal({ name: newName.trim(), address: newAddress.trim() || undefined });
      setSucursales((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewAddress('');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la clínica'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRename(sucursal: Sucursal, name: string) {
    if (!name.trim() || name.trim() === sucursal.name) return;
    setBusyId(sucursal.id);
    setError(null);
    try {
      const updated = await updateSucursal(sucursal.id, { name: name.trim() });
      setSucursales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo renombrar la clínica'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(sucursal: Sucursal) {
    setBusyId(sucursal.id);
    setError(null);
    try {
      const updated = await updateSucursal(sucursal.id, { active: !sucursal.active });
      setSucursales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la clínica'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(sucursal: Sucursal) {
    if (!window.confirm(`¿Eliminar la clínica "${sucursal.name}"?`)) return;
    setBusyId(sucursal.id);
    setError(null);
    try {
      await deleteSucursal(sucursal.id);
      setSucursales((prev) => prev.filter((s) => s.id !== sucursal.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la clínica'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Las clínicas son las sedes físicas dentro de este holding. Cada presupuesto se asocia a una de ellas.
      </p>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500">Nombre</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Ej: Sede Providencia"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500">Dirección (opcional)</label>
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Ej: Av. Providencia 1234"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !newName.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusIcon className="h-4 w-4" />
          Agregar
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {!isLoading && sucursales.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Aún no hay clínicas registradas.</p>
        )}
        {sucursales.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sucursales.map((s) => (
                <tr key={s.id} className={!s.active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={s.name}
                      disabled={busyId === s.id}
                      onBlur={(e) => handleRename(s, e.target.value)}
                      className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-medium text-slate-800 outline-none hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/15"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.address ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => handleToggleActive(s)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                        s.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {s.active ? 'Activa' : 'Desactivada'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => handleDelete(s)}
                      aria-label={`Eliminar ${s.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
