import type { Prestacion } from '../../api/catalogs';
import {
  ARCH_TEETH,
  QUADRANT_TEETH,
  SEXTANT_TEETH,
  SURFACE_LABELS,
  TOOTH_SURFACES,
  type OdontogramMode,
  type ToothSelection,
  type ToothSurface,
} from './Odontogram';

export type { OdontogramMode };

export interface OdontogramConfig {
  mode: OdontogramMode;
  markColor?: string;
  allowMultipleTeeth: boolean;
  defaultTeeth?: string[];
  defaultSurfaces?: ToothSurface[];
}

// Palabras clave usadas mientras el backend no entrega el modo de odontograma
// de cada prestación. Aislado aquí para poder reemplazarlo por datos reales
// del backend sin tocar la lógica de UI que lo consume.
const SESSION_KEYWORDS = [
  'blanqueamiento',
  'fluor',
  'consulta',
  'control',
  'destartraje',
  'limpieza',
  'examen',
  'sesion',
  'entrenamiento',
  'programa terapeutico',
];
const TOOTH_KEYWORDS = ['endodoncia', 'corona', 'implante', 'incrustacion', 'perno', 'munon', 'provisional', 'retiro'];
const SURFACE_KEYWORDS = ['restauracion', 'resina', 'obturacion', 'caries', 'carilla', 'sellante'];
const EXTRACTION_KEYWORDS = ['exodoncia', 'extraccion', 'extraer'];
const SEXTANT_KEYWORDS = ['sextante', 'por grupo', 'griupo'];
const ARCH_KEYWORDS = [
  'por arcada',
  'por arcadas',
  'arco maxilar completo',
  'arco mandibular completo',
  'protesis total superior',
  'protesis total inferior',
  'protesis hibrida superior',
  'protesis hibrida inferior',
  'protesis parcial',
  'sup. o inf. parcial',
  'sobredentadura',
  'dispositivo oclusal',
  'placa de alivio oclusal',
];
const WHOLE_MOUTH_ARCH_EXCEPTIONS = ['ambas arcadas', '2 arcadas', 'dos arcadas'];
const QUADRANT_KEYWORDS = ['cuadrante'];
const PER_TOOTH_PHRASES = ['por diente', 'x diente', 'por pieza'];

const DIACRITICS_PATTERN = new RegExp('[̀-ͯ]', 'g');

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(DIACRITICS_PATTERN, '').replace(/\s+/g, ' ').trim();
}

export const ODONTOGRAM_MODES: OdontogramMode[] = ['session', 'tooth', 'surface', 'extraction', 'cuadrante', 'sextante', 'arcada'];

export const ODONTOGRAM_MODE_LABELS: Record<OdontogramMode, string> = {
  session: 'Sesión (toda la boca)',
  tooth: 'Pieza completa',
  surface: 'Cara',
  extraction: 'Extracción',
  cuadrante: 'Cuadrante',
  sextante: 'Sextante',
  arcada: 'Arcada',
};

export function modeFromName(name: string): OdontogramMode {
  const normalized = normalize(name);
  if (EXTRACTION_KEYWORDS.some((k) => normalized.includes(k))) return 'extraction';
  if (WHOLE_MOUTH_ARCH_EXCEPTIONS.some((k) => normalized.includes(k))) return 'session';
  if (SEXTANT_KEYWORDS.some((k) => normalized.includes(k))) return 'sextante';
  if (ARCH_KEYWORDS.some((k) => normalized.includes(k))) return 'arcada';
  if (QUADRANT_KEYWORDS.some((k) => normalized.includes(k))) return 'cuadrante';
  if (SURFACE_KEYWORDS.some((k) => normalized.includes(k))) return 'surface';
  if (PER_TOOTH_PHRASES.some((k) => normalized.includes(k))) return 'tooth';
  if (TOOTH_KEYWORDS.some((k) => normalized.includes(k))) return 'tooth';
  if (SESSION_KEYWORDS.some((k) => normalized.includes(k))) return 'session';
  return 'tooth';
}

export function getOdontogramConfig(prestacion: Prestacion): OdontogramConfig {
  const mode = prestacion.odontogramMode ?? prestacion.odontogram_mode ?? modeFromName(prestacion.name);
  return {
    mode,
    markColor: prestacion.markColor ?? prestacion.mark_color,
    allowMultipleTeeth: prestacion.allowMultipleTeeth ?? prestacion.allow_multiple_teeth ?? true,
    defaultTeeth: prestacion.defaultTeeth ?? prestacion.default_teeth,
    defaultSurfaces: prestacion.defaultSurfaces ?? prestacion.default_surfaces,
  };
}

const SURFACE_ORDER: ToothSurface[] = ['top', 'right', 'bottom', 'left', 'center'];

