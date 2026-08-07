import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { sendCartolaEmail } from '../../api/ledger';
import { formatCLP } from '../../utils/treatmentStatus';
import { AlertTriangleIcon } from '../../components/icons';

// Sin librería de sonidos ni assets en el proyecto — se genera un tono corto
// con Web Audio API en vez de depender de un archivo .mp3/.wav. Campanita
// ascendente de 3 notas (arpegio mayor, onda triangular) en vez del beep de
// dos tonos descendentes anterior.
function playAlertSound() {
  try {
    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const start = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // Si el navegador bloquea audio (autoplay policy) o no soporta Web Audio
    // API, la notificación visual sigue funcionando igual.
  }
}

export function DebtNotificationModal({
  patientId,
  patientEmail,
  saldoTotal,
  onClose,
  onViewCartola,
}: {
  patientId: string;
  patientEmail: string | null;
  saldoTotal: number;
  onClose: () => void;
  onViewCartola: () => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPlayed = useRef(false);

  useEffect(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;
    playAlertSound();
  }, []);

  async function handleSendReminder() {
    setError(null);
    setIsSending(true);
    try {
      await sendCartolaEmail(patientId);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar el recordatorio'));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Modal title="Saldo pendiente" onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Este paciente tiene un saldo pendiente de <strong>{formatCLP(saldoTotal)}</strong>.
          </p>
        </div>

        {!patientEmail && (
          <p className="text-xs text-slate-400">
            Este paciente no tiene correo registrado, así que no se le puede enviar un recordatorio por email.
          </p>
        )}

        {sent && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Recordatorio enviado.</p>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onViewCartola}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Ver cartola
          </button>
          <button
            type="button"
            onClick={handleSendReminder}
            disabled={isSending || sent || !patientEmail}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? 'Enviando...' : sent ? 'Enviado' : 'Enviar recordatorio de pago'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
