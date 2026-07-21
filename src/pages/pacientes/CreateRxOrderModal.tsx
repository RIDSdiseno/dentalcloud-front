import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import {
  fetchExamCatalog,
  createRxOrder,
  sendRxOrder,
  type ExamGroup,
  type ExamType,
} from '../../api/rx';
import { fetchSucursales, type Sucursal } from '../../api/catalogs';
import { fetchUsers, type StaffUser } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { formatRut } from '../../utils/rut';
import type { Patient } from '../../api/patients';
import { BulletListIcon, EditIcon, InfoCircleIcon } from '../../components/icons';

const PRIORITIES = ['Normal', 'Urgente'];

function normalizeKey(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function SectionCard({ icon: Icon, title, children }: { icon: typeof InfoCircleIcon; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-brand-700 uppercase">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

const selectClassName =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15';

function ExamCatalogPicker({
  examTypes,
  examGroups,
  selectedExamIds,
  onToggle,
  isLoading,
}: {
  examTypes: ExamType[];
  examGroups: ExamGroup[];
  selectedExamIds: number[];
  onToggle: (id: number) => void;
  isLoading: boolean;
}) {
  const tabs = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const g of examGroups) {
      if (!seen.has(g.tab)) {
        seen.add(g.tab);
        result.push(g.tab);
      }
    }
    return result;
  }, [examGroups]);

  const [activeTab, setActiveTab] = useState('');
  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) setActiveTab(tabs[0]);
  }, [tabs, activeTab]);

  if (isLoading) return <p className="text-sm text-slate-400">Cargando catálogo de exámenes...</p>;
  if (examTypes.length === 0) {
    return <p className="text-sm text-slate-400">No hay exámenes disponibles para tu clínica todavía.</p>;
  }

  const groupsForTab = examGroups.filter((g) => g.tab === activeTab);
  const columns = groupsForTab.length > 0 ? groupsForTab : [{ id: 0, nombre: 'Exámenes', tab: activeTab }];

  function examsForColumn(group: ExamGroup) {
    if (groupsForTab.length === 0) return examTypes;
    const key = normalizeKey(group.nombre);
    return examTypes.filter((t) => normalizeKey(t.grupo ?? t.group) === key);
  }

  return (
    <div>
      {tabs.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${tabs.length > 1 ? 'mt-3' : ''}`}>
        {columns.map((group) => {
          const exams = examsForColumn(group);
          return (
            <div key={group.id} className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <InfoCircleIcon className="h-3.5 w-3.5" />
                {group.nombre}
              </p>
              <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
                {exams.map((exam) => (
                  <label key={exam.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedExamIds.includes(exam.id)}
                      onChange={() => onToggle(exam.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    {exam.descripcion}
                  </label>
                ))}
                {exams.length === 0 && <p className="text-xs text-slate-400">Sin exámenes en esta categoría.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CreateRxOrderModalProps = {
  patient: Patient;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateRxOrderModal({ patient, onClose, onCreated }: CreateRxOrderModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [examGroups, setExamGroups] = useState<ExamGroup[]>([]);
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
  const [submitMode, setSubmitMode] = useState<'draft' | 'send' | null>(null);

  const connectedSucursales = useMemo(() => sucursales.filter((s) => !!s.dimageClinicId), [sucursales]);

  useEffect(() => {
    fetchSucursales().then((data) => {
      setSucursales(data);
      const connected = data.filter((s) => !!s.dimageClinicId);
      setSucursalId((current) => current || connected[0]?.id || '');
    });
    if (isAdmin) fetchUsers().then(setProfessionals).catch(() => undefined);
    fetchExamCatalog()
      .then((data) => {
        setExamTypes(data.types);
        setExamGroups(data.groups);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el catálogo de exámenes')))
      .finally(() => setIsLoadingCatalog(false));
  }, [isAdmin]);

  function toggleExam(id: number) {
    setSelectedExamIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  async function handleSubmit(mode: 'draft' | 'send') {
    if (!sucursalId) {
      setError('Selecciona una clínica conectada a Rx');
      return;
    }
    if (!diagnostico.trim()) {
      setError('El diagnóstico clínico es requerido');
      return;
    }
    if (selectedExamIds.length === 0) {
      setError('Selecciona al menos un examen');
      return;
    }
    setError(null);
    setSubmitMode(mode);
    try {
      const order = await createRxOrder({
        patientId: patient.id,
        sucursalId,
        professionalId: isAdmin && professionalId ? professionalId : undefined,
        diagnostico,
        observaciones: observaciones || undefined,
        prioridad,
        examenes: selectedExamIds.map((kindId) => ({ kindId })),
      });
      if (mode === 'send') {
        await sendRxOrder(order.id);
      }
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la orden'));
    } finally {
      setSubmitMode(null);
    }
  }

  const isSubmitting = submitMode !== null;

  return (
    <Modal title="Crear orden Rx" onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex flex-col gap-4">
        <SectionCard icon={InfoCircleIcon} title="Datos de la orden">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel required>Clínica</FieldLabel>
              <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={selectClassName}>
                {connectedSucursales.length === 0 && <option value="">Sin clínicas conectadas a Rx</option>}
                {connectedSucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel required>Odontólogo</FieldLabel>
              {isAdmin ? (
                <select
                  value={professionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                  className={selectClassName}
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
                <input
                  value={`${user?.name ?? ''} (yo mismo)`}
                  disabled
                  className={`${selectClassName} cursor-not-allowed bg-slate-100 text-slate-500`}
                />
              )}
            </div>

            <div className="sm:col-span-2">
              <FieldLabel required>Paciente</FieldLabel>
              <input
                value={`${patient.firstName} ${patient.lastName} · ${formatRut(patient.rut)}`}
                disabled
                className={`${selectClassName} cursor-not-allowed bg-slate-100 text-slate-500`}
              />
            </div>

            <div>
              <FieldLabel required>Prioridad</FieldLabel>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={selectClassName}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={EditIcon} title="Diagnóstico clínico">
          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel required>Diagnóstico</FieldLabel>
              <textarea
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                rows={3}
                placeholder="Describe el diagnóstico clínico..."
                className={`${selectClassName} resize-y`}
              />
            </div>
            <div>
              <FieldLabel>Observaciones</FieldLabel>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Observaciones adicionales..."
                className={`${selectClassName} resize-y`}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={BulletListIcon} title="Tipos de examen">
          <ExamCatalogPicker
            examTypes={examTypes}
            examGroups={examGroups}
            selectedExamIds={selectedExamIds}
            onToggle={toggleExam}
            isLoading={isLoadingCatalog}
          />
        </SectionCard>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitMode === 'draft' ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('send')}
            disabled={isSubmitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitMode === 'send' ? 'Enviando...' : 'Enviar a radiólogo'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
