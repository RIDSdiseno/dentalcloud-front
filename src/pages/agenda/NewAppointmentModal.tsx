import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createAppointment, type Appointment } from '../../api/appointments';
import { fetchChairs, type Chair } from '../../api/chairs';
import { fetchUsers, type StaffUser } from '../../api/users';
import type { Patient } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';
import { PatientPicker } from './PatientPicker';
import { toDateParam } from './dateUtils';
import { roleLabel } from '../../utils/roles';

const ALL_DURATION_OPTIONS = [15, 30, 45, 60, 90];

type NewAppointmentModalProps = {
  defaultDate: Date;
  initialPatient?: Patient;
  appointmentType?: 'cita' | 'control';
  onClose: () => void;
  onCreated: (appointment: Appointment) => void;
};

export function NewAppointmentModal({
  defaultDate,
  initialPatient,
  appointmentType = 'cita',
  onClose,
  onCreated,
}: NewAppointmentModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const stepMinutes = user?.slotDurationMinutes ?? 15;
  const DURATION_OPTIONS = ALL_DURATION_OPTIONS.filter((minutes) => minutes % stepMinutes === 0);

  const [chairs, setChairs] = useState<Chair[]>([]);
  const [professionals, setProfessionals] = useState<StaffUser[]>([]);
  const [date, setDate] = useState(toDateParam(defaultDate));
  const [time, setTime] = useState('09:00');
  const [chairId, setChairId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [duration, setDuration] = useState(stepMinutes);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient ?? null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchChairs().then((data) => {
      setChairs(data);
      setChairId((current) => current || data[0]?.id || '');
    });
    if (isAdmin) {
      fetchUsers().then(setProfessionals).catch(() => undefined);
    }
  }, [isAdmin]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Selecciona o crea un paciente para agendar la cita');
      return;
    }
    if (!chairId) {
      setError('Selecciona un sillón');
      return;
    }

    const startAt = new Date(`${date}T${time}:00`);
    const endAt = new Date(startAt.getTime() + duration * 60_000);

    setError(null);
    setIsSubmitting(true);
    try {
      const appointment = await createAppointment({
        chairId,
        patientId: selectedPatient.id,
        professionalId: isAdmin && professionalId ? professionalId : undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        notes: notes || undefined,
        type: appointmentType,
      });
      onCreated(appointment);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo agendar la cita'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={appointmentType === 'control' ? 'Nuevo control' : 'Nueva cita'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PatientPicker value={selectedPatient} onChange={setSelectedPatient} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="new-appt-date" className="text-sm font-medium text-slate-700">
              Fecha
            </label>
            <input
              id="new-appt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label htmlFor="new-appt-time" className="text-sm font-medium text-slate-700">
              Hora
            </label>
            <input
              id="new-appt-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="new-appt-chair" className="text-sm font-medium text-slate-700">
              Sillón
            </label>
            <select
              id="new-appt-chair"
              value={chairId}
              onChange={(e) => setChairId(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              {chairs.map((chair) => (
                <option key={chair.id} value={chair.id}>
                  {chair.name || `Sillón ${chair.number}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-appt-duration" className="text-sm font-medium text-slate-700">
              Duración
            </label>
            <select
              id="new-appt-duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutos
                </option>
              ))}
            </select>
          </div>
        </div>

        {isAdmin && (
          <div>
            <label htmlFor="new-appt-professional" className="text-sm font-medium text-slate-700">
              Profesional
            </label>
            <select
              id="new-appt-professional"
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">Yo mismo ({user?.name})</option>
              {professionals
                .filter((p) => p.id !== user?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({roleLabel(p.role)})
                  </option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="new-appt-notes" className="text-sm font-medium text-slate-700">
            Motivo / notas
          </label>
          <textarea
            id="new-appt-notes"
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
            {isSubmitting ? 'Agendando...' : appointmentType === 'control' ? 'Agendar control' : 'Agendar cita'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
