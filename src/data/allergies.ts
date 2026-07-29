// Vocabulario fijo de alergias relevantes en una clínica dental. Debe mantenerse
// en sync con dentalcloud-backend/src/lib/allergies.ts. Es la fuente única para
// el formulario de edición del paciente, las píldoras de la ficha, y el cruce
// automático contra prestaciones (ver pages/pacientes/allergenDetection.ts).
export type AllergyKey =
  | 'fluoruro'
  | 'penicilina'
  | 'anestesicos_locales'
  | 'latex'
  | 'yodo'
  | 'niquel_metales'
  | 'aines'
  | 'sulfitos'
  | 'otro';

export const ALLERGY_OPTIONS: { key: AllergyKey; label: string }[] = [
  { key: 'fluoruro', label: 'Flúor / fluoruro' },
  { key: 'penicilina', label: 'Penicilina / antibióticos betalactámicos' },
  { key: 'anestesicos_locales', label: 'Anestésicos locales (lidocaína, articaína, etc.)' },
  { key: 'latex', label: 'Látex' },
  { key: 'yodo', label: 'Yodo / povidona yodada' },
  { key: 'niquel_metales', label: 'Níquel / metales' },
  { key: 'aines', label: 'AINEs (ibuprofeno, aspirina, etc.)' },
  { key: 'sulfitos', label: 'Sulfitos' },
  { key: 'otro', label: 'Otra' },
];

export const ALLERGY_LABEL: Record<AllergyKey, string> = Object.fromEntries(
  ALLERGY_OPTIONS.map((o) => [o.key, o.label])
) as Record<AllergyKey, string>;
