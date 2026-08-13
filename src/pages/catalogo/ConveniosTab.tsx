import { useEffect, useState } from 'react';
import {
  fetchAllConvenios,
  createConvenio,
  updateConvenio,
  deleteConvenio,
  type Convenio,
} from '../../api/catalogs';
import { getErrorMessage } from '../../api/client';
import { PlusIcon, TrashIcon } from '../../components/icons';

export function ConveniosTab() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newDiscount, setNewDiscount] = useState('0');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchAllConvenios()
      .then(setConvenios)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los convenios')))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createConvenio({ name: newName.trim(), discountPercent: Number(newDiscount) || 0 });
      setConvenios((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewDiscount('0');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el convenio'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(convenio: Convenio, patch: { name?: string; discountPercent?: number; active?: boolean }) {
    setBusyId(convenio.id);
    setError(null);
    try {
      const updated = await updateConvenio(convenio.id, patch);
      setConvenios((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el convenio'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(convenio: Convenio) {
    if (!window.confirm(`¿Eliminar el convenio "${convenio.name}"?`)) return;
    setBusyId(convenio.id);
    setError(null);
    try {
      await deleteConvenio(convenio.id);
      setConvenios((prev) => prev.filter((c) => c.id !== convenio.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el convenio'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Los convenios definen un descuento aplicado automáticamente al valor de las prestaciones en un presupuesto.
      </p>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500">Nombre</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Ej: Particular, Convenio Colmena..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <div className="w-32">
          <label className="text-xs font-medium text-slate-500">Descuento %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={newDiscount}
            onChange={(e) => setNewDiscount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
        {!isLoading && convenios.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Aún no hay convenios.</p>
        )}
        {convenios.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Descuento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {convenios.map((c) => (
                <tr key={c.id} className={!c.active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={c.discountPercent}
                        disabled={busyId === c.id}
                        onBlur={(e) => {
                          const value = Number(e.target.value) || 0;
                          if (value !== c.discountPercent) handleUpdate(c, { discountPercent: value });
                        }}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
                      />
                      <span className="text-slate-400">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => handleUpdate(c, { active: !c.active })}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                        c.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {c.active ? 'Activo' : 'Desactivado'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => handleDelete(c)}
                      aria-label={`Eliminar ${c.name}`}
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
