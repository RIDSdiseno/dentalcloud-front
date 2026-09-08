import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAppointments, type Appointment } from '../../api/appointments';
import { fetchOpenSlots, deleteOpenSlot, type OpenSlot } from '../../api/openSlots';
import { fetchChairs, type Chair } from '../../api/chairs';
import { getErrorMessage } from '../../api/client';
import { addDays, formatLongDate, formatTime, isSameDay, toDateParam } from './dateUtils';
import { CalendarIcon, ChairIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, UsersIcon } from '../../components/icons';
import { NewAppointmentModal } from './NewAppointmentModal';
import { NewOpenSlotModal } from './NewOpenSlotModal';
import { AppointmentActionModal } from './AppointmentActionModal';
import { STATUS_LABEL, STATUS_BADGE_CLASS } from './appointmentStatusStyles';

export default function AgendaDiaria() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showNewOpenSlot, setShowNewOpenSlot] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);

  const isToday = isSameDay(selectedDate, new Date());

  useEffect(() => {
    fetchChairs(true).catch(() => undefined).then((data) => data && setChairs(data));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    Promise.all([fetchAppointments(toDateParam(selectedDate), { mine: true }), fetchOpenSlots(toDateParam(selectedDate))])
      .then(([appointmentsData, openSlotsData]) => {
        if (!controller.signal.aborted) {
          setAppointments(appointmentsData);
          setOpenSlots(openSlotsData);
          setError(null);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(getErrorMessage(err, 'No se pudieron cargar las citas'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [selectedDate]);

  function chairLabel(chairId: string) {
    const chair = chairs.find((c) => c.id === chairId);
    return chair ? chair.name || `Sillón ${chair.number}` : '—';
  }

  async function handleCancelOpenSlot(slot: OpenSlot) {
    if (!window.confirm('¿Cancelar esta hora publicada? Dejará de verse disponible para los pacientes.')) return;
    setBusySlotId(slot.id);
    setError(null);
    try {
      await deleteOpenSlot(slot.id);
      setOpenSlots((prev) => prev.filter((s) => s.id !== slot.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cancelar la hora publicada'));
    } finally {
      setBusySlotId(null);
    }
  }

  type TimelineEntry = { kind: 'appointment'; startAt: string; appointment: Appointment } | { kind: 'slot'; startAt: string; slot: OpenSlot };
  const timeline: TimelineEntry[] = [
    ...appointments.map((appointment) => ({ kind: 'appointment' as const, startAt: appointment.startAt, appointment })),
    ...openSlots.map((slot) => ({ kind: 'slot' as const, startAt: slot.startAt, slot })),
  ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agenda diaria</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin ? 'Citas de todos los profesionales' : 'Tus citas del día'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            {appointments.length} cita{appointments.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => setShowNewOpenSlot(true)}
            className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar horas disponibles
          </button>
          <button
            type="button"
            onClick={() => setShowNewAppointment(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Nueva cita
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          aria-label="Día anterior"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        <p className="text-sm font-semibold text-slate-700 capitalize">
          Agenda para el día {formatLongDate(selectedDate)}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-default disabled:opacity-50"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            aria-label="Día siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
          <button type="button" className="ml-2 font-semibold underline" onClick={() => setError(null)}>
            Cerrar
          </button>
        </p>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
        {!isLoading && timeline.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500">No hay citas agendadas para este día.</p>
          </div>
        )}

        {timeline.map((entry) => {
          if (entry.kind === 'appointment') {
            const appointment = entry.appointment;
            return (
              <button
                type="button"
                key={appointment.id}
                onClick={() => setSelectedAppointment(appointment)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border-l-4 border-brand-500 bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brand-700">
                    {formatTime(new Date(appointment.startAt))} – {formatTime(new Date(appointment.endAt))}
                  </p>
                  <p className="mt-1 truncate text-base font-semibold text-slate-900 uppercase">
                    {appointment.patient.firstName} {appointment.patient.lastName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-3.5 w-3.5" />
                      {appointment.professional?.name ?? 'Sin profesional asignado'}
                    </span>
                    <span className="flex items-center gap-1">
                      <ChairIcon className="h-3.5 w-3.5" />
                      {chairLabel(appointment.chairId)}
                    </span>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    STATUS_BADGE_CLASS[appointment.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {STATUS_LABEL[appointment.status] ?? appointment.status}
                </span>
              </button>
            );
          }

          const slot = entry.slot;
          return (
            <div
              key={slot.id}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border-l-4 border-dashed border-brand-300 bg-brand-50/40 p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-brand-700">
                  {formatTime(new Date(slot.startAt))} – {formatTime(new Date(slot.endAt))}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-500 italic">Hora disponible, sin paciente todavía</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3.5 w-3.5" />
                    {slot.professional.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <ChairIcon className="h-3.5 w-3.5" />
                    {chairLabel(slot.chairId)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">Disponible</span>
                <button
                  type="button"
                  disabled={busySlotId === slot.id}
                  onClick={() => handleCancelOpenSlot(slot)}
                  className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedAppointment && (
        <AppointmentActionModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdated={(updated) => {
            setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setSelectedAppointment(updated);
          }}
          onCancelled={(cancelled) => {
            setAppointments((prev) => prev.filter((a) => a.id !== cancelled.id));
            setSelectedAppointment(null);
            // La cancelación puede haber reabierto una hora publicada — se
            // vuelve a pedir la lista para reflejarlo sin recargar la página.
            fetchOpenSlots(toDateParam(selectedDate)).then(setOpenSlots).catch(() => undefined);
          }}
        />
      )}

      {showNewAppointment && (
        <NewAppointmentModal
          defaultDate={selectedDate}
          onClose={() => setShowNewAppointment(false)}
          onCreated={(appointment) => {
            if (isSameDay(new Date(appointment.startAt), selectedDate)) {
              setAppointments((prev) =>
                [...prev, appointment].sort(
                  (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
                )
              );
            }
            setShowNewAppointment(false);
            // Si nació de tomar una hora publicada, esa hora ya no debería
            // seguir apareciendo como disponible.
            fetchOpenSlots(toDateParam(selectedDate)).then(setOpenSlots).catch(() => undefined);
          }}
        />
      )}

      {showNewOpenSlot && (
        <NewOpenSlotModal
          defaultDate={selectedDate}
          onClose={() => setShowNewOpenSlot(false)}
          onCreated={(openSlot) => {
            if (isSameDay(new Date(openSlot.startAt), selectedDate)) {
              setOpenSlots((prev) => [...prev, openSlot].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
            }
            setShowNewOpenSlot(false);
          }}
        />
      )}
    </div>
  );
}
