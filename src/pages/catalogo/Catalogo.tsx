import { useEffect, useState } from 'react';
import { fetchAllPrestaciones, updatePrestacion, deletePrestacion, type Prestacion } from '../../api/catalogs';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatCLP } from '../../utils/treatmentStatus';
import { ClipboardIcon, EditIcon, PlusIcon, TrashIcon } from '../../components/icons';
import { FACIAL_ZONE_LABELS, type FacialZoneKey } from '../pacientes/facialZoneConfig';
import { PrestacionFormModal } from './PrestacionFormModal';

function zonesSummary(allowedZones: string[]): string {
  if (allowedZones.length === 0) return 'Todas las zonas';
  return allowedZones.map((z) => FACIAL_ZONE_LABELS[z as FacialZoneKey] ?? z).join(', ');
}

export default function Catalogo() {
  const { user } = useAuth();
  // Clínicas "ambas" también gestionan zonas faciales (dejando el campo vacío
  // en las prestaciones puramente dentales, sin restricción).
  const isEstetica = !!user?.clinicaTipo && user.clinicaTipo !== 'dental';
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prestacion | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllPrestaciones()
      .then(setPrestaciones)
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el catálogo')))
      .finally(() => setIsLoading(false));
  }, []);

  function handleSaved(saved: Prestacion) {
    setPrestaciones((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
    setShowForm(false);
    setEditing(null);
  }

  async function handleToggleActive(prestacion: Prestacion) {
    setBusyId(prestacion.id);
    setError(null);
    try {
      const updated = await updatePrestacion(prestacion.id, { active: !prestacion.active });
      setPrestaciones((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la prestación'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(prestacion: Prestacion) {
    if (!window.confirm(`¿Eliminar "${prestacion.name}" del catálogo?`)) return;
    setBusyId(prestacion.id);
    setError(null);
    try {
      await deletePrestacion(prestacion.id);
      setPrestaciones((prev) => prev.filter((p) => p.id !== prestacion.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la prestación'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Catálogo de prestaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            {prestaciones.length} {prestaciones.length === 1 ? 'prestación' : 'prestaciones'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" />
          Nueva prestación
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {!isLoading && prestaciones.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ClipboardIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500">Aún no hay prestaciones en el catálogo.</p>
          </div>
        )}

        {prestaciones.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Precio</th>
                {isEstetica && <th className="px-4 py-3">Zonas</th>}
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prestaciones.map((p) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.code ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCLP(p.basePrice)}</td>
                  {isEstetica && (
                    <td className="px-4 py-3 max-w-[260px] text-xs text-slate-500">{zonesSummary(p.allowedZones)}</td>
                  )}
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
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(p);
                          setShowForm(true);
                        }}
                        aria-label={`Editar ${p.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleDelete(p)}
                        aria-label={`Eliminar ${p.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <PrestacionFormModal
          prestacion={editing}
          isEstetica={isEstetica}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
