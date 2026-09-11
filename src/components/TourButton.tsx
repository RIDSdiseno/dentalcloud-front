import type { DriveStep } from 'driver.js';
import { startTour } from '../lib/tour';

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <circle cx="12" cy="12" r="9.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 9.3a2.5 2.5 0 0 1 4.7 1.2c0 1.6-2.2 1.7-2.2 3.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="17.2" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth={1.2} />
    </svg>
  );
}

// Botón "Instrucciones" reutilizable — recibe los pasos del recorrido de
// ESTA pantalla/sección y arranca driver.js al hacer clic. Mismo patrón que
// ya usan Dental-Demo y el Portal de Pacientes.
//
// `storageKey`, si se pasa, hace que el recorrido se pueda REANUDAR: si el
// usuario lee un paso, cierra el tour para ir a hacerlo, y vuelve a apretar
// el botón más tarde, continúa donde quedó en vez de volver al paso 1. Se
// olvida (vuelve a empezar desde el 1) recién cuando termina el recorrido
// completo (botón "Listo").
//
// `floating`, si es true, dibuja el botón como una burbuja fija en la
// esquina de la pantalla en vez de un botón en línea con el resto del layout
// — para que quede siempre a mano mientras el usuario navega a otra pestaña
// a hacer lo que el paso del tour le pidió.
export function TourButton({
  steps,
  storageKey,
  floating,
  forceStartAt,
  onNavigate,
  label,
  className,
}: {
  steps: DriveStep[];
  storageKey?: string;
  floating?: boolean;
  // Si se pasa, el recorrido arranca SIEMPRE en este paso (ignora el
  // progreso guardado) — para cuando otra parte de la pantalla (ej. una
  // advertencia) sabe exactamente qué explicación mostrar y no quiere que el
  // usuario tenga que buscarla manualmente. El progreso guardado se sigue
  // actualizando normalmente desde ahí en adelante.
  forceStartAt?: number;
  // Si el recorrido explica contenido que vive en otra pestaña (no solo el
  // botón de la barra), este callback cambia la pestaña activa antes de
  // cada paso — ver `startTour`/`onNavigate` en `lib/tour.ts`.
  onNavigate?: (index: number) => void;
  label?: string;
  className?: string;
}) {
  function handleClick() {
    const startAt = forceStartAt ?? (storageKey ? Number(window.localStorage.getItem(storageKey) ?? 0) || 0 : 0);
    startTour(steps, {
      startAt,
      onNavigate,
      onStepChange: storageKey ? (index) => window.localStorage.setItem(storageKey, String(index)) : undefined,
      onDone: storageKey ? () => window.localStorage.removeItem(storageKey) : undefined,
    });
  }

  if (className) {
    return (
      <button type="button" onClick={handleClick} className={className}>
        <HelpIcon />
        {label ?? 'Instrucciones'}
      </button>
    );
  }

  if (floating) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Instrucciones"
        className="fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/40 transition-transform hover:scale-105 hover:bg-brand-700"
      >
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand-500/60" />
        <HelpIcon />
        Instrucciones
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
    >
      <HelpIcon />
      Instrucciones
    </button>
  );
}
