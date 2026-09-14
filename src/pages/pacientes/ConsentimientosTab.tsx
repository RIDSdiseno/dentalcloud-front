import { useEffect, useRef, useState } from 'react';
import {
  createConsentType,
  downloadConsentPdf,
  fetchConsentTypes,
  fetchPatientConsents,
  removeConsentTypePdf,
  sendDataConsent,
  updateConsentType,
  uploadConsentTypePdf,
  type ConsentStatus,
  type ConsentType,
  type PatientConsent,
} from '../../api/dataConsents';
import { getErrorMessage } from '../../api/client';
import type { Patient } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';
import { EditIcon, PlusIcon, ShieldIcon } from '../../components/icons';
import { formatRut } from '../../utils/rut';
import { ConsentimientoPreviewModal } from './ConsentimientoPreviewModal';
import { Modal } from '../../components/Modal';

// Los codes del catálogo estándar (ver backend src/lib/consentTypes.ts) no
// se pueden crear a mano — sirven para distinguir "propio de la clínica"
// (creado con el botón de abajo) al mostrar de dónde salió cada tipo.
const SYSTEM_CONSENT_CODES = new Set([
  'proteccion_datos',
  'tratamiento_general',
  'anestesia',
  'cirugia_procedimiento_invasivo',
  'endodoncia',
  'protesis',
  'ortodoncia',
  'implantes',
  'blanqueamiento',
  'uso_imagenes',
  'sedacion',
  'autorizacion_representante_menor',
  'grabacion_voz',
]);

function ConsentTypeFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: ConsentType | null;
  onClose: () => void;
  onSaved: (consentType: ConsentType) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [legalText, setLegalText] = useState(initial?.legalText ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const saved = initial
        ? await updateConsentType(initial.id, { name, legalText })
        : await createConsentType(name, legalText);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el consentimiento'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? 'Editar consentimiento' : 'Nuevo consentimiento'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          {initial
            ? 'Cambia el nombre o el texto legal que ven el paciente y el equipo al firmar.'
            : 'Crea un tipo de consentimiento propio de esta clínica, además del catálogo estándar.'}
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder='Ej. "Uso de peeling químico"'
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Texto legal</span>
          <textarea
            value={legalText}
            onChange={(e) => setLegalText(e.target.value)}
            required
            rows={8}
            placeholder="Texto que el paciente lee y firma..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear consentimiento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const STATUS_STYLES: Record<ConsentStatus, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  firmado: { label: 'Firmado', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rechazado: { label: 'Rechazado', className: 'bg-red-50 text-red-700 ring-red-200' },
  expirado: { label: 'Expirado', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}

