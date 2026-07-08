import { useEffect, useMemo, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import {
  fetchEvolutions,
  createEvolution,
  updateEvolution,
  type Evolution,
  type EnabledFilter,
} from '../../api/evolutions';
import { fetchEvolutionTemplates } from '../../api/catalogs';
import type { EvolutionTemplate } from '../../api/catalogs';
import { fetchUsers, type StaffUser } from '../../api/users';
import { fetchPatientAppointments, type Appointment } from '../../api/appointments';
import type { Patient } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { formatLongDate, formatTime } from '../agenda/dateUtils';
import { NewAppointmentModal } from '../agenda/NewAppointmentModal';
import { Modal } from '../../components/Modal';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ActivityIcon, CalendarIcon, EyeIcon, EyeOffIcon, PrinterIcon } from '../../components/icons';

const STATUS_TABS: { key: EnabledFilter; label: string }[] = [
  { key: 'true', label: 'Habilitadas' },
  { key: 'false', label: 'Deshabilitadas' },
  { key: 'all', label: 'Todas' },
];

function isContentEmpty(html: string) {
  return !html || html.replace(/<[^>]*>/g, '').trim() === '';
}

function EvolutionCard({
  evolution,
  onToggle,
}: {
  evolution: Evolution;
  onToggle: (evolution: Evolution) => void;
}) {
  return (
    <div className={`rounded-xl border p-4 ${evolution.enabled ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{evolution.professional.name}</span>
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            {new Date(evolution.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onToggle(evolution)}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
        >
          {evolution.enabled ? (
            <>
              <EyeIcon className="h-3.5 w-3.5" /> Deshabilitar
            </>
          ) : (
            <>
              <EyeOffIcon className="h-3.5 w-3.5" /> Habilitar
            </>
          )}
        </button>
      </div>
      <div className="prose-sm text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: evolution.content }} />
    </div>
  );
}

export function EvolucionesTab({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [professionals, setProfessionals] = useState<StaffUser[]>([]);
  const [professionalId, setProfessionalId] = useState('');
  const [templates, setTemplates] = useState<EvolutionTemplate[]>([]);
  const [section, setSection] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [filterProfessionalId, setFilterProfessionalId] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnabledFilter>('true');
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [showNewControl, setShowNewControl] = useState(false);
  const [showUpcomingControls, setShowUpcomingControls] = useState(false);
  const [upcomingControls, setUpcomingControls] = useState<Appointment[]>([]);
  const [isLoadingControls, setIsLoadingControls] = useState(false);

  useEffect(() => {
    if (isAdmin) fetchUsers().then(setProfessionals).catch(() => undefined);
    fetchEvolutionTemplates().then(setTemplates).catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    setIsLoading(true);
    fetchEvolutions(patient.id, { professionalId: filterProfessionalId || undefined, enabled: statusFilter })
      .then(setEvolutions)
      .catch((err) => setListError(getErrorMessage(err, 'No se pudieron cargar las evoluciones')))
      .finally(() => setIsLoading(false));
  }, [patient.id, filterProfessionalId, statusFilter]);

  const sections = useMemo(() => {
    const set = new Set(templates.map((t) => t.section).filter(Boolean) as string[]);
    return Array.from(set);
  }, [templates]);

  const filteredTemplates = useMemo(
    () => templates.filter((t) => !section || t.section === section),
    [templates, section]
  );

  function insertHtml(html: string) {
    setContent((prev) => (isContentEmpty(prev) ? html : `${prev}${html}`));
  }

  function handleGenerarAlta() {
    const altaTemplate =
      templates.find((t) => t.section === 'Alta') ??
      templates.find((t) => t.name.toLowerCase().includes('alta'));
    insertHtml(
      altaTemplate?.content ??
        '<p>Paciente finaliza tratamiento en buenas condiciones clínicas. Se indica control periódico.</p>'
    );
  }

  async function handleSave() {
    if (isContentEmpty(content)) {
      setFormError('Escribe el contenido de la evolución');
      return;
    }
    setFormError(null);
    setIsSaving(true);
    try {
      const evolution = await createEvolution({
        patientId: patient.id,
        professionalId: isAdmin && professionalId ? professionalId : undefined,
        content,
      });
      setContent('');
      setShowPreview(false);
      if (statusFilter !== 'false') {
        setEvolutions((prev) => [evolution, ...prev]);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo guardar la evolución'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(evolution: Evolution) {
    try {
      const updated = await updateEvolution(evolution.id, { enabled: !evolution.enabled });
      if (statusFilter === 'all') {
        setEvolutions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      } else {
        setEvolutions((prev) => prev.filter((e) => e.id !== updated.id));
      }
    } catch (err) {
      setListError(getErrorMessage(err, 'No se pudo actualizar la evolución'));
    }
  }

  async function handleOpenUpcomingControls() {
    setShowUpcomingControls(true);
    setIsLoadingControls(true);
    try {
      const appointments = await fetchPatientAppointments(patient.id);
      const now = new Date();
      const upcoming = appointments
        .filter((a) => a.type === 'control' && a.status !== 'cancelada' && new Date(a.startAt) > now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      setUpcomingControls(upcoming);
    } catch {
      setUpcomingControls([]);
    } finally {
      setIsLoadingControls(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowNewControl(true)}
            className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          >
            Crear próximo control
          </button>
          <button
            type="button"
            onClick={handleOpenUpcomingControls}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Próximos controles
          </button>
        </div>

        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ActivityIcon className="h-5 w-5 text-brand-500" />
          Crear nueva evolución
        </h2>

        {isAdmin && (
          <div>
            <label className="text-sm font-medium text-slate-700">Profesional</label>
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
          <label className="text-sm font-medium text-slate-700">Contenido de la evolución</label>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">Todas las secciones</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) insertHtml(templates.find((t) => t.id === e.target.value)?.content ?? '');
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">Predefinidas...</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleGenerarAlta}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Generar alta
            </button>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              disabled={isContentEmpty(content)}
              className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showPreview ? 'Volver a editar' : 'Previsualizar'}
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="min-h-[10rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        ) : (
          <RichTextEditor value={content} onChange={setContent} />
        )}

        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
        {saveSuccess && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">Evolución guardada correctamente.</p>}

        <div className="flex justify-end">
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

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
        <div className="flex items-center gap-2">
          <select
            value={filterProfessionalId}
            onChange={(e) => setFilterProfessionalId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          >
            <option value="">Filtrar por profesional: TODOS</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {!isAdmin && user && <option value={user.id}>{user.name}</option>}
          </select>
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Imprimir"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
          >
            <PrinterIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`flex-1 rounded-full px-2 py-1.5 transition-colors ${
                statusFilter === tab.key ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {listError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{listError}</p>}

        <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto">
          {!isLoading && evolutions.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No hay evoluciones registradas.</p>
          )}
          {evolutions.map((evolution) => (
            <EvolutionCard key={evolution.id} evolution={evolution} onToggle={handleToggle} />
          ))}
        </div>
      </div>

      {showNewControl && (
        <NewAppointmentModal
          defaultDate={new Date()}
          initialPatient={patient}
          appointmentType="control"
          onClose={() => setShowNewControl(false)}
          onCreated={() => setShowNewControl(false)}
        />
      )}

      {showUpcomingControls && (
        <Modal title="Próximos controles" onClose={() => setShowUpcomingControls(false)}>
          {isLoadingControls ? (
            <p className="py-6 text-center text-sm text-slate-400">Cargando...</p>
          ) : upcomingControls.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Este paciente no tiene controles agendados.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingControls.map((a) => (
                <div key={a.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-slate-700">{formatLongDate(new Date(a.startAt))}</p>
                  <p className="text-slate-500">
                    {formatTime(new Date(a.startAt))} · {a.professional?.name ?? 'Sin profesional'} ·{' '}
                    {a.chair?.name || `Sillón ${a.chair?.number}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
