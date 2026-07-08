import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import {
  createWorkSchedule,
  deleteWorkSchedule,
  fetchWorkSchedules,
  type WorkSchedule,
} from '../../api/workSchedules';
import { fetchChairs, type Chair } from '../../api/chairs';
import type { StaffUser } from '../../api/users';
import { CloseIcon, PlusIcon } from '../../components/icons';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type ScheduleModalProps = {
  professional: StaffUser;
  onClose: () => void;
};

export function ScheduleModal({ professional, onClose }: ScheduleModalProps) {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [chairId, setChairId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkSchedules(professional.id).then(setSchedules).catch(() => undefined);
    fetchChairs().then(setChairs).catch(() => undefined);
  }, [professional.id]);

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    try {
      const schedule = await createWorkSchedule({
        professionalId: professional.id,
        weekday,
        startTime,
        endTime,
        chairId: chairId || undefined,
      });
      setSchedules((prev) =>
        [...prev, schedule].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))
      );
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo agregar el bloque de horario'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWorkSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el bloque'));
    }
  }

  return (
    <Modal title={`Horario de ${professional.name}`} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4">
        {WEEKDAYS.map((label, day) => {
          const dayBlocks = schedules.filter((s) => s.weekday === day);
          return (
            <div key={day} className="flex items-start gap-3">
              <span className="w-24 shrink-0 pt-1.5 text-sm font-semibold text-slate-700">{label}</span>
              <div className="flex flex-1 flex-wrap gap-2">
                {dayBlocks.length === 0 && (
                  <span className="pt-1.5 text-sm text-slate-400">Sin horario asignado</span>
                )}
                {dayBlocks.map((block) => (
                  <span
                    key={block.id}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-50 py-1.5 pr-1.5 pl-3 text-sm font-medium text-brand-700"
                  >
                    {block.startTime}–{block.endTime}
                    {block.chair && (
                      <span className="text-brand-500">
                        · {block.chair.name || `Sillón ${block.chair.number}`}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(block.id)}
                      aria-label="Eliminar bloque"
                      className="flex h-5 w-5 items-center justify-center rounded-full text-brand-400 hover:bg-brand-100 hover:text-brand-700"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Día</label>
            <select
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            >
              {WEEKDAYS.map((label, day) => (
                <option key={day} value={day}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Desde</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Hasta</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Sillón</label>
            <select
              value={chairId}
              onChange={(e) => setChairId(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Cualquiera</option>
              {chairs.map((chair) => (
                <option key={chair.id} value={chair.id}>
                  {chair.name || `Sillón ${chair.number}`}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar
          </button>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
