import { useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons';
import { addDays, formatDayTab, isSameDay, startOfWeek } from './dateUtils';

type DayTabsProps = {
  selectedDate: Date;
  onSelect: (date: Date) => void;
};

export function DayTabs({ selectedDate, onSelect }: DayTabsProps) {
  const week = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const today = new Date();
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [selectedDate]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect(addDays(selectedDate, -7))}
        aria-label="Semana anterior"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto lg:grid lg:grid-cols-7">
        {days.map((day) => {
          const active = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(day)}
              className={`relative shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-center text-sm font-medium capitalize transition-colors lg:shrink lg:whitespace-normal lg:px-2 ${
                active
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {formatDayTab(day)}
              {isToday && !active && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect(addDays(selectedDate, 7))}
        aria-label="Semana siguiente"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
