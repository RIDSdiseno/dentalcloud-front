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
    // La clave sigue siendo 'perfilDerecho' porque así se guarda en la base y
    // así la valida el backend; lo que cambia es que en el escaneo ya no se
    // pide un lado concreto. Se etiqueta solo "Perfil" y sirve cualquiera de
    // los dos: exigir el derecho hacía que la toma fallara cuando el paciente
    // giraba al otro lado, y para el examen la vista de perfil es la misma.
    slot: 'perfilDerecho',
    label: 'Perfil',
    instruction: 'Pida al paciente que gire la cabeza hasta mostrar el perfil completo, hacia cualquier lado.',
  },
  {
    slot: '45izquierda',
    label: '45° Izquierda',
    instruction: 'Pida al paciente que gire la cabeza hacia SU izquierda, a medio camino.',
  },
];