function ConsentTypeCard({
  patient,
  consentType,
  consent,
  onUpdated,
  onTypeUpdated,
  onEdit,
}: {
  patient: Patient;
  consentType: ConsentType;
  consent: PatientConsent | null;
  onUpdated: (consent: PatientConsent) => void;
  onTypeUpdated: (consentType: ConsentType) => void;
  onEdit: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function handlePdfFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    setIsUploadingPdf(true);
    try {
      const updated = await uploadConsentTypePdf(consentType.id, file);
      onTypeUpdated(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo subir el PDF'));
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemovePdf() {
    const confirmed = window.confirm(
      `¿Quitar el PDF de "${consentType.name}"? Volverá a usarse el texto legal por defecto para los próximos envíos.`
    );
    if (!confirmed) return;
    setError(null);
    setIsUploadingPdf(true);
    try {
      const updated = await removeConsentTypePdf(consentType.id);
      onTypeUpdated(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo quitar el PDF'));
    } finally {
      setIsUploadingPdf(false);
    }
  }

  const hasBeenSent = consent?.sentAt != null;
  // "No enviado" solo aplica cuando nunca se envió Y tampoco se respondió
  // (ej. firmado presencialmente sin haber pasado por el correo).
  const hasAnyActivity = hasBeenSent || consent?.respondedAt != null;
  const status = hasAnyActivity && consent
    ? STATUS_STYLES[consent.status]
    : { label: 'No enviado', className: 'bg-slate-100 text-slate-500 ring-slate-200' };

  async function handleSend() {
    if (!patient.email) return;
    setError(null);
    setIsSending(true);
    try {
      const result = await sendDataConsent(patient.id, consentType.id);
      onUpdated({
        id: consent?.id ?? '',
        consentTypeId: consentType.id,
        status: result.status,
        method: 'email',
        sentAt: result.sentAt,
        expiresAt: result.expiresAt,
        respondedAt: null,
        signerName: null,
        signerRut: null,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar el consentimiento'));
    } finally {
      setIsSending(false);
    }
  }

  async function handleDownloadPdf() {
    if (!consent?.id) return;
    setError(null);
    setIsDownloading(true);
    try {
      const blob = await downloadConsentPdf(consent.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo descargar el PDF'));
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ShieldIcon className="h-5 w-5 text-brand-500" />
          {consentType.name}
          {!SYSTEM_CONSENT_CODES.has(consentType.code) && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Propio de la clínica
            </span>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Editar consentimiento"
              className="text-slate-400 hover:text-brand-600"
            >
              <EditIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.className}`}>
          {status.label}
        </span>
      </div>

      {!patient.email && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Este paciente no tiene correo registrado. Agrega uno en "Editar" para poder enviar el consentimiento.
        </p>
      )}

      {isAdmin && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
          <span className="font-medium text-slate-500">
            {consentType.pdfUrl ? 'PDF propio de la clínica en uso' : 'Usando texto legal por defecto'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handlePdfFileSelected(e.target.files?.[0])}
          />
          {consentType.pdfUrl && (
            <a href={consentType.pdfUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-600 hover:underline">
              Ver PDF actual
            </a>
          )}
          <button
            type="button"
            disabled={isUploadingPdf}
            onClick={() => fileInputRef.current?.click()}
            className="font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploadingPdf ? 'Subiendo...' : consentType.pdfUrl ? 'Reemplazar PDF' : 'Subir PDF'}
          </button>
          {consentType.pdfUrl && (
            <button
              type="button"
              disabled={isUploadingPdf}
              onClick={handleRemovePdf}
              className="font-semibold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Quitar
            </button>
          )}
        </div>
      )}

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Último envío</dt>
          <dd className="font-medium text-slate-800">{formatDateTime(consent?.sentAt ?? null)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Vence</dt>
          <dd className="font-medium text-slate-800">{formatDateTime(consent?.expiresAt ?? null)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Respondido</dt>
          <dd className="font-medium text-slate-800">{formatDateTime(consent?.respondedAt ?? null)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Firmante</dt>
          <dd className="font-medium text-slate-800">
            {consent?.signerName ? `${consent.signerName} (${formatRut(consent.signerRut ?? '')})` : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex justify-end gap-2">
        {consent?.id && (
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloading ? 'Generando...' : 'Descargar PDF'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Ver / Firmar consentimiento
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={!patient.email || isSending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? 'Enviando...' : hasBeenSent ? 'Reenviar consentimiento' : 'Enviar consentimiento'}
        </button>
      </div>

      {showPreview && (
        <ConsentimientoPreviewModal
          patient={patient}
          consentType={consentType}
          consent={consent}
          onClose={() => setShowPreview(false)}
          onSigned={(result) => {
            onUpdated({
              id: consent?.id ?? '',
              consentTypeId: consentType.id,
              status: result.status,
              method: consent?.method ?? 'presencial',
              sentAt: consent?.sentAt ?? null,
              expiresAt: consent?.expiresAt ?? null,
              respondedAt: result.respondedAt,
              signerName: result.signerName,
              signerRut: result.signerRut,
            });
            setShowPreview(false);
          }}
        />
      )}
    </div>
  );
}

export function ConsentimientosTab({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [consentTypes, setConsentTypes] = useState<ConsentType[]>([]);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<{ mode: 'create' } | { mode: 'edit'; type: ConsentType } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchConsentTypes(), fetchPatientConsents(patient.id)])
      .then(([types, patientConsents]) => {
        setConsentTypes(types);
        setConsents(patientConsents);
        setError(null);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los consentimientos')))
      .finally(() => setIsLoading(false));
  }, [patient.id]);

  // El paciente firma desde su celular en otro momento, así que el estado acá
  // se refresca solo: al volver a esta pestaña del navegador, y cada 20s
  // mientras queda abierta — sin necesitar F5 para verlo actualizado.
  useEffect(() => {
    function refreshSilently() {
      fetchPatientConsents(patient.id)
        .then(setConsents)
        .catch(() => undefined);
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') refreshSilently();
    }

    const interval = window.setInterval(refreshSilently, 20_000);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', refreshSilently);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refreshSilently);
    };
  }, [patient.id]);

  function handleUpdated(consentTypeId: string, updated: PatientConsent) {
    setConsents((prev) => {
      const exists = prev.some((c) => c.consentTypeId === consentTypeId);
      return exists
        ? prev.map((c) => (c.consentTypeId === consentTypeId ? updated : c))
        : [...prev, updated];
    });
  }

  function handleTypeUpdated(updated: ConsentType) {
    setConsentTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  if (isLoading) return null;

  if (error) {
    return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>;
  }

  return (
    <div id="consentimientos-card" className="flex flex-col gap-5">
      {isAdmin && (
        <button
          type="button"
          onClick={() => setFormModal({ mode: 'create' })}
          className="flex w-fit items-center gap-2 rounded-lg border-2 border-dashed border-brand-300 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo consentimiento
        </button>
      )}

      {consentTypes.map((consentType) => (
        <ConsentTypeCard
          key={consentType.id}
          patient={patient}
          consentType={consentType}
          consent={consents.find((c) => c.consentTypeId === consentType.id) ?? null}
          onUpdated={(updated) => handleUpdated(consentType.id, updated)}
          onTypeUpdated={handleTypeUpdated}
          onEdit={() => setFormModal({ mode: 'edit', type: consentType })}
        />
      ))}

      {formModal && (
        <ConsentTypeFormModal
          initial={formModal.mode === 'edit' ? formModal.type : null}
          onClose={() => setFormModal(null)}
          onSaved={(saved) => {
            setConsentTypes((prev) =>
              prev.some((t) => t.id === saved.id) ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]
            );
          }}
        />
      )}
    </div>
  );
}
