import { useEffect, useState } from 'react';
import {
  fetchAllPrevisiones,
  createPrevision,
  updatePrevision,
  deletePrevision,
  type Prevision,
} from '../../api/catalogs';
import { getErrorMessage } from '../../api/client';
import { PlusIcon, TrashIcon } from '../../components/icons';

export function PrevisionesTab() {
  const [previsiones, setPrevisiones] = useState<Prevision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchAllPrevisiones()
      .then(setPrevisiones)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar las previsiones')))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createPrevision({ name: newName.trim() });
      setPrevisiones((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la previsión'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(prevision: Prevision) {
    setBusyId(prevision.id);
    setError(null);
    try {
      const updated = await updatePrevision(prevision.id, { active: !prevision.active });
      setPrevisiones((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la previsión'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(prevision: Prevision) {
    if (!window.confirm(`¿Eliminar la previsión "${prevision.name}"?`)) return;
    setBusyId(prevision.id);
    setError(null);
    try {
      await deletePrevision(prevision.id);
      setPrevisiones((prev) => prev.filter((p) => p.id !== prevision.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la previsión'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Las previsiones son sólo informativas dentro del presupuesto (Fonasa, Isapre, Particular, etc.) — no aplican descuento.
      </p>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500">Nombre</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Ej: Fonasa, Isapre, Particular..."
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
        {!isLoading && previsiones.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Aún no hay previsiones.</p>
        )}
        {previsiones.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previsiones.map((p) => (
                <tr key={p.id} className={!p.active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => handleToggleActive(p)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                        p.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {p.active ? 'Activa' : 'Desactivada'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => handleDelete(p)}
                      aria-label={`Eliminar ${p.name}`}
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
