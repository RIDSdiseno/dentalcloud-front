import { useState } from 'react';
import { sendDataConsent } from '../../api/dataConsents';
import { getErrorMessage } from '../../api/client';
import type { Patient } from '../../api/patients';
import { ShieldIcon } from '../../components/icons';
import { formatRut } from '../../utils/rut';
import { ConsentimientoPreviewModal } from './ConsentimientoPreviewModal';

const STATUS_STYLES: Record<Patient['privacyConsentStatus'], { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  firmado: { label: 'Firmado', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rechazado: { label: 'Rechazado', className: 'bg-red-50 text-red-700 ring-red-200' },
  expirado: { label: 'Expirado', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ConsentimientosTab({
  patient,
  onUpdated,
}: {
  patient: Patient;
  onUpdated: (patient: Patient) => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const hasBeenSent = patient.privacyConsentSentAt !== null;
  // "No enviado" solo aplica cuando nunca se envió Y tampoco se respondió
  // (ej. firmado presencialmente sin haber pasado por el correo).
  const hasAnyActivity = hasBeenSent || patient.privacyConsentAt !== null;
  const status = hasAnyActivity
    ? STATUS_STYLES[patient.privacyConsentStatus]
    : { label: 'No enviado', className: 'bg-slate-100 text-slate-500 ring-slate-200' };

  async function handleSend() {
    if (!patient.email) return;
    setError(null);
    setIsSending(true);
    try {
      const result = await sendDataConsent(patient.id);
      onUpdated({
        ...patient,
        privacyConsentStatus: result.status as Patient['privacyConsentStatus'],
        privacyConsentSentAt: result.sentAt,
        privacyConsentExpiresAt: result.expiresAt,
        privacyConsentAt: null,
        privacyConsentSignerName: null,
        privacyConsentSignerRut: null,
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
          Consentimiento de tratamiento de datos personales
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
          <dd className="font-medium text-slate-800">{formatDateTime(patient.privacyConsentSentAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Vence</dt>
          <dd className="font-medium text-slate-800">{formatDateTime(patient.privacyConsentExpiresAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Respondido</dt>
          <dd className="font-medium text-slate-800">{formatDateTime(patient.privacyConsentAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Firmante</dt>
          <dd className="font-medium text-slate-800">
            {patient.privacyConsentSignerName
              ? `${patient.privacyConsentSignerName} (${formatRut(patient.privacyConsentSignerRut ?? '')})`
              : '—'}
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
          onClose={() => setShowPreview(false)}
          onSigned={(result) => {
            onUpdated({
              ...patient,
              privacyConsentStatus: result.status as Patient['privacyConsentStatus'],
              privacyConsentAt: result.respondedAt,
              privacyConsentSignerName: result.signerName,
              privacyConsentSignerRut: result.signerRut,
            });
            setShowPreview(false);
          }}
        />
      )}
    </div>
  );
}
