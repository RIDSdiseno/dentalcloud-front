import type { DriveStep } from 'driver.js';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Botón "Instrucciones" global (16/09): antes solo existía dentro de la
// Ficha Paciente estética (EstheticWorkflowStepper). Oscar pidió que
// aparezca en TODOS los módulos, siga al usuario al navegar, y explique lo
// que hay en la pantalla donde está parado — para clínicas dental, estética
// y "ambas" por igual.
//
// Cada entrada mapea una ruta a sus propios pasos (driver.js) + su propia
// `storageKey` (para poder reanudar un recorrido interrumpido). El botón se
// remonta (`key={storageKey}`) cada vez que cambia de módulo — así nunca
// arrastra el estado/progreso del módulo anterior (el mismo bug que hubo una
// vez en el recorrido de la Ficha Paciente: Rx → Documentos clínicos volvía
// a mostrar el paso de Rx).
export type ModuleTourEntry = {
  steps: DriveStep[];
  storageKey: string;
};

function step(element: string, title: string, description: string): DriveStep {
  return { element, popover: { title, description } };
}

const DASHBOARD_TOUR: DriveStep[] = [
  step('#dashboard-header', 'Bienvenido', 'Tu pantalla de inicio al entrar a DentalCloud. Acá vas a ver un resumen del día.'),
  step('#dashboard-favoritos', 'Favoritos', 'Próximamente vas a poder fijar acá los pacientes o accesos que uses más seguido.'),
  step('#dashboard-proximas-citas', 'Próximas citas de hoy', 'Un vistazo rápido a lo que viene en tu agenda de hoy, sin tener que entrar a Agenda.'),
  step('#dashboard-novedades', 'Últimas novedades', 'Acá vas a ver avisos y novedades de la clínica o de la plataforma.'),
];

const AGENDA_TOUR: DriveStep[] = [
  step('#agenda-header', 'Agenda general', 'Muestra todos los sillones y las citas del día seleccionado, para toda la clínica.'),
  step('#agenda-nueva-cita-btn', 'Nueva cita', 'Agenda una cita eligiendo paciente, profesional, sillón y horario.'),
  step('#agenda-urgencia-btn', 'Atender urgencia', 'Agenda una atención de urgencia, saltándose el flujo normal de horas cuando no hay tiempo que perder.'),
  step('#agenda-sillon-btn', 'Sillón', 'Agrega un nuevo sillón a la clínica — cada sillón es una columna en la grilla de abajo.'),
  step('#agenda-day-tabs', 'Días de la semana', 'Cambia rápido entre los días para revisar o agendar en otra fecha.'),
  step('#agenda-grid', 'Grilla de sillones', 'Cada columna es un sillón y cada bloque una cita. Toca un espacio libre para agendar, o una cita para verla/editarla.'),
];

const SILLONES_LIBRES_TOUR: DriveStep[] = [
  step('#sillones-header', 'Sillones libres', 'Vista semanal para encontrar rápido qué horas están disponibles en cada sillón.'),
  step('#sillones-chair-tabs', 'Elige el sillón', 'Cambia de sillón para ver su disponibilidad de la semana.'),
  step('#sillones-grid', 'Disponibilidad de la semana', 'Los espacios en blanco son horas libres — tócalos para agendar una cita ahí mismo.'),
];

const AGENDA_DIARIA_TOUR: DriveStep[] = [
  step('#diaria-header', 'Agenda diaria', 'Vista simple del día, en lista, con tus citas (o las de todos, si eres admin).'),
  step('#diaria-nueva-hora-btn', 'Agregar horas disponibles', 'Publica horas libres para que se puedan tomar después, sin tener un paciente asignado todavía.'),
  step('#diaria-nueva-cita-btn', 'Nueva cita', 'Agenda una cita directo desde acá.'),
  step('#diaria-timeline', 'Línea de tiempo del día', 'Citas y horas publicadas, ordenadas por horario. Toca una cita para verla o editarla.'),
];

const PACIENTES_LISTA_TOUR: DriveStep[] = [
  step('#pacientes-header', 'Pacientes', 'Listado de todos los pacientes de la clínica.'),
  step('#pacientes-nuevo-btn', 'Nuevo paciente', 'Crea una ficha nueva con los datos básicos del paciente.'),
  step('#pacientes-search', 'Buscar', 'Busca por nombre, apellido o RUT.'),
  step('#pacientes-filtros', 'Filtros de consentimiento', 'Filtra la lista según el estado del consentimiento de protección de datos de cada paciente.'),
  step('#pacientes-tabla', 'Lista de pacientes', 'Toca cualquier fila para abrir la ficha completa de ese paciente.'),
];

const FICHA_PACIENTE_DENTAL_TOUR: DriveStep[] = [
  step('#ficha-header-card', 'Ficha del paciente', 'Datos básicos, foto y alergias del paciente, siempre visibles arriba.'),
  step('#ficha-nueva-cita-btn', 'Nueva cita', 'Agenda una cita para este paciente en particular.'),
  step('#ficha-editar-btn', 'Editar', 'Modifica los datos personales y de contacto del paciente.'),
  step('#ficha-tabs-dental', 'Pestañas de la ficha', 'Cada pestaña es una parte distinta de la atención: datos, horas, tratamientos, evoluciones, cartola, observaciones, documentos clínicos, Rx y consentimientos.'),
];

