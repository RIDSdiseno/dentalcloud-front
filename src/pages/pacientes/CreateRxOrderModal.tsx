import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { fetchExamCatalog, createRxOrder, type ExamType } from '../../api/rx';
import { fetchSucursales, type Sucursal } from '../../api/catalogs';
import { fetchUsers, type StaffUser } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';

const PRIORITIES = ['Normal', 'Urgente'];

type CreateRxOrderModalProps = {
  patientId: string;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateRxOrderModal({ patientId, onClose, onCreated }: CreateRxOrderModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [professionals, setProfessionals] = useState<StaffUser[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<number[]>([]);
  const [sucursalId, setSucursalId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [prioridad, setPrioridad] = useState(PRIORITIES[0]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSucursales().then((data) => {
      setSucursales(data);
      setSucursalId((current) => current || data[0]?.id || '');
    });
    if (isAdmin) fetchUsers().then(setProfessionals).catch(() => undefined);
    fetchExamCatalog()
      .then((data) => setExamTypes(data.types))
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el catálogo de exámenes')))
      .finally(() => setIsLoadingCatalog(false));
  }, [isAdmin]);

  function toggleExam(id: number) {
    setSelectedExamIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!sucursalId) {
      setError('Selecciona una sucursal');
      return;
    }
    if (selectedExamIds.length === 0) {
      setError('Selecciona al menos un examen');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createRxOrder({
        patientId,
        sucursalId,
        professionalId: isAdmin && professionalId ? professionalId : undefined,
        diagnostico: diagnostico || undefined,
        observaciones: observaciones || undefined,
        prioridad,
        examenes: selectedExamIds.map((kindId) => ({ kindId })),
      });
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la orden'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Crear orden Rx" onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Sucursal</label>
            <select
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className="text-sm font-medium text-slate-700">Odontólogo</label>
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
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Exámenes</label>
          {isLoadingCatalog ? (
            <p className="mt-1 text-sm text-slate-400">Cargando catálogo...</p>
          ) : (
            <div className="mt-1 grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
              {examTypes.map((exam) => (
                <label key={exam.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedExamIds.includes(exam.id)}
                    onChange={() => toggleExam(exam.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {exam.descripcion}
                </label>
              ))}
              {examTypes.length === 0 && <p className="text-sm text-slate-400">No hay exámenes disponibles.</p>}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="rx-diagnostico" className="text-sm font-medium text-slate-700">
            Diagnóstico
          </label>
          <input
            id="rx-diagnostico"
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label htmlFor="rx-observaciones" className="text-sm font-medium text-slate-700">
            Observaciones
          </label>
          <textarea
            id="rx-observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
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
            disabled={isSubmitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Creando...' : 'Crear orden'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
