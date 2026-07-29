import type { AllergyKey } from '../../data/allergies';

// Palabras clave usadas mientras el catálogo de Prestacion no tenga un campo
// explícito de alérgenos/componentes. Mismo espíritu que las palabras clave de
// odontogramConfig.ts: un workaround aislado para poder reemplazarlo por datos
// reales del backend sin tocar la lógica que lo consume.
const KEYWORD_TO_ALLERGY: Array<{ keywords: string[]; allergy: AllergyKey }> = [
  { keywords: ['fluor'], allergy: 'fluoruro' },
  { keywords: ['anestesi', 'lidocaina', 'articaina', 'mepivacaina'], allergy: 'anestesicos_locales' },
  { keywords: ['penicilina', 'amoxicilina', 'betalactamico'], allergy: 'penicilina' },
  { keywords: ['latex'], allergy: 'latex' },
  { keywords: ['yodo', 'povidona'], allergy: 'yodo' },
  { keywords: ['niquel', 'metal'], allergy: 'niquel_metales' },
  { keywords: ['ibuprofeno', 'aspirina', 'aine'], allergy: 'aines' },
];

const DIACRITICS_PATTERN = new RegExp('[̀-ͯ]', 'g');

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(DIACRITICS_PATTERN, '').replace(/\s+/g, ' ').trim();
}

export function detectAllergensInPrestacion(name: string): AllergyKey[] {
  const normalized = normalize(name);
  const matches = KEYWORD_TO_ALLERGY.filter(({ keywords }) => keywords.some((k) => normalized.includes(k)));
  return matches.map((m) => m.allergy);
}
