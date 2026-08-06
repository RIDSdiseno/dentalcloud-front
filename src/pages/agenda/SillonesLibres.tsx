import { useEffect, useState } from 'react';
import { ChairTabs } from './ChairTabs';
import { SillonesLibresGrid } from './SillonesLibresGrid';
import { AppointmentFormModal } from './AppointmentFormModal';
import { ChairFormModal } from './ChairFormModal';
import { SlotDurationControl } from './SlotDurationControl';
import { addDays, formatWeekRange, startOfWeek, toDateParam } from './dateUtils';
import { fetchChairs, type Chair } from '../../api/chairs';
import { fetchAppointmentsRange, deleteAppointment, type Appointment } from '../../api/appointments';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../../components/icons';

export default function SillonesLibres() {
  const { user } = useAuth();
  const stepMinutes = user?.slotDurationMinutes ?? 15;
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [selectedChairId, setSelectedChairId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<Date | null>(null);
  const [showChairForm, setShowChairForm] = useState(false);

  const nextChairNumber = chairs.length > 0 ? Math.max(...chairs.map((c) => c.number)) + 1 : 101;

  useEffect(() => {
    fetchChairs()
      .then((data) => {
        setChairs(data);
        setSelectedChairId((current) => current ?? data[0]?.id ?? null);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los sillones')));
  }, []);

  useEffect(() => {
    if (!selectedChairId) return;
    const controller = new AbortController();
    const weekEnd = addDays(weekStart, 6);
    fetchAppointmentsRange(toDateParam(weekStart), toDateParam(weekEnd), selectedChairId)
      .then((data) => {
        if (!controller.signal.aborted) setAppointments(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(getErrorMessage(err, 'No se pudieron cargar las citas'));
      });
    return () => controller.abort();
  }, [selectedChairId, weekStart]);

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

  const selectedChair = chairs.find((c) => c.id === selectedChairId) ?? null;
  const isCurrentWeek = isSameWeek(weekStart, startOfWeek(new Date()));

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sillones libres</h1>
          <p className="mt-1 text-sm text-slate-500">{formatWeekRange(weekStart)}</p>
        </div>

        <div className="flex items-center gap-2">
          <SlotDurationControl />
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
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Semana anterior"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            disabled={isCurrentWeek}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-50"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Semana siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
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

      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <ChairTabs chairs={chairs} selectedChairId={selectedChairId} onSelect={setSelectedChairId} />
      </div>

      <div className="min-h-0 flex-1">
        <SillonesLibresGrid
          weekStart={weekStart}
          appointments={appointments}
          stepMinutes={stepMinutes}
          onSlotClick={setPendingSlot}
          onAppointmentClick={handleCancelAppointment}
        />
      </div>

      {pendingSlot && selectedChair && (
        <AppointmentFormModal
          chair={selectedChair}
          startAt={pendingSlot}
          onClose={() => setPendingSlot(null)}
          onCreated={(appointment) => {
            setAppointments((prev) => [...prev, appointment]);
            setPendingSlot(null);
          }}
        />
      )}

      {showChairForm && (
        <ChairFormModal
          nextNumber={nextChairNumber}
          onClose={() => setShowChairForm(false)}
          onCreated={(chair) => {
            setChairs((prev) => [...prev, chair].sort((a, b) => a.number - b.number));
            setSelectedChairId((current) => current ?? chair.id);
            setShowChairForm(false);
          }}
        />
      )}
    </div>
  );
}

function isSameWeek(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}
