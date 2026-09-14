// Los 8 bloques de anamnesis dictados por Urbina (reunión 2/9, Etapa 03), en
// el orden exacto que pidió — mismo shape que el backend (src/lib/anamnesisData.ts).
// Medicación actual y alergias (bloques 5 y 6) ya viven en sus propios campos
// de Patient (currentMedications/allergies/allergyNotes) desde antes.
export const ANAMNESIS_PATHOLOGY_KEYS = [
  'hipertension',
  'diabetes',
  'tiroides',
  'coagulacion',
  'autoinmune',
  'cardiopatia',
  'embarazo',
] as const;
export type AnamnesisPathologyKey = (typeof ANAMNESIS_PATHOLOGY_KEYS)[number];

export const ANAMNESIS_PATHOLOGY_LABEL: Record<AnamnesisPathologyKey, string> = {
  hipertension: 'Hipertensión',
  diabetes: 'Diabetes',
  tiroides: 'Enfermedad tiroidea',
  coagulacion: 'Trastornos de coagulación',
  autoinmune: 'Enfermedad autoinmune',
  cardiopatia: 'Cardiopatía',
  embarazo: 'Embarazo',
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

export type AnamnesisData = {
  antecedentesMorbidos: AnamnesisPathologyKey[];
  antecedentesMorbidosOtro: string;
  quirurgicosEsteticos: YesNoDetail;
  procedimientoPrevio: { tiene: boolean | null; tipo: string; zona: string; fecha: string };
  complicacionesPrevias: YesNoDetail;
  antecedentesFamiliares: YesNoDetail;
  habitos: AnamnesisHabitKey[];
  habitosOtro: string;
};

export const EMPTY_ANAMNESIS_DATA: AnamnesisData = {
  antecedentesMorbidos: [],
  antecedentesMorbidosOtro: '',
  quirurgicosEsteticos: { tiene: null, detalle: '' },
  procedimientoPrevio: { tiene: null, tipo: '', zona: '', fecha: '' },
  complicacionesPrevias: { tiene: null, detalle: '' },
  antecedentesFamiliares: { tiene: null, detalle: '' },
  habitos: [],
  habitosOtro: '',
};

export function normalizeAnamnesisData(raw: unknown): AnamnesisData {
  if (!raw || typeof raw !== 'object') return EMPTY_ANAMNESIS_DATA;
  const obj = raw as Partial<AnamnesisData>;
  return {
    antecedentesMorbidos: Array.isArray(obj.antecedentesMorbidos) ? obj.antecedentesMorbidos : [],
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
