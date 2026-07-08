import { useEffect, useState } from 'react';
import type { Appointment } from '../../api/appointments';
import {
  addDays,
  formatDayHeader,
  formatTime,
  generateTimeSlots,
  isSameDay,
  minutesSinceMidnight,
  withTime,
} from './dateUtils';

const START_HOUR = 8;
const END_HOUR = 20;
const STEP_MINUTES = 15;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 56;
const TIME_COL_WIDTH = 96;

type SillonesLibresGridProps = {
  weekStart: Date;
  appointments: Appointment[];
  onSlotClick: (startAt: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
};

export function SillonesLibresGrid({
  weekStart,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: SillonesLibresGridProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const slots = generateTimeSlots(START_HOUR, END_HOUR, STEP_MINUTES);
  const today = new Date();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const nowMinutes = minutesSinceMidnight(now);
  const nowWithinHours = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;
  const nowOffset = ((nowMinutes - START_HOUR * 60) / STEP_MINUTES) * ROW_HEIGHT;
  const todayColumnIndex = days.findIndex((day) => isSameDay(day, today));

  const gridTemplateColumns = `${TIME_COL_WIDTH}px repeat(7, minmax(150px, 1fr))`;

  return (
    <div className="relative h-full min-h-[420px] overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="grid" style={{ gridTemplateColumns }}>
        <div
          className="sticky top-0 left-0 z-20 border-r border-b border-slate-200 bg-brand-50/60"
          style={{ gridColumn: 1, gridRow: 1, height: HEADER_HEIGHT }}
        />
        {days.map((day, dayIndex) => {
          const { weekday, day: dayNumber } = formatDayHeader(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`sticky top-0 z-10 flex flex-col items-center justify-center border-r border-b border-slate-200 last:border-r-0 ${
                isToday ? 'bg-brand-100' : 'bg-brand-50/60'
              }`}
              style={{ gridColumn: dayIndex + 2, gridRow: 1, height: HEADER_HEIGHT }}
            >
              <span className="text-xs font-medium tracking-wide text-slate-500 capitalize">
                {weekday}
              </span>
              <span className={`text-sm font-bold ${isToday ? 'text-brand-700' : 'text-slate-800'}`}>
                {dayNumber}
              </span>
            </div>
          );
        })}

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

        {days.map((day, dayIndex) => {
          const dayAppointments = appointments
            .filter((appt) => isSameDay(new Date(appt.startAt), day))
            .map((appt) => ({ appt, start: new Date(appt.startAt), end: new Date(appt.endAt) }));

          const cells = [];
          let skipUntil = -1;

          for (let rowIndex = 0; rowIndex < slots.length; rowIndex++) {
            if (rowIndex < skipUntil) continue;

            const slotStart = withTime(day, slots[rowIndex]);
            const row = rowIndex + 2;
            const column = dayIndex + 2;
            const covering = dayAppointments.find(
              ({ start, end }) => start <= slotStart && slotStart < end
            );

            if (covering) {
              const spanRows = Math.max(
                1,
                Math.round((covering.end.getTime() - covering.start.getTime()) / (STEP_MINUTES * 60_000))
              );
              skipUntil = rowIndex + spanRows;
              cells.push(
                <button
                  type="button"
                  key={`${day.toISOString()}-${slots[rowIndex]}`}
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
                  key={`${day.toISOString()}-${slots[rowIndex]}`}
                  className="group/slot flex items-center border-r border-b border-slate-100 px-2 py-1 last:border-r-0"
                  style={{ gridColumn: column, gridRow: row, height: ROW_HEIGHT }}
                >
                  <button
                    type="button"
                    onClick={() => onSlotClick(slotStart)}
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

      {nowWithinHours && todayColumnIndex >= 0 && (
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
