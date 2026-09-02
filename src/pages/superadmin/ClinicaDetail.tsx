import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  connectClinicaFederation,
  disconnectClinicaFederation,
  fetchClinicas,
  updateClinica,
  updateClinicaLogo,
  type Clinica,
  type ClinicaModuleKey,
  type FederationSyncKey,
} from '../../api/clinicas';

const FEDERATION_SYNC_ITEMS: { key: FederationSyncKey; label: string; description: string }[] = [
  { key: 'patients', label: 'Pacientes', description: 'Fichas de pacientes y sus antecedentes.' },
  { key: 'appointments', label: 'Citas', description: 'Agenda y horas reservadas.' },
  { key: 'treatmentPlans', label: 'Presupuestos y tratamientos', description: 'Planes de tratamiento e ítems.' },
  { key: 'users', label: 'Profesionales', description: 'Cuentas del equipo clínico.' },
  { key: 'sucursales', label: 'Sucursales', description: 'Sedes/consultorios de la clínica.' },
  { key: 'catalog', label: 'Catálogo', description: 'Convenios, prestaciones y previsiones.' },
];
import { getErrorMessage } from '../../api/client';
import { formatCLP } from '../../utils/treatmentStatus';
import { formatRut, formatRutInput, isValidRut } from '../../utils/rut';
import { MODULE_ICONS, MODULE_LABELS, MODULE_ORDER, PAIS_OPTIONS, StatTile, TIPO_LABELS, Toggle } from './clinicaShared';
import {
  ActivityIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CameraIcon,
  ChatIcon,
  ClipboardIcon,
  FolderIcon,
  ReceiptIcon,
  StarIcon,
  ToothCloudIcon,
  UsersIcon,
  XrayIcon,
} from '../../components/icons';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const CONSENT_STATUS_STYLES = {
  firmado: { label: 'Firmados', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pendiente: { label: 'Pendientes', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  rechazado: { label: 'Rechazados', className: 'bg-red-50 text-red-700 ring-red-200' },
} as const;

export default function ClinicaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyField, setBusyField] = useState<string | null>(null);

  const [rut, setRut] = useState('');
  const [rutTouched, setRutTouched] = useState(false);
  const [rutError, setRutError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchClinicas()
      .then((clinicas) => {
        const found = clinicas.find((c) => c.id === id) ?? null;
        setClinica(found);
        setRut(found?.rut ? formatRut(found.rut) : '');
        setError(found ? null : 'Holding no encontrado');
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el holding')))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function applyUpdate(patch: Parameters<typeof updateClinica>[1], field: string) {
    if (!clinica) return;
    setBusyField(field);
    setError(null);
    try {
      setClinica(await updateClinica(clinica.id, patch));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el holding'));
    } finally {
      setBusyField(null);
    }
  }

  async function handleLogoChange(file: File | null) {
    if (!clinica || !file) return;
    setError(null);
    if (file.size > MAX_LOGO_BYTES) {
      setError('El logo no puede pesar más de 5 MB');
      return;
    }
    setIsUploadingLogo(true);
    try {
      setClinica(await updateClinicaLogo(clinica.id, file));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el logo'));
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleFederationToggle(value: boolean) {
    if (!clinica) return;
    const confirmed = value
      ? true
      : window.confirm(
          `¿Desconectar ${clinica.name} de Dental-Demo? Se detiene toda la sincronización. El registro del otro lado no se borra — al reconectar se re-vincula al mismo, pero "Solo catálogo" y "Conexión activa" vuelven a sus valores por defecto.`
        );
    if (!confirmed) return;

    setBusyField('federationConnection');
    setError(null);
    try {
      setClinica(value ? await connectClinicaFederation(clinica.id) : await disconnectClinicaFederation(clinica.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cambiar la conexión con Dental-Demo'));
    } finally {
      setBusyField(null);
    }
  }

  async function handleRutSave() {
    setRutTouched(true);
    setRutError(null);
    if (rut.trim() && !isValidRut(rut)) {
      setRutError('RUT inválido');
      return;
    }
    await applyUpdate({ rut: rut.trim() || undefined }, 'rut');
  }

  if (isLoading) return null;

  if (error || !clinica) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/clinicas')}
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a holdings
        </button>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error ?? 'Holding no encontrado'}</p>
      </div>
    );
  }

  const rutIsValid = rut.trim() === '' ? true : isValidRut(rut);
  const consentTotal = clinica.consentStats.firmado + clinica.consentStats.pendiente + clinica.consentStats.rechazado;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/admin/clinicas')}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver a holdings
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={isUploadingLogo}
            title="Cambiar logo"
            className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-500/10 text-brand-600 disabled:cursor-not-allowed"
          >
            {clinica.logoUrl ? (
              <img src={clinica.logoUrl} alt={`Logo de ${clinica.name}`} className="h-full w-full object-cover" />
            ) : clinica.tipo === 'estetica' ? (
              <StarIcon className="h-6 w-6" />
            ) : (
              <ToothCloudIcon className="h-6 w-6" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <CameraIcon className="h-5 w-5 text-white" />
            </span>
            {isUploadingLogo && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold text-white">
                ...
              </span>
            )}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900">{clinica.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Creada el {new Date(clinica.createdAt).toLocaleDateString('es-CL')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
              clinica.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'
            }`}
          >
            {clinica.active ? 'Activa' : 'Desactivada'}
          </span>
          <Toggle
            checked={clinica.active}
            onChange={(value) => applyUpdate({ active: value }, 'active')}
            label={`Holding ${clinica.name} activo`}
            disabled={busyField === 'active'}
          />
        </div>
      </div>

      {!clinica.active && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          Los usuarios de este holding no podrán iniciar sesión mientras esté desactivado.
        </p>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Federación con Dental-Demo</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Sincronización de pacientes, citas y presupuestos con la plataforma de administración.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                clinica.federatedClinicId
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-slate-100 text-slate-500 ring-slate-200'
              }`}
            >
              {clinica.federatedClinicId ? 'Conectada' : 'No conectada'}
            </span>
            <Toggle
              checked={Boolean(clinica.federatedClinicId)}
              onChange={handleFederationToggle}
              label={`Conexión de ${clinica.name} con Dental-Demo`}
              disabled={busyField === 'federationConnection'}
            />
          </div>
        </div>

        {clinica.federatedClinicId ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
              <div>
                <p className="text-sm font-medium text-slate-700">Conexión activa</p>
                <p className="text-xs text-slate-500">Pausa toda la sincronización sin perder el emparejamiento.</p>
              </div>
              <Toggle
                checked={!clinica.federationPaused}
                onChange={(value) => applyUpdate({ federationPaused: !value }, 'federationPaused')}
                label={`Conexión federada de ${clinica.name} activa`}
                disabled={busyField === 'federationPaused'}
              />
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
              <div>
                <p className="text-sm font-medium text-slate-700">Solo catálogo</p>
                <p className="text-xs text-slate-500">Si está activo, nunca comparte pacientes/citas/presupuestos reales.</p>
              </div>
              <Toggle
                checked={clinica.federationCatalogOnly}
                onChange={(value) => applyUpdate({ federationCatalogOnly: value }, 'federationCatalogOnly')}
                label={`Solo catálogo para ${clinica.name}`}
                disabled={busyField === 'federationCatalogOnly'}
              />
            </div>
          </div>
        ) : null}

        {clinica.federatedClinicId && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm font-medium text-slate-700">Conexiones individuales</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FEDERATION_SYNC_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <Toggle
                    checked={clinica.federationSyncSettings[item.key]}
                    onChange={(value) =>
                      applyUpdate({ federationSyncSettings: { [item.key]: value } }, `federationSyncSettings.${item.key}`)
                    }
                    label={`${item.label} de ${clinica.name}`}
                    disabled={busyField === `federationSyncSettings.${item.key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {!clinica.federatedClinicId && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Esta clínica no está emparejada con Dental-Demo. Activa el switch de arriba para conectarla — arrancará en modo "Solo catálogo" por seguridad.
          </p>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label htmlFor="detail-rut" className="text-sm font-medium text-slate-700">
            RUT
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="detail-rut"
              value={rut}
              onChange={(e) => setRut(formatRutInput(e.target.value))}
              onBlur={() => setRutTouched(true)}
              placeholder="76.123.456-7"
              maxLength={12}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-3 ${
                rutTouched && !rutIsValid
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/15'
              }`}
            />
            <button
              type="button"
              onClick={handleRutSave}
              disabled={busyField === 'rut'}
              className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Guardar
            </button>
          </div>
          {rutTouched && !rutIsValid && <p className="mt-1 text-xs text-red-600">RUT inválido</p>}
          {rutError && <p className="mt-1 text-xs text-red-600">{rutError}</p>}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label htmlFor="detail-tipo" className="text-sm font-medium text-slate-700">
            Tipo de holding
          </label>
          <select
            id="detail-tipo"
            value={clinica.tipo}
            onChange={(e) => applyUpdate({ tipo: e.target.value }, 'tipo')}
            disabled={busyField === 'tipo'}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:opacity-60"
          >
            {Object.entries(TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label htmlFor="detail-pais" className="text-sm font-medium text-slate-700">
            País
          </label>
          <select
            id="detail-pais"
            value={clinica.pais}
            onChange={(e) => applyUpdate({ pais: e.target.value }, 'pais')}
            disabled={busyField === 'pais'}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:opacity-60"
          >
            {PAIS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Métricas</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile icon={UsersIcon} label="Pacientes" value={String(clinica.patientsCount)} />
          <StatTile icon={UsersIcon} label="Usuarios" value={String(clinica.usersCount)} />
          <StatTile icon={CalendarIcon} label="Citas" value={String(clinica.appointmentsCount)} />
          <StatTile icon={ClipboardIcon} label="Presupuestos" value={String(clinica.treatmentPlansCount)} />
          <StatTile icon={ReceiptIcon} label="Monto total" value={formatCLP(clinica.treatmentPlansAmount)} />
          <StatTile icon={ReceiptIcon} label="Neto cartola" value={formatCLP(clinica.ledgerNetAmount)} />
          <StatTile icon={ReceiptIcon} label="Mov. cartola" value={String(clinica.ledgerMovementsCount)} />
          <StatTile icon={FolderIcon} label="Documentos" value={String(clinica.documentsCount)} />
          <StatTile icon={ActivityIcon} label="Evoluciones" value={String(clinica.evolutionsCount)} />
          <StatTile icon={ChatIcon} label="Observaciones" value={String(clinica.observationsCount)} />
        </div>

        <p className="mt-5 mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          Consentimientos de protección de datos
        </p>
        <div className="flex flex-wrap gap-2">
          {(['firmado', 'pendiente', 'rechazado'] as const).map((key) => (
            <span
              key={key}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${CONSENT_STATUS_STYLES[key].className}`}
            >
              {CONSENT_STATUS_STYLES[key].label}: {clinica.consentStats[key]}
            </span>
          ))}
          {consentTotal === 0 && <span className="text-xs text-slate-400">Sin pacientes registrados aún.</span>}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Módulos habilitados</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {clinica.tipo !== 'estetica' && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <XrayIcon className="h-4 w-4 text-slate-400" />
                Módulo Rx
              </span>
              <Toggle
                checked={clinica.rxEnabled}
                onChange={(value) => applyUpdate({ rxEnabled: value }, 'rx')}
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
                  onChange={(value) => applyUpdate({ modules: { [key]: value } as Partial<Record<ClinicaModuleKey, boolean>> }, key)}
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
