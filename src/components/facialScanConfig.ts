// Secuencia del escaneo facial guiado ("Fotográfico avanzado — demo").
// Vive en su propio archivo y no dentro de FacialScanModal porque la pestaña
// del examen también la necesita (para saber qué ángulos le faltan a la ronda
// antes de abrir el modal), y un archivo que exporta componentes y constantes
// a la vez rompe el fast refresh de Vite.

export type ScanSlot = 'frontal' | 'perfilDerecho' | '45derecha' | '45izquierda';

// El orden importa: es el que va pidiendo el escaneo. Frontal primero, y
// después el giro completo hacia un lado antes de cruzar al otro, para que el
// paciente no tenga que ir y volver de un extremo al otro.
export const SCAN_SEQUENCE: { slot: ScanSlot; label: string; instruction: string }[] = [
  {
    slot: 'frontal',
    label: 'Frontal',
    instruction: 'Pida al paciente que mire directo a la cámara, con la cabeza recta.',
  },
  {
    slot: '45derecha',
    label: '45° Derecha',
    instruction: 'Pida al paciente que gire la cabeza hacia SU derecha, a medio camino.',
  },
  {
    slot: 'perfilDerecho',
    label: 'Perfil Derecho',
    instruction: 'Pida al paciente que siga girando a SU derecha hasta mostrar el perfil completo.',
  },
  {
    slot: '45izquierda',
    label: '45° Izquierda',
    instruction: 'Pida al paciente que gire la cabeza hacia SU izquierda, a medio camino.',
  },
];
