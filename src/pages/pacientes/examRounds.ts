import type { ExamPhoto } from '../../api/patients';

// Nombres de ángulo compartidos con el Examen Estético, para que una foto se
// llame igual en todas las pantallas.
export const SLOT_LABEL: Record<string, string> = {
  frontal: 'Frontal',
  perfilDerecho: 'Perfil derecho',
  perfilIzquierdo: 'Perfil izquierdo',
  '45derecha': '45° derecha',
  '45izquierda': '45° izquierda',
  espalda: 'Espalda',
};

// Orden en que se muestran, el mismo en que se toman.
const SLOT_ORDER = ['frontal', 'perfilDerecho', '45derecha', '45izquierda', 'perfilIzquierdo', 'espalda'];

function slotRank(slot: string): number {
  const index = SLOT_ORDER.indexOf(slot);
  return index === -1 ? SLOT_ORDER.length : index;
}

// Un avance tiene siempre 4 ángulos, pero el registro fotográfico guarda CADA
// captura como una foto nueva en vez de reemplazar la anterior (decisión de
// septiembre: antes se sobrescribía y se perdía la foto previa). Al retomar un
// ángulo varias veces, la ronda acumula repeticiones — se han visto rondas con
// 9 frontales de una misma sesión de pruebas.
//
// Para la ficha clínica lo que importa es la ÚLTIMA foto de cada ángulo; las
// anteriores son respaldo y se muestran sólo si alguien las pide.
export function latestBySlot(photos: ExamPhoto[]): ExamPhoto[] {
  const porSlot = new Map<string, ExamPhoto>();
  for (const photo of photos) {
    const actual = porSlot.get(photo.slot);
    if (!actual || photo.createdAt > actual.createdAt) porSlot.set(photo.slot, photo);
  }
  return [...porSlot.values()].sort((a, b) => slotRank(a.slot) - slotRank(b.slot));
}

export function sortedBySlot(photos: ExamPhoto[]): ExamPhoto[] {
  return [...photos].sort(
    (a, b) => slotRank(a.slot) - slotRank(b.slot) || a.createdAt.localeCompare(b.createdAt)
  );
}
