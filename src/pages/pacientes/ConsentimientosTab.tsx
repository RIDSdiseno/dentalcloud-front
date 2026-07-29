import { useEffect, useState } from 'react';
import {
  fetchConsentTypes,
  fetchPatientConsents,
  sendDataConsent,
  type ConsentStatus,
  type ConsentType,
  type PatientConsent,
} from '../../api/dataConsents';
import { getErrorMessage } from '../../api/client';
import type { Patient } from '../../api/patients';
import { ShieldIcon } from '../../components/icons';
import { formatRut } from '../../utils/rut';
import { ConsentimientoPreviewModal } from './ConsentimientoPreviewModal';

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
}: {
  patient: Patient;
  consentType: ConsentType;
  consent: PatientConsent | null;
  onUpdated: (consent: PatientConsent) => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ShieldIcon className="h-5 w-5 text-brand-500" />
          {consentType.name}
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
  const [consentTypes, setConsentTypes] = useState<ConsentType[]>([]);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) return null;

  if (error) {
    return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {consentTypes.map((consentType) => (
        <ConsentTypeCard
          key={consentType.id}
          patient={patient}
          consentType={consentType}
          consent={consents.find((c) => c.consentTypeId === consentType.id) ?? null}
          onUpdated={(updated) => handleUpdated(consentType.id, updated)}
        />
      ))}
    </div>
  );
}