const PRESUPUESTOS_TOUR: DriveStep[] = [
  step('#presupuestos-header', 'Presupuesto', 'Todos los planes de tratamiento (presupuestos) creados en la clínica, de cualquier paciente y profesional.'),
  step('#presupuestos-nuevo-btn', 'Nuevo presupuesto', 'Elige un paciente para armarle un presupuesto nuevo con las prestaciones del catálogo.'),
  step('#presupuestos-tabla', 'Lista de presupuestos', 'Toca el nombre del paciente para ir directo a su ficha y ver el detalle del presupuesto.'),
];

const PAGOS_CONSULTA_TOUR: DriveStep[] = [
  step('#pagos-header', 'Pagos de Consulta', 'Registro de quién ya pagó su consulta antes de ser atendido — es solo informativo.'),
  step('#pagos-form', 'Registrar pago', 'Anota el pago de un paciente antes de que pase a la atención.'),
  step('#pagos-tabla', 'Pagos registrados', 'Historial de todos los pagos de consulta registrados.'),
];

const PROFESIONALES_TOUR: DriveStep[] = [
  step('#profesionales-header', 'Profesionales', 'Usuarios del sistema: administradores, odontólogos, esteticistas, operadores, etc.'),
  step('#profesionales-importar-btn', 'Importar desde RIDS RX', 'Trae profesionales ya existentes en RIDS RX para no tener que cargarlos a mano.'),
  step('#profesionales-nuevo-btn', 'Agregar profesional', 'Crea un nuevo usuario y define su rol dentro de la clínica.'),
  step('#profesionales-tabla', 'Lista de profesionales', 'Desde acá editas el RUT, das permisos específicos y defines el horario de cada uno.'),
  step('#profesionales-permisos-perfil', 'Permisos por perfil', 'Configura qué puede hacer cada ROL (no cada persona) — por ejemplo, si todos los operadores pueden editar el motivo de consulta.'),
];

const CATALOGO_TOUR: DriveStep[] = [
  step('#catalogo-header', 'Catálogo', 'Acá se administra todo lo que la clínica puede cobrar y usar: prestaciones, convenios, previsiones, inventario y productos de marca.'),
  step('#catalogo-tabs', 'Secciones del catálogo', 'Cambia entre Prestaciones, Convenios, Previsiones, Clínicas, Inventario y Productos y Marcas — cada una es su propia lista.'),
  step('#catalogo-nueva-prestacion-btn', 'Nueva prestación', 'Agrega un procedimiento o servicio nuevo con su precio.'),
  step('#catalogo-tabla', 'Lista de prestaciones', 'Activa, desactiva, edita o elimina cada prestación desde acá.'),
];

const CONFIGURACION_TOUR: DriveStep[] = [
  step('#configuracion-nav', 'Secciones de configuración', 'Cada botón es una parte distinta de la configuración de tu clínica — algunas ya están disponibles y otras se irán habilitando.'),
  step('#configuracion-contenido', 'Contenido de la sección', 'Lo que ves acá cambia según la sección que elijas a la izquierda.'),
];

function isEsteticaOrAmbas(clinicaTipo: string | null | undefined) {
  return clinicaTipo === 'estetica' || clinicaTipo === 'ambas';
}

// Devuelve el recorrido para la ruta actual, o `null` si esta pantalla no
// tiene uno (todavía) o ya tiene su propio botón de instrucciones específico
// (ej. la Ficha Paciente de clínicas estéticas/ambas, que ya trae el suyo
// dentro de EstheticWorkflowStepper — mostrar dos burbujas flotantes
// pisadas una sobre otra sería peor que no mostrar ninguna).
function resolveModuleTour(pathname: string, clinicaTipo: string | null | undefined): ModuleTourEntry | null {
  if (pathname === '/') return { steps: DASHBOARD_TOUR, storageKey: 'modulo-tour:dashboard' };
  if (pathname === '/agenda') return { steps: AGENDA_TOUR, storageKey: 'modulo-tour:agenda' };
  if (pathname === '/agenda/sillones-libres') return { steps: SILLONES_LIBRES_TOUR, storageKey: 'modulo-tour:sillones-libres' };
  if (pathname === '/agenda/diaria') return { steps: AGENDA_DIARIA_TOUR, storageKey: 'modulo-tour:agenda-diaria' };
  if (pathname === '/pacientes') return { steps: PACIENTES_LISTA_TOUR, storageKey: 'modulo-tour:pacientes-lista' };
  if (/^\/pacientes\/[^/]+$/.test(pathname)) {
    if (isEsteticaOrAmbas(clinicaTipo)) return null;
    return { steps: FICHA_PACIENTE_DENTAL_TOUR, storageKey: 'modulo-tour:ficha-dental' };
  }
  if (pathname === '/presupuestos') return { steps: PRESUPUESTOS_TOUR, storageKey: 'modulo-tour:presupuestos' };
  if (pathname === '/pagos-consulta') return { steps: PAGOS_CONSULTA_TOUR, storageKey: 'modulo-tour:pagos-consulta' };
  if (pathname === '/profesionales') return { steps: PROFESIONALES_TOUR, storageKey: 'modulo-tour:profesionales' };
  if (pathname === '/catalogo') return { steps: CATALOGO_TOUR, storageKey: 'modulo-tour:catalogo' };
  if (pathname === '/configuracion') return { steps: CONFIGURACION_TOUR, storageKey: 'modulo-tour:configuracion' };
  return null;
}

export function useModuleTour(): ModuleTourEntry | null {
  const { pathname } = useLocation();
  const { user } = useAuth();
  return resolveModuleTour(pathname, user?.clinicaTipo);
}