function sortSurfaces(surfaces: ToothSurface[]): ToothSurface[] {
  const unique = new Set(surfaces);
  return SURFACE_ORDER.filter((s) => unique.has(s));
}

function sortTeeth(teeth: string[]): string[] {
  return [...teeth].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function joinWithY(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

// Separa una selección en un grupo por pieza — usado para que una prestación
// cobrada por pieza (no por grupo/cuadrante/arcada) genere una línea por cada
// una en vez de una sola línea con todas las piezas adentro.
export function splitSelectionByTooth(selection: ToothSelection[]): ToothSelection[][] {
  const byTooth = new Map<string, ToothSelection[]>();
  for (const sel of selection) {
    if (!byTooth.has(sel.tooth)) byTooth.set(sel.tooth, []);
    byTooth.get(sel.tooth)!.push(sel);
  }
  return Array.from(byTooth.values());
}

function groupByTooth(selection: ToothSelection[]): Map<string, ToothSurface[]> {
  const byTooth = new Map<string, ToothSurface[]>();
  for (const item of selection) {
    if (!byTooth.has(item.tooth)) byTooth.set(item.tooth, []);
    byTooth.get(item.tooth)!.push(item.surface);
  }
  return byTooth;
}

const ARCH_LABELS: Record<string, string> = { superior: 'Arcada superior', inferior: 'Arcada inferior' };

// Dada la lista de piezas seleccionadas bajo un modo por zona, deriva las
// etiquetas de zona (p.ej. "Cuadrante 1", "Sextante 2", "Arcada superior") en
// vez de listar cada pieza por separado.
function zoneLabelsFromTeeth(mode: OdontogramMode, teeth: string[]): string[] {
  const teethSet = new Set(teeth);
  if (mode === 'cuadrante') {
    return Object.entries(QUADRANT_TEETH)
      .filter(([, zoneTeeth]) => zoneTeeth.some((t) => teethSet.has(t)))
      .map(([key]) => `Cuadrante ${key}`);
  }
  if (mode === 'sextante') {
    return Object.entries(SEXTANT_TEETH)
      .filter(([, zoneTeeth]) => zoneTeeth.some((t) => teethSet.has(t)))
      .map(([key]) => `Sextante ${key}`);
  }
  if (mode === 'arcada') {
    return Object.entries(ARCH_TEETH)
      .filter(([, zoneTeeth]) => zoneTeeth.some((t) => teethSet.has(t)))
      .map(([key]) => ARCH_LABELS[key] ?? key);
  }
  return [];
}

// Texto legible completo (usado en el resumen provisional, el detalle bajo
// el nombre de la prestación en la tabla, y como toothNumber para el backend).
export function formatOdontogramSelection(mode: OdontogramMode, selection: ToothSelection[]): string {
  if (mode === 'session') return 'Sesión completa';

  const byTooth = groupByTooth(selection);
  const teeth = sortTeeth(Array.from(byTooth.keys()));
  if (teeth.length === 0) return '';

  if (mode === 'extraction') return `Piezas a extraer: ${joinWithY(teeth)}`;
  if (mode === 'tooth') return `Piezas: ${joinWithY(teeth)}`;
  if (mode === 'cuadrante' || mode === 'sextante' || mode === 'arcada') {
    const zones = zoneLabelsFromTeeth(mode, teeth);
    return zones.length > 0 ? joinWithY(zones) : `Piezas: ${joinWithY(teeth)}`;
  }

  // surface
  return teeth
    .map((tooth) => `${tooth}: ${sortSurfaces(byTooth.get(tooth)!).map((s) => SURFACE_LABELS[s]).join(', ')}`)
    .join(' · ');
}

// Etiqueta corta para la primera columna ("Área") de la tabla.
export function areaLabel(mode: OdontogramMode): string {
  if (mode === 'session') return 'Sesión';
  if (mode === 'extraction') return 'Extracción';
  if (mode === 'cuadrante') return 'Cuadrante';
  if (mode === 'sextante') return 'Sextante';
  if (mode === 'arcada') return 'Arcada';
  return 'Piezas';
}

export function toothNumberForBackend(mode: OdontogramMode, selection: ToothSelection[]): string | null {
  if (mode === 'session') return 'Sesión';
  const text = formatOdontogramSelection(mode, selection);
  return text || null;
}

export function selectionFromDefaults(defaultTeeth?: string[], defaultSurfaces?: ToothSurface[]): ToothSelection[] {
  if (!defaultTeeth || defaultTeeth.length === 0) return [];
  const surfaces = defaultSurfaces && defaultSurfaces.length > 0 ? defaultSurfaces : [...TOOTH_SURFACES];
  return defaultTeeth.flatMap((tooth) => surfaces.map((surface) => ({ tooth, surface })));
}
