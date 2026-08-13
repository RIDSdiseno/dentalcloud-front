import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import {
  fetchConsentText,
  respondDataConsentInPerson,
  type ConsentStatus,
  type ConsentType,
  type PatientConsent,
} from '../../api/dataConsents';
import type { Patient } from '../../api/patients';
import { formatRutInput, isValidRut } from '../../utils/rut';
import { SignaturePad } from '../../components/SignaturePad';

export function ConsentimientoPreviewModal({
  patient,
  consentType,
  consent,
  onClose,
  onSigned,
}: {
  patient: Patient;
  consentType: ConsentType;
  consent: PatientConsent | null;
  onClose: () => void;
  onSigned: (result: { status: ConsentStatus; respondedAt: string; signerName: string; signerRut: string }) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [signerName, setSignerName] = useState(`${patient.firstName} ${patient.lastName}`);
  const [signerRut, setSignerRut] = useState(patient.rut);
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchConsentText(consentType.id)
      .then((result) => {
        setText(result.text);
        setPdfUrl(result.pdfUrl);
      })
      .catch((err) => setLoadError(getErrorMessage(err, 'No se pudo cargar el documento del consentimiento')));
  }, [consentType.id]);

  const alreadyResponded = consent?.status === 'firmado' || consent?.status === 'rechazado';
  const canSubmit = !alreadyResponded && readConfirmed && signerName.trim().length > 0 && isValidRut(signerRut) && !isSubmitting;
  const canAccept = canSubmit && Boolean(signatureDataUrl);

  async function handleDecision(decision: 'firmado' | 'rechazado') {
    if (!canSubmit) {
      setFormError('Completa el nombre, el RUT y confirma que el paciente leyó el documento.');
      return;
    }
    if (decision === 'firmado' && !signatureDataUrl) {
      setFormError('El paciente debe dibujar su firma antes de aceptar.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const result = await respondDataConsentInPerson(patient.id, consentType.id, {
        decision,
        signerName: signerName.trim(),
        signerRut,
        readConfirmed,
        signatureDataUrl: decision === 'firmado' ? signatureDataUrl : undefined,
      });
      onSigned({ ...result, signerName: signerName.trim(), signerRut });
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo registrar la respuesta'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={consentType.name} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4">
        {loadError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{loadError}</p>}

        {pdfUrl ? (
          <div className="flex flex-col gap-2">
            <iframe
              src={pdfUrl}
              title={`Consentimiento ${consentType.name}`}
              className="h-80 w-full rounded-lg border border-slate-200 bg-slate-50"
            />
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="self-start text-sm font-semibold text-brand-600 hover:underline"
            >
              Descargar / abrir en otra pestaña
            </a>
          </div>
        ) : (
          text && (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
              {text}
            </div>
          )
        )}

        {alreadyResponded ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
            Este consentimiento ya fue {consent?.status === 'firmado' ? 'firmado' : 'rechazado'} por{' '}
            {consent?.signerName ?? 'el paciente'}.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Firma presencial: úsala cuando el paciente está frente a ti y prefieres registrar su respuesta
            directamente, sin esperar el correo.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="preview-signer-name" className="text-sm font-medium text-slate-700">
              Nombre completo
            </label>
            <input
              id="preview-signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label htmlFor="preview-signer-rut" className="text-sm font-medium text-slate-700">
              RUT
            </label>
            <input
              id="preview-signer-rut"
              value={signerRut}
              onChange={(e) => setSignerRut(formatRutInput(e.target.value))}
              placeholder="12.345.678-9"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={readConfirmed}
              onChange={(e) => setReadConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            El paciente leyó y comprende este documento.
          </label>

          {!alreadyResponded && (
            <div>
              <label className="text-sm font-medium text-slate-700">Firma del paciente</label>
              <div className="mt-1">
                <SignaturePad onChange={setSignatureDataUrl} height={140} />
              </div>
            </div>
          )}

          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={!canAccept}
              onClick={() => handleDecision('firmado')}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Aceptar y firmar'}
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => handleDecision('rechazado')}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
