import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  fetchPublicConsent,
  respondPublicConsent,
  type PublicConsent,
} from '../../api/publicConsent';
import { formatRutInput, isValidRut } from '../../utils/rut';
import { ShieldIcon } from '../../components/icons';

type ViewState = 'loading' | 'form' | 'submitting' | 'success' | 'not_found' | 'expired' | 'already_responded' | 'error';

function statusFromError(err: unknown): ViewState {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 404) return 'not_found';
    if (err.response?.status === 410) return 'expired';
    if (err.response?.status === 409) return 'already_responded';
  }
  return 'error';
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 flex items-center gap-2 text-brand-600">
          <ShieldIcon className="h-6 w-6" />
          <span className="text-lg font-bold text-slate-900">fordentcloud</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ConsentimientoPublico() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [consent, setConsent] = useState<PublicConsent | null>(null);
  const [decidedAs, setDecidedAs] = useState<'firmado' | 'rechazado' | null>(null);

  const [signerName, setSignerName] = useState('');
  const [signerRut, setSignerRut] = useState('');
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPublicConsent(token)
      .then((data) => {
        setConsent(data);
        setState('form');
      })
      .catch((err) => setState(statusFromError(err)));
  }, [token]);

  const canSubmit = readConfirmed && signerName.trim().length > 0 && isValidRut(signerRut);

  async function handleDecision(decision: 'firmado' | 'rechazado') {
    if (!token || !canSubmit) {
      setFormError('Completa tu nombre, RUT y confirma que leíste el documento.');
      return;
    }
    setFormError(null);
    setState('submitting');
    try {
      await respondPublicConsent(token, { decision, signerName: signerName.trim(), signerRut, readConfirmed });
      setDecidedAs(decision);
      setState('success');
    } catch (err) {
      setState(statusFromError(err));
    }
  }

  if (state === 'loading') {
    return (
      <Shell>
        <p className="text-sm text-slate-500">Cargando...</p>
      </Shell>
    );
  }

  if (state === 'not_found') {
    return (
      <Shell>
        <p className="text-sm text-red-600">Este link no es válido. Verifica que copiaste la URL completa.</p>
      </Shell>
    );
  }

  if (state === 'expired') {
    return (
      <Shell>
        <p className="text-sm text-amber-600">Este link ha vencido. Solicita a la clínica que te envíe uno nuevo.</p>
      </Shell>
    );
  }

  if (state === 'already_responded') {
    return (
      <Shell>
        <p className="text-sm text-slate-600">Este consentimiento ya fue respondido anteriormente.</p>
      </Shell>
    );
  }

  if (state === 'error') {
    return (
      <Shell>
        <p className="text-sm text-red-600">Ocurrió un error inesperado. Intenta nuevamente más tarde.</p>
      </Shell>
    );
  }

  if (state === 'success') {
    return (
      <Shell>
        <p className="text-sm font-medium text-slate-800">
          {decidedAs === 'firmado'
            ? 'Gracias, tu aceptación quedó registrada correctamente.'
            : 'Quedó registrado que rechazaste este consentimiento.'}
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-1 text-lg font-bold text-slate-900">{consent?.consentTypeName}</h1>
      <p className="mb-4 text-sm text-slate-500">Hola {consent?.patientName}, por favor revisa el siguiente documento.</p>

      {consent?.pdfUrl ? (
        <div className="mb-5 flex flex-col gap-2">
          <iframe
            src={consent.pdfUrl}
            title={consent.consentTypeName}
            className="h-80 w-full rounded-lg border border-slate-200 bg-slate-50"
          />
          <a
            href={consent.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="self-start text-sm font-semibold text-brand-600 hover:underline"
          >
            Descargar / abrir en otra pestaña
          </a>
        </div>
      ) : (
        <div className="mb-5 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
          {consent?.contentSnapshot}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="signerName" className="text-sm font-medium text-slate-700">
            Nombre completo
          </label>
          <input
            id="signerName"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <div>
          <label htmlFor="signerRut" className="text-sm font-medium text-slate-700">
            RUT
          </label>
          <input
            id="signerRut"
            value={signerRut}
            onChange={(e) => setSignerRut(formatRutInput(e.target.value))}
            placeholder="12.345.678-9"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <label className="mt-1 flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={readConfirmed}
            onChange={(e) => setReadConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          He leído y comprendo este documento.
        </label>

        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

        <div className="mt-2 flex gap-3">
          <button
            type="button"
            disabled={!canSubmit || state === 'submitting'}
            onClick={() => handleDecision('firmado')}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aceptar y firmar
          </button>
          <button
            type="button"
            disabled={!canSubmit || state === 'submitting'}
            onClick={() => handleDecision('rechazado')}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      </div>
    </Shell>
  );
}
