import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createAppointment, type Appointment } from '../../api/appointments';
import { fetchOpenSlots, type OpenSlot } from '../../api/openSlots';
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

  // "Seleccionar cita ya postulada": en vez de elegir sillón/hora/duración a
  // mano, se elige entre las horas que un profesional ya dejó publicadas
  // ("Agregar horas disponibles") — el sillón/profesional/horario quedan
  // fijos, tal como se publicaron.
  const [useOpenSlot, setUseOpenSlot] = useState(false);
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [selectedOpenSlot, setSelectedOpenSlot] = useState<OpenSlot | null>(null);
  const [isLoadingOpenSlots, setIsLoadingOpenSlots] = useState(false);

  useEffect(() => {
    fetchChairs().then((data) => {
      setChairs(data);
      setChairId((current) => current || data[0]?.id || '');
    });
    if (isAdmin) {
      fetchUsers().then(setProfessionals).catch(() => undefined);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!useOpenSlot) return;
    setIsLoadingOpenSlots(true);
    setSelectedOpenSlot(null);
    fetchOpenSlots(date, professionalId || undefined)
      .then(setOpenSlots)
      .catch(() => setOpenSlots([]))
      .finally(() => setIsLoadingOpenSlots(false));
  }, [useOpenSlot, date, professionalId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Selecciona o crea un paciente para agendar la cita');
      return;
    }
    if (useOpenSlot && !selectedOpenSlot) {
      setError('Elige una hora ya postulada de la lista');
      return;
    }
    if (!useOpenSlot && !chairId) {
      setError('Selecciona un sillón');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const appointment = useOpenSlot
        ? await createAppointment({
            openSlotId: selectedOpenSlot!.id,
            patientId: selectedPatient.id,
            notes: notes || undefined,
            type: appointmentType,
          })
        : await createAppointment({
            chairId,
            patientId: selectedPatient.id,
            professionalId: isAdmin && professionalId ? professionalId : undefined,
            startAt: new Date(`${date}T${time}:00`).toISOString(),
            endAt: new Date(new Date(`${date}T${time}:00`).getTime() + duration * 60_000).toISOString(),
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

        <button
          type="button"
          onClick={() => setUseOpenSlot((v) => !v)}
          className="w-fit text-xs font-semibold text-brand-600 hover:underline"
        >
          {useOpenSlot ? '← Elegir sillón y hora a mano' : 'Seleccionar cita ya postulada →'}
        </button>

        {!useOpenSlot && (
          <>
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
          </>
        )}

        {useOpenSlot && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="new-appt-open-slot-date" className="text-sm font-medium text-slate-700">
                Fecha a revisar
              </label>
              <input
                id="new-appt-open-slot-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>

            {isLoadingOpenSlots && <p className="text-sm text-slate-400">Buscando horas publicadas...</p>}
            {!isLoadingOpenSlots && openSlots.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400">
                No hay horas publicadas ese día. Prueba otra fecha, o publica una desde "Agregar horas disponibles".
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {openSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedOpenSlot(slot)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selectedOpenSlot?.id === slot.id
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold">
                    {new Date(slot.startAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-slate-400">{slot.professional.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

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
