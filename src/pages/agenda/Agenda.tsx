import { useEffect, useState } from 'react';
import { DayTabs } from './DayTabs';
import { ChairAgendaGrid } from './ChairAgendaGrid';
import { AppointmentFormModal } from './AppointmentFormModal';
import { NewAppointmentModal } from './NewAppointmentModal';
import { ChairFormModal } from './ChairFormModal';
import { formatLongDate, isSameDay, toDateParam } from './dateUtils';
import { fetchChairs, deleteChair, type Chair } from '../../api/chairs';
import { fetchAppointments, deleteAppointment, type Appointment } from '../../api/appointments';
import { getErrorMessage } from '../../api/client';
import { PlusIcon } from '../../components/icons';

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<{ chair: Chair; startAt: Date } | null>(null);
  const [showChairForm, setShowChairForm] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  const isToday = isSameDay(selectedDate, new Date());

  useEffect(() => {
    fetchChairs()
      .then(setChairs)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los sillones')));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAppointments(toDateParam(selectedDate))
      .then((data) => {
        if (!controller.signal.aborted) setAppointments(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(getErrorMessage(err, 'No se pudieron cargar las citas'));
      });
    return () => controller.abort();
  }, [selectedDate]);

  async function handleRemoveChair(chair: Chair) {
    const confirmed = window.confirm(
      `¿Eliminar ${chair.name || `Sillón ${chair.number}`}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await deleteChair(chair.id);
      setChairs((prev) => prev.filter((c) => c.id !== chair.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el sillón'));
    }
  }

  async function handleCancelAppointment(appointment: Appointment) {
    const confirmed = window.confirm(
      `¿Cancelar la cita de ${appointment.patient.firstName} ${appointment.patient.lastName}?`
    );
    if (!confirmed) return;

    try {
      await deleteAppointment(appointment.id);
      setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cancelar la cita'));
    }
  }

  const nextChairNumber = chairs.length > 0 ? Math.max(...chairs.map((c) => c.number)) + 1 : 101;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agenda general</h1>
          <p className="mt-1 text-sm text-slate-500 capitalize">{formatLongDate(selectedDate)}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            {appointments.length} cita{appointments.length === 1 ? '' : 's'} agendada
            {appointments.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => setShowNewAppointment(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Nueva cita
          </button>
          <button
            type="button"
            onClick={() => setShowChairForm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <PlusIcon className="h-4 w-4" />
            Sillón
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-50"
          >
            Hoy
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

      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <DayTabs selectedDate={selectedDate} onSelect={setSelectedDate} />
      </div>

      <div className="min-h-0 flex-1">
        <ChairAgendaGrid
          date={selectedDate}
          chairs={chairs}
          appointments={appointments}
          onSlotClick={(chair, startAt) => setPendingSlot({ chair, startAt })}
          onAppointmentClick={handleCancelAppointment}
          onRemoveChair={handleRemoveChair}
        />
      </div>

      {pendingSlot && (
        <AppointmentFormModal
          chair={pendingSlot.chair}
          startAt={pendingSlot.startAt}
          onClose={() => setPendingSlot(null)}
          onCreated={(appointment) => {
            setAppointments((prev) => [...prev, appointment]);
            setPendingSlot(null);
          }}
        />
      )}

      {showNewAppointment && (
        <NewAppointmentModal
          defaultDate={selectedDate}
          onClose={() => setShowNewAppointment(false)}
          onCreated={(appointment) => {
            if (isSameDay(new Date(appointment.startAt), selectedDate)) {
              setAppointments((prev) => [...prev, appointment]);
            }
            setShowNewAppointment(false);
          }}
        />
      )}

      {showChairForm && (
        <ChairFormModal
          nextNumber={nextChairNumber}
          onClose={() => setShowChairForm(false)}
          onCreated={(chair) => {
            setChairs((prev) => [...prev, chair].sort((a, b) => a.number - b.number));
            setShowChairForm(false);
          }}
        />
      )}
    </div>
  );
}
