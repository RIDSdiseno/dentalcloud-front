import { useState } from 'react';
import type { Appointment } from '../../api/appointments';
import { ChevronDownIcon, ChevronRightIcon } from '../../components/icons';
import { formatTime } from './dateUtils';

// "Que la cita quede registrada en segundo plano, no que desaparezca"
// (reunión 30/09, tarea 20). Las canceladas no pueden volver a la parrilla de
// sillones — esa hora quedó libre de verdad y mostrarlas ahí haría parecer
// que el sillón sigue ocupado —, así que viven acá: plegadas, sin estorbar,
// pero a un clic de distancia con su motivo.
export function CanceladasDelDia({ appointments }: { appointments: Appointment[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (appointments.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300"
      >
        {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        {appointments.length} cita{appointments.length === 1 ? '' : 's'} cancelada
        {appointments.length === 1 ? '' : 's'} este día
      </button>

      {isOpen && (
        <div className="flex flex-col divide-y divide-slate-100 px-4 pb-3 dark:divide-slate-800">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 text-xs">
              <span className="font-semibold text-slate-600 line-through dark:text-slate-300">
                {formatTime(new Date(appointment.startAt))} · {appointment.patient.firstName}{' '}
                {appointment.patient.lastName}
              </span>
              {appointment.cancelacionMotivo ? (
                <span className="text-slate-500 dark:text-slate-400">
                  {appointment.cancelacionMotivo}
                  {appointment.canceladaPor && <> &middot; canceló {appointment.canceladaPor.name}</>}
                </span>
              ) : (
                // Las canceladas antes de este cambio no tienen motivo: a nadie
                // se lo pidieron en su momento.
                <span className="text-slate-400 italic dark:text-slate-500">sin motivo registrado</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
