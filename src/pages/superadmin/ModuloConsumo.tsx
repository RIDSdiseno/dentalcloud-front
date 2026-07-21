import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchAllAppointments,
  fetchAllDocuments,
  fetchAllEvolutions,
  fetchAllLedgerMovements,
  fetchAllObservations,
  fetchAllPatients,
  fetchAllTreatmentPlans,
  fetchClinicas,
  updateClinica,
  type AdminPatient,
  type Clinica,
  type ClinicaModuleKey,
} from '../../api/clinicas';
import { getErrorMessage } from '../../api/client';
import { formatCLP } from '../../utils/treatmentStatus';
import { formatRut } from '../../utils/rut';
import { ArrowLeftIcon, SearchIcon, StarIcon } from '../../components/icons';

function formatDateTime(value: string) {
  return new Date(value).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isWithinLastDays(value: string, days: number) {
  return new Date(value).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

type ModuleRouteKey = ClinicaModuleKey | 'rx';

const MODULE_META: Record<ModuleRouteKey, { label: string; description: string }> = {
  pacientes: { label: 'Pacientes', description: 'Fichas de pacientes registradas por clínica y su estado de consentimiento.' },
  agenda: { label: 'Agenda y citas', description: 'Citas agendadas por clínica.' },
  tratamientos: { label: 'Planes de tratamiento', description: 'Presupuestos creados y monto total presupuestado.' },
  documentosClinicos: { label: 'Documentos clínicos', description: 'Documentos clínicos subidos por clínica.' },
  cartola: { label: 'Cartola', description: 'Movimientos contables registrados y saldo neto (haber - debe).' },
  evoluciones: { label: 'Evoluciones', description: 'Evoluciones clínicas registradas por clínica.' },
  observaciones: { label: 'Observaciones', description: 'Observaciones administrativas registradas por clínica.' },
  consentimientos: { label: 'Consentimientos', description: 'Estado de los consentimientos informados de los pacientes.' },
  rx: { label: 'Módulo Rx', description: 'Integración con Dimage. Hoy usa credenciales globales, no hay consumo por clínica todavía.' },
};

function isValidModuleKey(key: string | undefined): key is ModuleRouteKey {
  return !!key && key in MODULE_META;
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-brand-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function BarList({
  title,
  rows,
  formatValue,
}: {
  title: string;
  rows: { key: string; label: string; value: number; crowned?: boolean }[];
  formatValue: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="mb-4 text-sm font-bold text-slate-700">{title}</p>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-3">
            <span className="flex w-36 shrink-0 items-center gap-1 truncate text-sm text-slate-600" title={row.label}>
              {row.crowned && <StarIcon className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
              <span className="truncate">{row.label}</span>
            </span>
            <div className="h-5 flex-1 rounded-full bg-slate-100">
              <div
                className="h-5 rounded-full bg-brand-600 transition-[width]"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-sm font-semibold text-slate-700">
              {formatValue(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailTable<T extends { id: string }>({
  title,
  rows,
  columns,
  searchPlaceholder,
  filterFn,
  emptyLabel,
}: {
  title: string;
  rows: T[];
  columns: { key: string; label: string; render: (row: T) => ReactNode }[];
  searchPlaceholder: string;
  filterFn: (row: T, term: string) => boolean;
  emptyLabel: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => filterFn(row, term));
  }, [rows, search, filterFn]);

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <p className="text-sm font-bold text-slate-700">{title}</p>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10"
          />
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs font-semibold tracking-wide text-slate-400 uppercase">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            {search ? 'Sin resultados para la búsqueda.' : emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}

const PATIENT_CONSENT_STYLES: Record<AdminPatient['privacyConsentStatus'], { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  firmado: { label: 'Firmado', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rechazado: { label: 'Rechazado', className: 'bg-red-50 text-red-700 ring-red-200' },
  expirado: { label: 'Expirado', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

function isPatientNotSent(patient: AdminPatient) {
  return !patient.privacyConsentSentAt && !patient.privacyConsentAt;
}

function withCrown<T extends { value: number }>(rows: T[]): (T & { crowned: boolean })[] {
  return rows.map((row, index) => ({
    ...row,
    crowned: index === 0 && row.value > 0 && row.value > (rows[1]?.value ?? -1),
  }));
}

function PatientConsentBadge({ patient }: { patient: AdminPatient }) {
  if (isPatientNotSent(patient)) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
        No enviado
      </span>
    );
  }
  const { label, className } = PATIENT_CONSENT_STYLES[patient.privacyConsentStatus];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>{label}</span>;
}

function useAdminList<T>(fetcher: () => Promise<T[]>): { rows: T[]; isLoading: boolean; error: string | null } {
  const [rows, setRows] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'No se pudo cargar la información'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rows, isLoading, error };
}

function DashboardShell({ error, children }: { error: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {children}
    </div>
  );
}

function PacientesDashboard({ clinicas }: { clinicas: Clinica[] }) {
  const { rows: patients, error } = useAdminList(fetchAllPatients);

  const metrics = useMemo(() => {
    const total = patients.length;
    const firmados = patients.filter((p) => p.privacyConsentStatus === 'firmado').length;
    const rechazados = patients.filter((p) => p.privacyConsentStatus === 'rechazado').length;
    const expirados = patients.filter((p) => p.privacyConsentStatus === 'expirado').length;
    const noEnviados = patients.filter(isPatientNotSent).length;
    const pendientesEnviados = Math.max(0, total - firmados - rechazados - expirados - noEnviados);
    const nuevos30d = patients.filter((p) => isWithinLastDays(p.createdAt, 30)).length;
    const firmadoPct = total > 0 ? Math.round((firmados / total) * 100) : 0;
    return { total, firmados, rechazados, expirados, noEnviados, pendientesEnviados, nuevos30d, firmadoPct };
  }, [patients]);

  const patientsPorClinicaRows = useMemo(
    () =>
      withCrown(
        [...clinicas]
          .map((c) => ({ key: c.id, label: c.name, value: c.patientsCount }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  const consentRatePorClinicaRows = useMemo(
    () =>
      withCrown(
        clinicas
          .filter((c) => c.patientsCount > 0)
          .map((c) => ({
            key: c.id,
            label: c.name,
            value: Math.round((c.consentStats.firmado / c.patientsCount) * 100),
          }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  return (
    <DashboardShell error={error}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total pacientes" value={String(metrics.total)} />
        <StatTile
          label="Consentimiento firmado"
          value={`${metrics.firmadoPct}%`}
          hint={`${metrics.firmados} de ${metrics.total}`}
        />
        <StatTile label="No enviados" value={String(metrics.noEnviados)} />
        <StatTile label="Pendientes de firma" value={String(metrics.pendientesEnviados)} />
        <StatTile label="Rechazados" value={String(metrics.rechazados)} />
        <StatTile label="Nuevos (30 días)" value={String(metrics.nuevos30d)} />
      </div>

      {clinicas.length > 1 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BarList title="Pacientes por clínica" rows={patientsPorClinicaRows} formatValue={(v) => String(v)} />
          <BarList
            title="% de consentimiento firmado por clínica"
            rows={consentRatePorClinicaRows}
            formatValue={(v) => `${v}%`}
          />
        </div>
      )}

      <DetailTable
        title="Pacientes por clínica"
        rows={patients}
        searchPlaceholder="Buscar por nombre, RUT o clínica..."
        emptyLabel="Aún no hay pacientes registrados."
        filterFn={(p, term) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) ||
          p.rut.toLowerCase().includes(term) ||
          p.clinicaName.toLowerCase().includes(term)
        }
        columns={[
          { key: 'clinica', label: 'Clínica', render: (p) => <span className="text-slate-500">{p.clinicaName}</span> },
          {
            key: 'paciente',
            label: 'Paciente',
            render: (p) => (
              <span className="font-medium text-slate-800">
                {p.firstName} {p.lastName}
              </span>
            ),
          },
          { key: 'rut', label: 'RUT', render: (p) => <span className="text-slate-500">{formatRut(p.rut)}</span> },
          { key: 'consentimiento', label: 'Consentimiento', render: (p) => <PatientConsentBadge patient={p} /> },
        ]}
      />
    </DashboardShell>
  );
}

function ConsentimientosDashboard({ clinicas }: { clinicas: Clinica[] }) {
  const { rows: allPatients, error } = useAdminList(fetchAllPatients);
  const sentPatients = useMemo(() => allPatients.filter((p) => !isPatientNotSent(p)), [allPatients]);

  const metrics = useMemo(() => {
    const enviados = sentPatients.length;
    const firmados = sentPatients.filter((p) => p.privacyConsentStatus === 'firmado').length;
    const rechazados = sentPatients.filter((p) => p.privacyConsentStatus === 'rechazado').length;
    const expirados = sentPatients.filter((p) => p.privacyConsentStatus === 'expirado').length;
    const tasaConversion = enviados > 0 ? Math.round((firmados / enviados) * 100) : 0;
    return { enviados, firmados, rechazados, expirados, tasaConversion };
  }, [sentPatients]);

  const consentRatePorClinicaRows = useMemo(
    () =>
      withCrown(
        clinicas
          .filter((c) => c.patientsCount > 0)
          .map((c) => ({
            key: c.id,
            label: c.name,
            value: Math.round((c.consentStats.firmado / c.patientsCount) * 100),
          }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  return (
    <DashboardShell error={error}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Enviados" value={String(metrics.enviados)} />
        <StatTile label="Firmados" value={String(metrics.firmados)} />
        <StatTile label="Rechazados" value={String(metrics.rechazados)} />
        <StatTile label="Tasa de conversión" value={`${metrics.tasaConversion}%`} hint="Firmados sobre enviados" />
      </div>

      {clinicas.length > 1 && (
        <BarList
          title="% de consentimiento firmado por clínica"
          rows={consentRatePorClinicaRows}
          formatValue={(v) => `${v}%`}
        />
      )}

      <DetailTable
        title="Consentimientos enviados"
        rows={sentPatients}
        searchPlaceholder="Buscar por nombre, RUT o clínica..."
        emptyLabel="Aún no se ha enviado ningún consentimiento."
        filterFn={(p, term) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) ||
          p.rut.toLowerCase().includes(term) ||
          p.clinicaName.toLowerCase().includes(term)
        }
        columns={[
          { key: 'clinica', label: 'Clínica', render: (p) => <span className="text-slate-500">{p.clinicaName}</span> },
          {
            key: 'paciente',
            label: 'Paciente',
            render: (p) => (
              <span className="font-medium text-slate-800">
                {p.firstName} {p.lastName}
              </span>
            ),
          },
          { key: 'estado', label: 'Estado', render: (p) => <PatientConsentBadge patient={p} /> },
          {
            key: 'fecha',
            label: 'Fecha',
            render: (p) => (
              <span className="text-slate-500">
                {formatDateTime(p.privacyConsentAt ?? p.privacyConsentSentAt ?? p.createdAt)}
              </span>
            ),
          },
        ]}
      />
    </DashboardShell>
  );
}

function AgendaDashboard({ clinicas }: { clinicas: Clinica[] }) {
  const { rows: appointments, error } = useAdminList(fetchAllAppointments);

  const metrics = useMemo(() => {
    const total = appointments.length;
    const canceladas = appointments.filter((a) => a.status === 'cancelada').length;
    const activas = total - canceladas;
    const nuevas30d = appointments.filter((a) => isWithinLastDays(a.startAt, 30)).length;
    return { total, activas, canceladas, nuevas30d };
  }, [appointments]);

  const citasPorClinicaRows = useMemo(
    () =>
      withCrown(
        [...clinicas]
          .map((c) => ({ key: c.id, label: c.name, value: c.appointmentsCount }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  return (
    <DashboardShell error={error}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total citas" value={String(metrics.total)} />
        <StatTile label="Activas" value={String(metrics.activas)} />
        <StatTile label="Canceladas" value={String(metrics.canceladas)} />
        <StatTile label="Últimos 30 días" value={String(metrics.nuevas30d)} />
      </div>

      {clinicas.length > 1 && (
        <BarList title="Citas por clínica" rows={citasPorClinicaRows} formatValue={(v) => String(v)} />
      )}

      <DetailTable
        title="Citas recientes"
        rows={appointments}
        searchPlaceholder="Buscar por paciente o clínica..."
        emptyLabel="Aún no hay citas registradas."
        filterFn={(a, term) => a.patientName.toLowerCase().includes(term) || a.clinicaName.toLowerCase().includes(term)}
        columns={[
          { key: 'clinica', label: 'Clínica', render: (a) => <span className="text-slate-500">{a.clinicaName}</span> },
          { key: 'paciente', label: 'Paciente', render: (a) => <span className="font-medium text-slate-800">{a.patientName}</span> },
          { key: 'fecha', label: 'Fecha', render: (a) => <span className="text-slate-500">{formatDateTime(a.startAt)}</span> },
          { key: 'tipo', label: 'Tipo', render: (a) => <span className="text-slate-500 capitalize">{a.type}</span> },
          {
            key: 'estado',
            label: 'Estado',
            render: (a) => (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                  a.status === 'cancelada'
                    ? 'bg-red-50 text-red-700 ring-red-200'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                }`}
              >
                {a.status === 'cancelada' ? 'Cancelada' : 'Activa'}
              </span>
            ),
          },
        ]}
      />
    </DashboardShell>
  );
}

const TREATMENT_STATUS_LABELS: Record<string, string> = {
  sin_iniciar: 'Sin iniciar',
  en_tratamiento: 'En tratamiento',
  terminado: 'Terminado',
};

function TratamientosDashboard({ clinicas }: { clinicas: Clinica[] }) {
  const { rows: plans, error } = useAdminList(fetchAllTreatmentPlans);

  const metrics = useMemo(() => {
    const total = plans.length;
    const montoTotal = plans.reduce((sum, p) => sum + p.amount, 0);
    const enTratamiento = plans.filter((p) => p.status === 'en_tratamiento').length;
    const ticketPromedio = total > 0 ? Math.round(montoTotal / total) : 0;
    return { total, montoTotal, enTratamiento, ticketPromedio };
  }, [plans]);

  const planesPorClinicaRows = useMemo(
    () =>
      withCrown(
        [...clinicas]
          .map((c) => ({ key: c.id, label: c.name, value: c.treatmentPlansCount }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  const montoPorClinicaRows = useMemo(
    () =>
      withCrown(
        [...clinicas]
          .map((c) => ({ key: c.id, label: c.name, value: c.treatmentPlansAmount }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  return (
    <DashboardShell error={error}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total presupuestos" value={String(metrics.total)} />
        <StatTile label="Monto total" value={formatCLP(metrics.montoTotal)} />
        <StatTile label="Ticket promedio" value={formatCLP(metrics.ticketPromedio)} />
        <StatTile label="En tratamiento" value={String(metrics.enTratamiento)} />
      </div>

      {clinicas.length > 1 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BarList title="Presupuestos por clínica" rows={planesPorClinicaRows} formatValue={(v) => String(v)} />
          <BarList title="Monto presupuestado por clínica" rows={montoPorClinicaRows} formatValue={(v) => formatCLP(v)} />
        </div>
      )}

      <DetailTable
        title="Presupuestos recientes"
        rows={plans}
        searchPlaceholder="Buscar por paciente o clínica..."
        emptyLabel="Aún no hay presupuestos registrados."
        filterFn={(p, term) => p.patientName.toLowerCase().includes(term) || p.clinicaName.toLowerCase().includes(term)}
        columns={[
          { key: 'clinica', label: 'Clínica', render: (p) => <span className="text-slate-500">{p.clinicaName}</span> },
          { key: 'paciente', label: 'Paciente', render: (p) => <span className="font-medium text-slate-800">{p.patientName}</span> },
          { key: 'nombre', label: 'Plan', render: (p) => <span className="text-slate-500">{p.name ?? '—'}</span> },
          {
            key: 'estado',
            label: 'Estado',
            render: (p) => <span className="text-slate-500">{TREATMENT_STATUS_LABELS[p.status] ?? p.status}</span>,
          },
          { key: 'monto', label: 'Monto', render: (p) => <span className="font-medium text-slate-700">{formatCLP(p.amount)}</span> },
          { key: 'fecha', label: 'Fecha', render: (p) => <span className="text-slate-500">{formatDateTime(p.createdAt)}</span> },
        ]}
      />
    </DashboardShell>
  );
}

function DocumentosDashboard({ clinicas }: { clinicas: Clinica[] }) {
  const { rows: documents, error } = useAdminList(fetchAllDocuments);

  const metrics = useMemo(() => {
    const total = documents.length;
    const nuevos30d = documents.filter((d) => isWithinLastDays(d.createdAt, 30)).length;
    const categorias = new Set(documents.map((d) => d.category)).size;
    return { total, nuevos30d, categorias };
  }, [documents]);

  const documentosPorClinicaRows = useMemo(
    () =>
      withCrown(
        [...clinicas]
          .map((c) => ({ key: c.id, label: c.name, value: c.documentsCount }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  return (
    <DashboardShell error={error}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Total documentos" value={String(metrics.total)} />
        <StatTile label="Últimos 30 días" value={String(metrics.nuevos30d)} />
        <StatTile label="Categorías distintas" value={String(metrics.categorias)} />
      </div>

      {clinicas.length > 1 && (
        <BarList title="Documentos por clínica" rows={documentosPorClinicaRows} formatValue={(v) => String(v)} />
      )}

      <DetailTable
        title="Documentos recientes"
        rows={documents}
        searchPlaceholder="Buscar por paciente o clínica..."
        emptyLabel="Aún no hay documentos registrados."
        filterFn={(d, term) => d.patientName.toLowerCase().includes(term) || d.clinicaName.toLowerCase().includes(term)}
        columns={[
          { key: 'clinica', label: 'Clínica', render: (d) => <span className="text-slate-500">{d.clinicaName}</span> },
          { key: 'paciente', label: 'Paciente', render: (d) => <span className="font-medium text-slate-800">{d.patientName}</span> },
          { key: 'categoria', label: 'Categoría', render: (d) => <span className="text-slate-500">{d.category}</span> },
          { key: 'archivo', label: 'Archivo', render: (d) => <span className="text-slate-500">{d.fileName}</span> },
          { key: 'fecha', label: 'Fecha', render: (d) => <span className="text-slate-500">{formatDateTime(d.createdAt)}</span> },
        ]}
      />
    </DashboardShell>
  );
}

function CartolaDashboard({ clinicas }: { clinicas: Clinica[] }) {
  const { rows: movements, error } = useAdminList(fetchAllLedgerMovements);

  const metrics = useMemo(() => {
    const total = movements.length;
    const totalDebe = movements.reduce((sum, m) => sum + m.debe, 0);
    const totalHaber = movements.reduce((sum, m) => sum + m.haber, 0);
    return { total, totalDebe, totalHaber, saldoNeto: totalHaber - totalDebe };
  }, [movements]);

  const movimientosPorClinicaRows = useMemo(
    () =>
      withCrown(
        [...clinicas]
          .map((c) => ({ key: c.id, label: c.name, value: c.ledgerMovementsCount }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  const saldoPorClinicaRows = useMemo(
    () =>
      withCrown(
        [...clinicas]
          .map((c) => ({ key: c.id, label: c.name, value: c.ledgerNetAmount }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  return (
    <DashboardShell error={error}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total movimientos" value={String(metrics.total)} />
        <StatTile label="Total abonos (haber)" value={formatCLP(metrics.totalHaber)} />
        <StatTile label="Total cargos (debe)" value={formatCLP(metrics.totalDebe)} />
        <StatTile label="Saldo neto" value={formatCLP(metrics.saldoNeto)} />
      </div>

      {clinicas.length > 1 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BarList title="Movimientos por clínica" rows={movimientosPorClinicaRows} formatValue={(v) => String(v)} />
          <BarList title="Saldo neto por clínica" rows={saldoPorClinicaRows} formatValue={(v) => formatCLP(v)} />
        </div>
      )}

      <DetailTable
        title="Movimientos recientes"
        rows={movements}
        searchPlaceholder="Buscar por paciente o clínica..."
        emptyLabel="Aún no hay movimientos registrados."
        filterFn={(m, term) => m.patientName.toLowerCase().includes(term) || m.clinicaName.toLowerCase().includes(term)}
        columns={[
          { key: 'clinica', label: 'Clínica', render: (m) => <span className="text-slate-500">{m.clinicaName}</span> },
          { key: 'paciente', label: 'Paciente', render: (m) => <span className="font-medium text-slate-800">{m.patientName}</span> },
          { key: 'tipo', label: 'Tipo', render: (m) => <span className="text-slate-500 capitalize">{m.type}</span> },
          { key: 'debe', label: 'Debe', render: (m) => <span className="text-slate-500">{m.debe > 0 ? formatCLP(m.debe) : '—'}</span> },
          { key: 'haber', label: 'Haber', render: (m) => <span className="text-slate-500">{m.haber > 0 ? formatCLP(m.haber) : '—'}</span> },
          { key: 'fecha', label: 'Fecha', render: (m) => <span className="text-slate-500">{formatDateTime(m.createdAt)}</span> },
        ]}
      />
    </DashboardShell>
  );
}

function EvolucionesDashboard({ clinicas }: { clinicas: Clinica[] }) {
  const { rows: evolutions, error } = useAdminList(fetchAllEvolutions);

  const metrics = useMemo(() => {
    const total = evolutions.length;
    const nuevas30d = evolutions.filter((e) => isWithinLastDays(e.createdAt, 30)).length;
    return { total, nuevas30d };
  }, [evolutions]);

  const evolucionesPorClinicaRows = useMemo(
    () =>
      withCrown(
        [...clinicas]
          .map((c) => ({ key: c.id, label: c.name, value: c.evolutionsCount }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  return (
    <DashboardShell error={error}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatTile label="Total evoluciones" value={String(metrics.total)} />
        <StatTile label="Últimos 30 días" value={String(metrics.nuevas30d)} />
      </div>

      {clinicas.length > 1 && (
        <BarList title="Evoluciones por clínica" rows={evolucionesPorClinicaRows} formatValue={(v) => String(v)} />
      )}

      <DetailTable
        title="Evoluciones recientes"
        rows={evolutions}
        searchPlaceholder="Buscar por paciente, profesional o clínica..."
        emptyLabel="Aún no hay evoluciones registradas."
        filterFn={(e, term) =>
          e.patientName.toLowerCase().includes(term) ||
          e.professionalName.toLowerCase().includes(term) ||
          e.clinicaName.toLowerCase().includes(term)
        }
        columns={[
          { key: 'clinica', label: 'Clínica', render: (e) => <span className="text-slate-500">{e.clinicaName}</span> },
          { key: 'paciente', label: 'Paciente', render: (e) => <span className="font-medium text-slate-800">{e.patientName}</span> },
          { key: 'profesional', label: 'Profesional', render: (e) => <span className="text-slate-500">{e.professionalName}</span> },
          { key: 'resumen', label: 'Resumen', render: (e) => <span className="text-slate-500">{e.summary}</span> },
          { key: 'fecha', label: 'Fecha', render: (e) => <span className="text-slate-500">{formatDateTime(e.createdAt)}</span> },
        ]}
      />
    </DashboardShell>
  );
}

function ObservacionesDashboard({ clinicas }: { clinicas: Clinica[] }) {
  const { rows: observations, error } = useAdminList(fetchAllObservations);

  const metrics = useMemo(() => {
    const total = observations.length;
    const nuevas30d = observations.filter((o) => isWithinLastDays(o.createdAt, 30)).length;
    return { total, nuevas30d };
  }, [observations]);

  const observacionesPorClinicaRows = useMemo(
    () =>
      withCrown(
        [...clinicas]
          .map((c) => ({ key: c.id, label: c.name, value: c.observationsCount }))
          .sort((a, b) => b.value - a.value)
      ),
    [clinicas]
  );

  return (
    <DashboardShell error={error}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatTile label="Total observaciones" value={String(metrics.total)} />
        <StatTile label="Últimos 30 días" value={String(metrics.nuevas30d)} />
      </div>

      {clinicas.length > 1 && (
        <BarList title="Observaciones por clínica" rows={observacionesPorClinicaRows} formatValue={(v) => String(v)} />
      )}

      <DetailTable
        title="Observaciones recientes"
        rows={observations}
        searchPlaceholder="Buscar por paciente, profesional o clínica..."
        emptyLabel="Aún no hay observaciones registradas."
        filterFn={(o, term) =>
          o.patientName.toLowerCase().includes(term) ||
          o.professionalName.toLowerCase().includes(term) ||
          o.clinicaName.toLowerCase().includes(term)
        }
        columns={[
          { key: 'clinica', label: 'Clínica', render: (o) => <span className="text-slate-500">{o.clinicaName}</span> },
          { key: 'paciente', label: 'Paciente', render: (o) => <span className="font-medium text-slate-800">{o.patientName}</span> },
          { key: 'profesional', label: 'Profesional', render: (o) => <span className="text-slate-500">{o.professionalName}</span> },
          { key: 'resumen', label: 'Resumen', render: (o) => <span className="text-slate-500">{o.summary}</span> },
          { key: 'fecha', label: 'Fecha', render: (o) => <span className="text-slate-500">{formatDateTime(o.createdAt)}</span> },
        ]}
      />
    </DashboardShell>
  );
}

const MODULE_DASHBOARDS: Partial<Record<ModuleRouteKey, (props: { clinicas: Clinica[] }) => ReactNode>> = {
  pacientes: PacientesDashboard,
  consentimientos: ConsentimientosDashboard,
  agenda: AgendaDashboard,
  tratamientos: TratamientosDashboard,
  documentosClinicos: DocumentosDashboard,
  cartola: CartolaDashboard,
  evoluciones: EvolucionesDashboard,
  observaciones: ObservacionesDashboard,
};

function ModuleDashboard({ moduleKey, clinicas }: { moduleKey: ModuleRouteKey; clinicas: Clinica[] }) {
  const Dashboard = MODULE_DASHBOARDS[moduleKey];
  if (!Dashboard) return null;
  // key={moduleKey} forces a full remount when switching modules, since each
  // dashboard component calls a different sequence of hooks internally.
  return <Dashboard key={moduleKey} clinicas={clinicas} />;
}

function ConsumptionCell({ moduleKey, clinica }: { moduleKey: ModuleRouteKey; clinica: Clinica }) {
  switch (moduleKey) {
    case 'pacientes':
      return (
        <span>
          {clinica.patientsCount} pacientes · consentimiento: {clinica.consentStats.firmado} firmado
          {clinica.consentStats.firmado === 1 ? '' : 's'}, {clinica.consentStats.pendiente} pendiente
          {clinica.consentStats.pendiente === 1 ? '' : 's'}, {clinica.consentStats.rechazado} rechazado
          {clinica.consentStats.rechazado === 1 ? '' : 's'}
        </span>
      );
    case 'agenda':
      return <span>{clinica.appointmentsCount} citas</span>;
    case 'tratamientos':
      return (
        <span>
          {clinica.treatmentPlansCount} presupuestos · {formatCLP(clinica.treatmentPlansAmount)}
        </span>
      );
    case 'documentosClinicos':
      return <span>{clinica.documentsCount} documentos</span>;
    case 'cartola':
      return (
        <span>
          {clinica.ledgerMovementsCount} movimientos · saldo {formatCLP(clinica.ledgerNetAmount)}
        </span>
      );
    case 'evoluciones':
      return <span>{clinica.evolutionsCount} evoluciones</span>;
    case 'observaciones':
      return <span>{clinica.observationsCount} observaciones</span>;
    case 'consentimientos':
      return (
        <span>
          {clinica.consentStats.firmado} firmados · {clinica.consentStats.rechazado} rechazados ·{' '}
          {clinica.consentStats.pendiente} pendientes
        </span>
      );
    case 'rx':
      return <span className="text-slate-400">No disponible aún</span>;
    default:
      return null;
  }
}

function ClinicaRow({
  moduleKey,
  clinica,
  onChange,
}: {
  moduleKey: ModuleRouteKey;
  clinica: Clinica;
  onChange: (updated: Clinica) => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEnabled = moduleKey === 'rx' ? clinica.rxEnabled : clinica.modules[moduleKey];

  async function handleToggle(value: boolean) {
    setIsBusy(true);
    setError(null);
    try {
      const patch = moduleKey === 'rx' ? { rxEnabled: value } : { modules: { [moduleKey]: value } };
      onChange(await updateClinica(clinica.id, patch));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-800">{clinica.name}</div>
        {!clinica.active && <div className="text-xs text-red-500">Clínica desactivada</div>}
        {error && <div className="text-xs text-red-500">{error}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        <ConsumptionCell moduleKey={moduleKey} clinica={clinica} />
      </td>
      <td className="px-4 py-3">
        <Toggle
          checked={isEnabled}
          onChange={handleToggle}
          label={`${MODULE_META[moduleKey].label} para ${clinica.name}`}
          disabled={isBusy}
        />
      </td>
    </tr>
  );
}

export default function ModuloConsumo() {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClinicas()
      .then(setClinicas)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar las clínicas')))
      .finally(() => setIsLoading(false));
  }, []);

  if (!isValidModuleKey(moduleKey)) {
    return <p className="text-sm text-red-600">Módulo no reconocido.</p>;
  }

  const meta = MODULE_META[moduleKey];

  function handleUpdated(updated: Clinica) {
    setClinicas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <Link to="/admin/clinicas" className="mb-2 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeftIcon className="h-4 w-4" />
          Volver al resumen
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{meta.label}</h1>
        <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!isLoading && <ModuleDashboard moduleKey={moduleKey} clinicas={clinicas} />}

      {!isLoading && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">Habilitar por clínica</p>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                <th className="px-4 py-3">Clínica</th>
                <th className="px-4 py-3">Consumo</th>
                <th className="px-4 py-3">Habilitado</th>
              </tr>
            </thead>
            <tbody>
              {clinicas.map((clinica) => (
                <ClinicaRow key={clinica.id} moduleKey={moduleKey} clinica={clinica} onChange={handleUpdated} />
              ))}
            </tbody>
          </table>
          {clinicas.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Aún no hay clínicas registradas.</p>
          )}
        </div>
      )}
    </div>
  );
}
