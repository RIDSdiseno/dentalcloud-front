import { useEffect, useState } from 'react';
import type { Appointment } from '../../api/appointments';
import type { Chair } from '../../api/chairs';
import { ChairIcon, TrashIcon } from '../../components/icons';
import {
  formatTime,
  generateTimeSlots,
  isSameDay,
  minutesSinceMidnight,
  withTime,
} from './dateUtils';

const START_HOUR = 8;
const END_HOUR = 20;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 56;
const TIME_COL_WIDTH = 96;

type ChairAgendaGridProps = {
  date: Date;
  chairs: Chair[];
  appointments: Appointment[];
  stepMinutes: number;
  onSlotClick: (chair: Chair, startAt: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onRemoveChair: (chair: Chair) => void;
};

export function ChairAgendaGrid({
  date,
  chairs,
  appointments,
  stepMinutes,
  onSlotClick,
  onAppointmentClick,
  onRemoveChair,
}: ChairAgendaGridProps) {
  const slots = generateTimeSlots(START_HOUR, END_HOUR, stepMinutes);
  const isToday = isSameDay(date, new Date());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  const nowMinutes = minutesSinceMidnight(now);
  const showNowLine = isToday && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;
  const nowOffset = ((nowMinutes - START_HOUR * 60) / stepMinutes) * ROW_HEIGHT;

  const gridTemplateColumns = `${TIME_COL_WIDTH}px repeat(${chairs.length}, minmax(190px, 1fr))`;

  return (
    <div className="relative h-full min-h-[420px] overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="grid" style={{ gridTemplateColumns }}>
        <div
          className="sticky top-0 left-0 z-20 border-r border-b border-slate-200 bg-brand-50/60"
          style={{ gridColumn: 1, gridRow: 1, height: HEADER_HEIGHT }}
        />
        {chairs.map((chair, chairIndex) => (
          <div
            key={chair.id}
            className="group sticky top-0 z-10 flex items-center justify-between gap-2 border-r border-b border-slate-200 bg-brand-50/60 px-4 last:border-r-0"
            style={{ gridColumn: chairIndex + 2, gridRow: 1, height: HEADER_HEIGHT }}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm shadow-brand-500/30">
                <ChairIcon className="h-4.5 w-4.5" />
              </span>
              <span className="truncate text-sm font-bold text-slate-800">
                {chair.name || `Sillón ${chair.number}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveChair(chair)}
              aria-label={`Eliminar sillón ${chair.number}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}

        {slots.map((time, rowIndex) => {
          const isHour = time.endsWith(':00');
          const row = rowIndex + 2;
          return (
            <div
              key={`t-${time}`}
              className={`sticky left-0 z-10 flex items-start justify-end border-r border-slate-100 bg-white px-3 pt-1.5 text-xs ${
                isHour ? 'border-t border-t-slate-200 font-semibold text-slate-600' : 'text-slate-300'
              }`}
              style={{ gridColumn: 1, gridRow: row, height: ROW_HEIGHT }}
            >
              {isHour ? time : ''}
            </div>
          );
        })}

        {chairs.map((chair, chairIndex) => {
          const chairAppointments = appointments
            .filter((appt) => appt.chairId === chair.id)
            .map((appt) => ({ appt, start: new Date(appt.startAt), end: new Date(appt.endAt) }));

          const cells = [];
          let skipUntil = -1;

          for (let rowIndex = 0; rowIndex < slots.length; rowIndex++) {
            if (rowIndex < skipUntil) continue;

            const slotStart = withTime(date, slots[rowIndex]);
            const row = rowIndex + 2;
            const column = chairIndex + 2;
            const covering = chairAppointments.find(
              ({ start, end }) => start <= slotStart && slotStart < end
            );

            if (covering) {
              const spanRows = Math.max(
                1,
                Math.round((covering.end.getTime() - covering.start.getTime()) / (stepMinutes * 60_000))
              );
              skipUntil = rowIndex + spanRows;
              cells.push(
                <button
                  type="button"
                  key={`${chair.id}-${slots[rowIndex]}`}
                  onClick={() => onAppointmentClick(covering.appt)}
                  className="m-0.5 flex flex-col justify-center overflow-hidden rounded-lg bg-brand-100 px-2.5 py-1.5 text-left transition-colors hover:bg-brand-200"
                  style={{ gridColumn: column, gridRow: `${row} / span ${spanRows}` }}
                >
                  <span className="truncate text-xs font-semibold text-brand-800">
                    {covering.appt.patient.firstName} {covering.appt.patient.lastName}
                  </span>
                  <span className="truncate text-[11px] text-brand-700">
                    {formatTime(covering.start)}–{formatTime(covering.end)}
                  </span>
                </button>
              );
            } else {
              cells.push(
                <div
                  key={`${chair.id}-${slots[rowIndex]}`}
                  className="group/slot flex items-center border-r border-b border-slate-100 px-2 py-1 last:border-r-0"
                  style={{ gridColumn: column, gridRow: row, height: ROW_HEIGHT }}
                >
                  <button
                    type="button"
                    onClick={() => onSlotClick(chair, slotStart)}
                    className="flex w-full items-center justify-center truncate rounded-lg bg-slate-50 py-2 text-xs font-medium text-slate-400 transition-colors group-hover/slot:bg-emerald-50 group-hover/slot:text-emerald-600"
                  >
                    Disponible
                  </button>
                </div>
              );
            }
          }

          return cells;
        })}
      </div>

      {showNowLine && (
        <div
          className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
          style={{ top: HEADER_HEIGHT + nowOffset }}
        >
          <div className="flex shrink-0 justify-end pr-1.5" style={{ width: TIME_COL_WIDTH }}>
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white">
              {formatTime(now)}
            </span>
          </div>
          <div className="h-px flex-1 bg-red-500" />
        </div>
      )}
    </div>
  );
}
