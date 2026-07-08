import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import {
  fetchObservations,
  createObservation,
  deleteObservation,
  type AdministrativeObservation,
} from '../../api/observations';
import { fetchUsers, type StaffUser } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { ChatIcon, TrashIcon } from '../../components/icons';

export function ObservacionesTab({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [professionals, setProfessionals] = useState<StaffUser[]>([]);
  const [professionalId, setProfessionalId] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [observations, setObservations] = useState<AdministrativeObservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) fetchUsers().then(setProfessionals).catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    setIsLoading(true);
    fetchObservations(patientId)
      .then(setObservations)
      .catch((err) => setListError(getErrorMessage(err, 'No se pudieron cargar las observaciones')))
      .finally(() => setIsLoading(false));
  }, [patientId]);

  async function handleSave() {
    if (!content.trim()) {
      setFormError('Escribe una observación');
      return;
    }
    setFormError(null);
    setIsSaving(true);
    try {
      const observation = await createObservation({
        patientId,
        professionalId: isAdmin && professionalId ? professionalId : undefined,
        content: content.trim(),
      });
      setObservations((prev) => [observation, ...prev]);
      setContent('');
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo guardar la observación'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('¿Eliminar esta observación?');
    if (!confirmed) return;
    try {
      await deleteObservation(id);
      setObservations((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setListError(getErrorMessage(err, 'No se pudo eliminar la observación'));
    }
  }

  const canDelete = (professionalId: string) => isAdmin || professionalId === user?.id;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ChatIcon className="h-5 w-5 text-brand-500" />
          Observaciones administrativas
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Fecha</label>
            <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {new Date().toLocaleDateString('es-CL')}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Realizado por</label>
            {isAdmin ? (
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              >
                <option value="">Yo mismo ({user?.name})</option>
                {professionals
                  .filter((p) => p.id !== user?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({roleLabel(p.role)})
                    </option>
                  ))}
              </select>
            ) : (
              <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{user?.name}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="obs-content" className="text-sm font-medium text-slate-700">
            Observación
          </label>
          <textarea
            id="obs-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Escribe una nota interna sobre el paciente..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        {formError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Guardando...' : 'Grabar'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">Historial</h3>

        {listError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{listError}</p>}

        {!isLoading && observations.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Este paciente no tiene observaciones registradas.</p>
        )}

        <div className="flex flex-col gap-3">
          {observations.map((obs) => (
            <div key={obs.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{obs.professional.name}</span> ·{' '}
                  {new Date(obs.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                {canDelete(obs.professionalId) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(obs.id)}
                    aria-label="Eliminar"
                    className="text-slate-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-700">{obs.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
