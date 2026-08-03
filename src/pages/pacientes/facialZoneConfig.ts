import type { Prestacion } from '../../api/catalogs';
import type { OdontogramMode, ToothSelection } from './Odontogram';

// Zonas del rostro disponibles en el mapa facial (ver FacialMap.tsx), unión de
// las zonas trabajadas con Ácido Hialurónico y Toxina Botulínica.
export const FACIAL_ZONES = [
  'frente',
  'entrecejo',
  'sienes',
  'parpados',
  'patas_gallo',
  'ojeras',
  'pomulos',
  'nariz',
  'nasogenianos',
  'codigo_barras',
  'labios',
  'menton',
  'mandibula',
  'cuello',
] as const;

export type FacialZoneKey = (typeof FACIAL_ZONES)[number];

export const FACIAL_ZONE_LABELS: Record<FacialZoneKey, string> = {
  frente: 'Frente',
  entrecejo: 'Entrecejo',
  sienes: 'Sienes',
  parpados: 'Párpados',
  patas_gallo: 'Patas de gallo',
  ojeras: 'Ojeras',
  pomulos: 'Pómulos',
  nariz: 'Nariz',
  nasogenianos: 'Nasogenianos',
  codigo_barras: 'Código de barras',
  labios: 'Labios',
  menton: 'Mentón',
  mandibula: 'Mandíbula',
  cuello: 'Cuello',
};

export interface FacialConfig {
  mode: OdontogramMode;
  allowMultipleZones: boolean;
}

// Trazos dibujados a mano sobre el mapa facial (ver FacialMap.tsx) — se
// definen aquí (no en FacialMap.tsx) para que la capa de API (treatmentPlans.ts)
// pueda tiparlos sin depender de un componente de página.
export type FacialPoint = { x: number; y: number };
export type FacialStroke =
  | { id: string; tool: 'lapiz'; points: FacialPoint[] }
  | { id: string; tool: 'linea'; from: FacialPoint; to: FacialPoint }
  | { id: string; tool: 'circulo'; center: FacialPoint; radius: number };

export type FacialAnnotations = {
  frontal: FacialStroke[];
  perfilDerecho: FacialStroke[];
  perfilIzquierdo: FacialStroke[];
};

export const EMPTY_FACIAL_ANNOTATIONS: FacialAnnotations = {
  frontal: [],
  perfilDerecho: [],
  perfilIzquierdo: [],
};

// A diferencia del odontograma, una prestación de estética facial siempre se
// resuelve eligiendo una o más zonas del rostro — no requiere heurística de
// palabras clave sobre el nombre de la prestación.
export function getFacialConfig(_prestacion: Prestacion): FacialConfig {
  return { mode: 'tooth', allowMultipleZones: true };
}

function joinWithY(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function zoneLabel(zone: string): string {
  return FACIAL_ZONE_LABELS[zone as FacialZoneKey] ?? zone;
}

function zonesFromSelection(selection: ToothSelection[]): string[] {
  return Array.from(new Set(selection.map((s) => s.tooth)));
}

export function formatFacialSelection(mode: OdontogramMode, selection: ToothSelection[]): string {
  if (mode === 'session') return 'Todo el rostro';
  const zones = zonesFromSelection(selection);
  if (zones.length === 0) return '';
  return `Zonas: ${joinWithY(zones.map(zoneLabel))}`;
}

export function zoneAreaLabel(mode: OdontogramMode): string {
  return mode === 'session' ? 'Rostro completo' : 'Zonas';
}

export function zoneNumberForBackend(mode: OdontogramMode, selection: ToothSelection[]): string | null {
  if (mode === 'session') return 'Todo el rostro';
  const zones = zonesFromSelection(selection);
  if (zones.length === 0) return null;
  return zones.map(zoneLabel).join(', ');
}

const LABEL_TO_ZONE: Record<string, FacialZoneKey> = Object.fromEntries(
  FACIAL_ZONES.map((zone) => [FACIAL_ZONE_LABELS[zone], zone])
);

// `toothNumber` en TreatmentItem guarda las etiquetas ya formateadas (ej.
// "Frente, Mentón" o "Todo el rostro"), no las keys crudas — este helper las
// vuelve a mapear a keys de FACIAL_ZONES para poder resaltarlas en el mapa
// facial (ver historial de zonas tratadas en TreatmentPlanTab).
export function parseTreatedZones(toothNumber: string | null): FacialZoneKey[] {
  if (!toothNumber) return [];
  return toothNumber
    .split(',')
    .map((label) => LABEL_TO_ZONE[label.trim()])
    .filter((zone): zone is FacialZoneKey => zone !== undefined);
}
