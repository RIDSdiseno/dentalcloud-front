import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createAppointment, type Appointment } from '../../api/appointments';
import type { Patient } from '../../api/patients';
import type { Chair } from '../../api/chairs';
import { PatientPicker } from './PatientPicker';
import { formatLongDate, formatTime } from './dateUtils';

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

type AppointmentFormModalProps = {
  chair: Chair;
  startAt: Date;
  onClose: () => void;
  onCreated: (appointment: Appointment) => void;
};

export function AppointmentFormModal({ chair, startAt, onClose, onCreated }: AppointmentFormModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const endAt = new Date(startAt.getTime() + duration * 60_000);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Selecciona o crea un paciente para agendar la cita');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const appointment = await createAppointment({
        chairId: chair.id,
        patientId: selectedPatient.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        notes: notes || undefined,
      });
      onCreated(appointment);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo agendar la cita'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Agendar cita" onClose={onClose}>
      <p className="-mt-2 mb-4 text-sm text-slate-500 capitalize">
        {chair.name || `Sillón ${chair.number}`} · {formatLongDate(startAt)} · {formatTime(startAt)}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PatientPicker value={selectedPatient} onChange={setSelectedPatient} />

        <div>
          <label htmlFor="duration" className="text-sm font-medium text-slate-700">
            Duración
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          >
            {DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutos (hasta las {formatTime(new Date(startAt.getTime() + minutes * 60_000))})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="notes" className="text-sm font-medium text-slate-700">
            Motivo / notas
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Agendando...' : 'Agendar cita'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
