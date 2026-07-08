export type Country = {
  name: string;
  dialCode: string;
  /** ISO 3166-1 alpha-2 code, used to fetch the flag image from flagcdn.com */
  code: string;
};

export const COUNTRIES: Country[] = [
  // Europa
  { name: 'España', dialCode: '+34', code: 'es' },
  { name: 'Francia', dialCode: '+33', code: 'fr' },
  { name: 'Alemania', dialCode: '+49', code: 'de' },
  { name: 'Italia', dialCode: '+39', code: 'it' },
  { name: 'Portugal', dialCode: '+351', code: 'pt' },
  { name: 'Reino Unido', dialCode: '+44', code: 'gb' },
  { name: 'Países Bajos', dialCode: '+31', code: 'nl' },
  { name: 'Bélgica', dialCode: '+32', code: 'be' },
  { name: 'Suiza', dialCode: '+41', code: 'ch' },
  { name: 'Austria', dialCode: '+43', code: 'at' },
  { name: 'Irlanda', dialCode: '+353', code: 'ie' },
  { name: 'Suecia', dialCode: '+46', code: 'se' },
  { name: 'Noruega', dialCode: '+47', code: 'no' },
  { name: 'Dinamarca', dialCode: '+45', code: 'dk' },
  { name: 'Finlandia', dialCode: '+358', code: 'fi' },
  { name: 'Polonia', dialCode: '+48', code: 'pl' },
  { name: 'Grecia', dialCode: '+30', code: 'gr' },
  { name: 'República Checa', dialCode: '+420', code: 'cz' },
  { name: 'Rumania', dialCode: '+40', code: 'ro' },
  { name: 'Hungría', dialCode: '+36', code: 'hu' },
  { name: 'Ucrania', dialCode: '+380', code: 'ua' },
  // Latinoamérica
  { name: 'Chile', dialCode: '+56', code: 'cl' },
  { name: 'Argentina', dialCode: '+54', code: 'ar' },
  { name: 'Perú', dialCode: '+51', code: 'pe' },
  { name: 'Bolivia', dialCode: '+591', code: 'bo' },
  { name: 'Colombia', dialCode: '+57', code: 'co' },
  { name: 'Ecuador', dialCode: '+593', code: 'ec' },
  { name: 'Uruguay', dialCode: '+598', code: 'uy' },
  { name: 'Paraguay', dialCode: '+595', code: 'py' },
  { name: 'Venezuela', dialCode: '+58', code: 've' },
  { name: 'Brasil', dialCode: '+55', code: 'br' },
  { name: 'México', dialCode: '+52', code: 'mx' },
  // Otros
  { name: 'Estados Unidos', dialCode: '+1', code: 'us' },
];

export function flagUrl(code: string) {
  return `https://flagcdn.com/24x18/${code}.png`;
}
