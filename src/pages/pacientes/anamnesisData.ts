// Los 8 bloques de anamnesis dictados por Urbina (reunión 2/9, Etapa 03), en
// el orden exacto que pidió — mismo shape que el backend (src/lib/anamnesisData.ts).
// Medicación actual y alergias (bloques 5 y 6) ya viven en sus propios campos
// de Patient (currentMedications/allergies/allergyNotes) desde antes.
// Las 11 condiciones exactas del mockup de Urbina (reunión 2/9), cada una
// con su propio Sí/No/Desconoce — no una lista de "marca las que aplican".
// Ajustado el 15/09 tras comparar contra las capturas reales de la reunión.
export const ANAMNESIS_PATHOLOGY_KEYS = [
  'hipertension',
  'diabetes',
  'autoinmune',
  'coagulacion',
  'tiroides',
  'hepatica',
  'renal',
  'cancer',
  'herpes',
  'embarazo',
  'lactancia',
] as const;
export type AnamnesisPathologyKey = (typeof ANAMNESIS_PATHOLOGY_KEYS)[number];

export const ANAMNESIS_PATHOLOGY_LABEL: Record<AnamnesisPathologyKey, string> = {
  hipertension: 'Hipertensión',
  diabetes: 'Diabetes',
  autoinmune: 'Enfermedades autoinmunes',
  coagulacion: 'Trastornos de coagulación',
  tiroides: 'Enfermedad tiroidea',
  hepatica: 'Enfermedad hepática',
  renal: 'Enfermedad renal',
  cancer: 'Cáncer',
  herpes: 'Herpes recurrente',
  embarazo: 'Embarazo',
  lactancia: 'Lactancia',
};

export const ANAMNESIS_HABIT_KEYS = ['tabaco', 'alcohol', 'exposicion_solar', 'sedentarismo'] as const;
export type AnamnesisHabitKey = (typeof ANAMNESIS_HABIT_KEYS)[number];

export const ANAMNESIS_HABIT_LABEL: Record<AnamnesisHabitKey, string> = {
  tabaco: 'Tabaco',
  alcohol: 'Alcohol',
  exposicion_solar: 'Exposición solar frecuente',
  sedentarismo: 'Sedentarismo',
};

export type YesNoDetail = { tiene: boolean | null; detalle: string };

// 'si' | 'no' | 'desconoce' | null (null = todavía sin marcar) — un valor
// independiente por condición, igual al mockup real.
export type MorbidStatus = 'si' | 'no' | 'desconoce' | null;
export type AntecedentesMorbidos = Record<AnamnesisPathologyKey, MorbidStatus>;

export type AnamnesisData = {
  antecedentesMorbidos: AntecedentesMorbidos;
  antecedentesMorbidosOtro: string;
  quirurgicosEsteticos: YesNoDetail;
  procedimientoPrevio: { tiene: boolean | null; tipo: string; zona: string; fecha: string };
  complicacionesPrevias: YesNoDetail;
  antecedentesFamiliares: YesNoDetail;
  habitos: AnamnesisHabitKey[];
  habitosOtro: string;
};

export const EMPTY_ANTECEDENTES_MORBIDOS: AntecedentesMorbidos = Object.fromEntries(
  ANAMNESIS_PATHOLOGY_KEYS.map((key) => [key, null])
) as AntecedentesMorbidos;

export const EMPTY_ANAMNESIS_DATA: AnamnesisData = {
  antecedentesMorbidos: EMPTY_ANTECEDENTES_MORBIDOS,
  antecedentesMorbidosOtro: '',
  quirurgicosEsteticos: { tiene: null, detalle: '' },
  procedimientoPrevio: { tiene: null, tipo: '', zona: '', fecha: '' },
  complicacionesPrevias: { tiene: null, detalle: '' },
  antecedentesFamiliares: { tiene: null, detalle: '' },
  habitos: [],
  habitosOtro: '',
};

const MORBID_STATUS_VALUES = ['si', 'no', 'desconoce'] as const;

function sanitizeMorbidStatus(raw: unknown): MorbidStatus {
  return typeof raw === 'string' && (MORBID_STATUS_VALUES as readonly string[]).includes(raw)
    ? (raw as MorbidStatus)
    : null;
}

// Migra el formato viejo (array de keys marcadas = "tenía") a falta de otra
// info, para no perder lo ya cargado antes del 15/09.
function normalizeAntecedentesMorbidos(raw: unknown): AntecedentesMorbidos {
  if (Array.isArray(raw)) {
    const result = { ...EMPTY_ANTECEDENTES_MORBIDOS };
    for (const key of ANAMNESIS_PATHOLOGY_KEYS) {
      if (raw.includes(key)) result[key] = 'si';
    }
    return result;
  }
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const result = { ...EMPTY_ANTECEDENTES_MORBIDOS };
  for (const key of ANAMNESIS_PATHOLOGY_KEYS) {
    result[key] = sanitizeMorbidStatus(obj[key]);
  }
  return result;
}

export function normalizeAnamnesisData(raw: unknown): AnamnesisData {
  if (!raw || typeof raw !== 'object') return EMPTY_ANAMNESIS_DATA;
  const obj = raw as Partial<AnamnesisData>;
  return {
    antecedentesMorbidos: normalizeAntecedentesMorbidos(obj.antecedentesMorbidos),
    antecedentesMorbidosOtro: obj.antecedentesMorbidosOtro ?? '',
    quirurgicosEsteticos: { tiene: obj.quirurgicosEsteticos?.tiene ?? null, detalle: obj.quirurgicosEsteticos?.detalle ?? '' },
    procedimientoPrevio: {
      tiene: obj.procedimientoPrevio?.tiene ?? null,
      tipo: obj.procedimientoPrevio?.tipo ?? '',
      zona: obj.procedimientoPrevio?.zona ?? '',
      fecha: obj.procedimientoPrevio?.fecha ?? '',
    },
    complicacionesPrevias: { tiene: obj.complicacionesPrevias?.tiene ?? null, detalle: obj.complicacionesPrevias?.detalle ?? '' },
    antecedentesFamiliares: {
      tiene: obj.antecedentesFamiliares?.tiene ?? null,
      detalle: obj.antecedentesFamiliares?.detalle ?? '',
    },
    habitos: Array.isArray(obj.habitos) ? obj.habitos : [],
    habitosOtro: obj.habitosOtro ?? '',
  };
}
