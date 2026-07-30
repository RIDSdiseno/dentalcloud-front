import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClinicas, type Clinica } from '../../api/clinicas';
import { getErrorMessage } from '../../api/client';
import { formatCLP } from '../../utils/treatmentStatus';
import {
  ActivityIcon,
  CalendarIcon,
  ChatIcon,
  ClipboardIcon,
  FolderIcon,
  ReceiptIcon,
  ShieldIcon,
  StarIcon,
  ToothCloudIcon,
  UsersIcon,
  XrayIcon,
} from '../../components/icons';

const TIPO_LABELS: Record<string, string> = { dental: 'Dental', estetica: 'Estética facial' };

const MODULE_LABELS: Record<ClinicaModuleKey, string> = {
  pacientes: 'Pacientes',
  agenda: 'Agenda y citas',
  tratamientos: 'Planes de tratamiento',
  documentosClinicos: 'Documentos clínicos',
  cartola: 'Cartola',
  evoluciones: 'Evoluciones',
  observaciones: 'Observaciones',
  consentimientos: 'Consentimientos',
};

const MODULE_ICONS: Record<ClinicaModuleKey, typeof FolderIcon> = {
  pacientes: UsersIcon,
  agenda: CalendarIcon,
  tratamientos: ClipboardIcon,
  documentosClinicos: FolderIcon,
  cartola: ReceiptIcon,
  evoluciones: ActivityIcon,
  observaciones: ChatIcon,
  consentimientos: ShieldIcon,
};

const MODULE_ORDER: ClinicaModuleKey[] = [
  'pacientes',
  'agenda',
  'tratamientos',
  'documentosClinicos',
  'cartola',
  'evoluciones',
  'observaciones',
  'consentimientos',
];

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

function StatTile({ icon: Icon, label, value }: { icon: typeof UsersIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-slate-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function ClinicaCard({
  clinica,
  onChange,
}: {
  clinica: Clinica;
  onChange: (updated: Clinica) => void;
}) {
  const [busyField, setBusyField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleActiveToggle(value: boolean) {
    setBusyField('active');
    setError(null);
    try {
      onChange(await updateClinica(clinica.id, { active: value }));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la clínica'));
    } finally {
      setBusyField(null);
    }
  }

  async function handleTipoChange(value: string) {
    setBusyField('tipo');
    setError(null);
    try {
      onChange(await updateClinica(clinica.id, { tipo: value }));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la clínica'));
    } finally {
      setBusyField(null);
    }
  }

  async function handleRxToggle(value: boolean) {
    setBusyField('rx');
    setError(null);
    try {
      onChange(await updateClinica(clinica.id, { rxEnabled: value }));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la clínica'));
    } finally {
      setBusyField(null);
    }
  }

  async function handleModuleToggle(key: ClinicaModuleKey, value: boolean) {
    setBusyField(key);
    setError(null);
    try {
      onChange(await updateClinica(clinica.id, { modules: { [key]: value } }));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la clínica'));
    } finally {
      setBusyField(null);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
            {clinica.tipo === 'estetica' ? <StarIcon className="h-5 w-5" /> : <ToothCloudIcon className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">{clinica.name}</h2>
            <p className="text-xs text-slate-400">
              Creada el {new Date(clinica.createdAt).toLocaleDateString('es-CL')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={clinica.tipo}
            onChange={(e) => handleTipoChange(e.target.value)}
            disabled={busyField === 'tipo'}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-brand-500 disabled:opacity-60"
          >
            {Object.entries(TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
              clinica.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'
            }`}
          >
            {clinica.active ? 'Activa' : 'Desactivada'}
          </span>
          <Toggle
            checked={clinica.active}
            onChange={handleActiveToggle}
            label={`Clínica ${clinica.name} activa`}
            disabled={busyField === 'active'}
          />
        </div>
      </div>

      {!clinica.active && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          Los usuarios de esta clínica no podrán iniciar sesión mientras esté desactivada.
        </p>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <StatTile icon={UsersIcon} label="Pacientes" value={String(clinica.patientsCount)} />
        <StatTile icon={UsersIcon} label="Usuarios" value={String(clinica.usersCount)} />
        <StatTile icon={CalendarIcon} label="Citas" value={String(clinica.appointmentsCount)} />
        <StatTile icon={ClipboardIcon} label="Presupuestos" value={String(clinica.treatmentPlansCount)} />
        <StatTile icon={ReceiptIcon} label="Monto total" value={formatCLP(clinica.treatmentPlansAmount)} />
        <StatTile icon={FolderIcon} label="Documentos" value={String(clinica.documentsCount)} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Módulos habilitados</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {clinica.tipo !== 'estetica' && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <XrayIcon className="h-4 w-4 text-slate-400" />
                Módulo Rx
              </span>
              <Toggle
                checked={clinica.rxEnabled}
                onChange={handleRxToggle}
                label={`Módulo Rx para ${clinica.name}`}
                disabled={busyField === 'rx'}
              />
            </div>
          )}
          {MODULE_ORDER.map((key) => {
            const Icon = MODULE_ICONS[key];
            return (
              <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  <Icon className="h-4 w-4 text-slate-400" />
                  {MODULE_LABELS[key]}
                </span>
                <Toggle
                  checked={clinica.modules[key]}
                  onChange={(value) => handleModuleToggle(key, value)}
                  label={`${MODULE_LABELS[key]} para ${clinica.name}`}
                  disabled={busyField === key}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
import { formatRut } from '../../utils/rut';
import { CrearClinicaModal } from './CrearClinicaModal';
import { TIPO_LABELS } from './clinicaShared';
import { PlusIcon, StarIcon, ToothCloudIcon, UsersIcon } from '../../components/icons';


export default function Clinicas() {
  const navigate = useNavigate();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchClinicas()
      .then(setClinicas)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar las clínicas')))
      .finally(() => setIsLoading(false));
  }, []);

  function handleCreated(created: Clinica) {
    setClinicas((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setShowCreateModal(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clínicas</h1>
          <p className="mt-1 text-sm text-slate-500">
            {clinicas.length} clínica{clinicas.length === 1 ? '' : 's'} en la plataforma
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" />
          Crear clínica
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!isLoading && clinicas.length === 0 && (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-400">Aún no hay clínicas registradas.</p>
        </div>
      )}

      {clinicas.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Clínica</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">RUT</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Pacientes</th>
                <th className="px-4 py-3 text-right">Monto total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clinicas.map((clinica) => (
                <tr
                  key={clinica.id}
                  onClick={() => navigate(`/admin/clinicas/${clinica.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-500/10 text-brand-600">
                        {clinica.logoUrl ? (
                          <img
                            src={clinica.logoUrl}
                            alt={`Logo de ${clinica.name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : clinica.tipo === 'estetica' ? (
                          <StarIcon className="h-4 w-4" />
                        ) : (
                          <ToothCloudIcon className="h-4 w-4" />
                        )}
                      </span>
                      <span className="font-medium text-slate-800">{clinica.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{TIPO_LABELS[clinica.tipo] ?? clinica.tipo}</td>
                  <td className="px-4 py-3 text-slate-500">{clinica.rut ? formatRut(clinica.rut) : '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                        clinica.active
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-red-50 text-red-700 ring-red-200'
                      }`}
                    >
                      {clinica.active ? 'Activa' : 'Desactivada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <UsersIcon className="h-3.5 w-3.5 text-slate-400" />
                      {clinica.patientsCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {formatCLP(clinica.treatmentPlansAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CrearClinicaModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
