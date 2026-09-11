import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

// Recorrido guiado por pantalla (botón "Instrucciones"): resalta un
// elemento a la vez con un texto explicando qué es, y "Siguiente" avanza al
// próximo. `skipMissingElement` deja pasos que apuntan a algo que puede no
// existir en este momento sin que el recorrido se rompa. Mismo patrón que ya
// usan Dental-Demo y el Portal de Pacientes.
export function startTour(
  steps: DriveStep[],
  options?: {
    // Con qué paso empezar (para reanudar un recorrido interrumpido en vez de
    // reiniciarlo siempre desde el 1).
    startAt?: number;
    // Se llama cada vez que se muestra un paso — quien llama puede guardar
    // el índice (ej. en localStorage) para poder reanudar después.
    onStepChange?: (index: number) => void;
    // Se llama solo cuando el usuario termina el recorrido completo
    // (botón "Listo" del último paso), no al cerrarlo a medias con la X.
    onDone?: () => void;
    // Se llama ANTES de mostrar el paso `index` — si ese paso vive dentro de
    // una pestaña que no es la activa (ej. "Motivo de consulta" está en la
    // pestaña Datos), acá se cambia de pestaña para que el elemento real
    // exista quando driver.js lo busque. `waitForElement` (abajo) le da
    // tiempo a React de renderizar esa pestaña antes de que el recorrido se
    // dé por vencido buscando el elemento.
    onNavigate?: (index: number) => void;
  }
) {
  function goTo(index: number) {
    options?.onNavigate?.(index);
    // Con animate:true, moveNext/moveTo/movePrevious internamente llaman a
    // requestAnimationFrame antes de recalcular posición — alcanza a esperar
    // el siguiente render de React sin necesidad de un setTimeout manual.
    if (index > (tour.getActiveIndex() ?? 0)) tour.moveNext();
    else tour.movePrevious();
  }

  const tour = driver({
    steps,
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Listo',
    overlayColor: '#0b4763',
    overlayOpacity: 0.65,
    stagePadding: 6,
    stageRadius: 10,
    smoothScroll: true,
    skipMissingElement: true,
    // El elemento del paso puede vivir en una pestaña todavía no activa (ver
    // onNavigate) — le da hasta 1.5s a React para renderizarla antes de
    // continuar sin resaltar nada.
    waitForElement: 1500,
    onNextClick: () => {
      const idx = tour.getActiveIndex();
      goTo((idx ?? 0) + 1);
    },
    onPrevClick: () => {
      const idx = tour.getActiveIndex();
      goTo((idx ?? 0) - 1);
    },
    // Sin esto, el elemento resaltado queda clickeable de verdad — si el
    // recorrido resalta un botón real de la pantalla (ej. "Siguiente: X" del
    // stepper de Estética), un clic ahí dispara la acción real de la app
    // (cambia de pestaña) y deja al recorrido en un estado raro, en vez de
    // solo avanzar el tour. El botón "Siguiente" del popover del tour sigue
    // funcionando igual — este flag solo bloquea el elemento de fondo.
    disableActiveInteraction: true,
    popoverClass: 'app-tour-popover',
    // El elemento resaltado puede estar dentro de una barra con scroll
    // horizontal propio (ej. el stepper de Estética) — el scrollIntoView de
    // driver.js no siempre alcanza a moverla. Por eso el scroll se hace ACÁ,
    // en onHighlightStarted (ANTES de que driver.js mida y dibuje el recuadro
    // de resaltado) y sin animación (`behavior: 'auto'`): si se hiciera en
    // onHighlighted (después) o con scroll suave, el recuadro queda dibujado
    // en la posición vieja mientras el elemento ya se movió — el texto del
    // paso se ve bien pero el resaltado queda pegado al paso anterior.
    onHighlightStarted: (element) => {
      element?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    },
    onHighlighted: (_element, _step, opts) => {
      if (typeof opts.index === 'number') options?.onStepChange?.(opts.index);
    },
    onDoneClick: () => {
      options?.onDone?.();
      tour.destroy();
    },
  });
  const startAt = options?.startAt ?? 0;
  options?.onNavigate?.(startAt);
  tour.drive(startAt);
  return tour;
}
