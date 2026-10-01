import { cleanRut, formatRut, formatRutInput, isValidRut } from './rut';

// Tipos de documento de identidad admitidos. Hasta ahora el sistema solo sabía
// de RUT chileno, lo que dejaba fuera a las clínicas de España: su personal y
// sus pacientes no podían cargarse. El tipo se guarda junto al número (ver
// `documentType` en el backend) porque el mismo número puede ser válido como un
// tipo e inválido como otro — sin saber cuál es, no se puede verificar nada.
export const DOCUMENT_TYPES = ['RUT', 'DNI', 'NIE', 'CIF', 'PASAPORTE'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  RUT: 'RUT',
  DNI: 'DNI',
  NIE: 'NIE',
  CIF: 'CIF',
  PASAPORTE: 'Pasaporte',
};

// Tipos que identifican a una PERSONA y tipos que identifican a una EMPRESA.
// Una clínica española se identifica con CIF, no con el DNI de su dueño.
export const PERSON_DOCUMENT_TYPES: DocumentType[] = ['RUT', 'DNI', 'NIE', 'PASAPORTE'];
export const COMPANY_DOCUMENT_TYPES: DocumentType[] = ['RUT', 'CIF', 'NIE'];

// Qué tipo se ofrece por defecto según el país de la clínica.
export function defaultDocumentTypeForCountry(pais: string | null | undefined): DocumentType {
  return pais === 'España' ? 'DNI' : 'RUT';
}

// Texto de ayuda del signo de pregunta. Se explican también los tipos que no
// aparecen en todos los selectores (CIF en personas, NIF que no es un tipo
// aparte) porque la duda del usuario no distingue: ve las siglas y no sabe cuál
// le corresponde.
export const DOCUMENT_HELP: { term: string; text: string }[] = [
  {
    term: 'RUT',
    text: 'Rol Único Tributario, de Chile. Identifica tanto a personas como a empresas. Son dígitos más un dígito verificador al final, que puede ser un número o la letra K (ej. 12.345.678-5).',
  },
  {
    term: 'DNI',
    text: 'Documento Nacional de Identidad, de España. Es el documento de los ciudadanos españoles: 8 números y una letra de control al final (ej. 12345678Z).',
  },
  {
    term: 'NIE',
    text: 'Número de Identidad de Extranjero, de España. Es el equivalente al DNI para quienes no tienen nacionalidad española pero residen o tienen vínculos en el país. Empieza con X, Y o Z, sigue con 7 números y termina en una letra (ej. X1234567L).',
  },
  {
    term: 'CIF',
    text: 'Código de Identificación Fiscal, de España. Es el identificador de las EMPRESAS, no de las personas: una clínica española se registra con su CIF. Empieza con una letra según el tipo de sociedad, sigue con 7 números y termina en un carácter de control (ej. B12345674).',
  },
  {
    term: 'NIF',
    text: 'Número de Identificación Fiscal, de España. No es un documento aparte, sino el nombre genérico del identificador fiscal: para una persona española el NIF es su DNI, para una extranjera es su NIE, y para una empresa es su CIF. Por eso no aparece como opción propia en la lista.',
  },
  {
    term: 'Pasaporte',
    text: 'Para pacientes extranjeros que no tienen documento local. Cada país usa su propio formato, así que el sistema no puede verificar que el número sea correcto: solo comprueba que no esté vacío.',
  },
];

const DNI_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function cleanDocument(value: string): string {
  return value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

function isValidDni(value: string): boolean {
  const clean = cleanDocument(value);
  if (!/^\d{8}[A-Z]$/.test(clean)) return false;
  const number = Number(clean.slice(0, 8));
  return DNI_CONTROL_LETTERS[number % 23] === clean[8];
}

function isValidNie(value: string): boolean {
  const clean = cleanDocument(value);
  if (!/^[XYZ]\d{7}[A-Z]$/.test(clean)) return false;
  // La letra inicial se sustituye por un dígito y después se valida igual que
  // un DNI: X vale 0, Y vale 1 y Z vale 2.
  const prefix = String('XYZ'.indexOf(clean[0]));
  const number = Number(prefix + clean.slice(1, 8));
  return DNI_CONTROL_LETTERS[number % 23] === clean[8];
}

// Letras iniciales válidas de un CIF, según el tipo de sociedad.
const CIF_START = 'ABCDEFGHJNPQRSUVW';
// Sociedades cuyo carácter de control es SIEMPRE una letra, nunca un número.
const CIF_LETTER_ONLY = 'PQRSNW';
// ...y las que lo tienen siempre numérico. El resto admite cualquiera de los dos.
const CIF_DIGIT_ONLY = 'ABEH';

function isValidCif(value: string): boolean {
  const clean = cleanDocument(value);
  if (!/^[A-Z]\d{7}[0-9A-Z]$/.test(clean)) return false;
  const start = clean[0];
  if (!CIF_START.includes(start)) return false;

  const digits = clean.slice(1, 8);
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    const digit = Number(digits[i]);
    if (i % 2 === 0) {
      // Posiciones impares (1ª, 3ª...): se duplican y se suman sus cifras.
      const doubled = digit * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sum += digit;
    }
  }
  const controlDigit = (10 - (sum % 10)) % 10;
  const control = clean[8];

  if (CIF_LETTER_ONLY.includes(start)) return control === 'JABCDEFGHI'[controlDigit];
  if (CIF_DIGIT_ONLY.includes(start)) return control === String(controlDigit);
  return control === String(controlDigit) || control === 'JABCDEFGHI'[controlDigit];
}

export function isValidDocument(type: DocumentType, value: string): boolean {
  const clean = cleanDocument(value);
  if (!clean) return false;
  switch (type) {
    case 'RUT':
      return isValidRut(value);
    case 'DNI':
      return isValidDni(value);
    case 'NIE':
      return isValidNie(value);
    case 'CIF':
      return isValidCif(value);
    // El pasaporte no tiene un formato común entre países: lo único que se
    // puede exigir es que sea un número plausible, no que sea verdadero.
    case 'PASAPORTE':
      return clean.length >= 5 && clean.length <= 20;
    default:
      return false;
  }
}

/** Da formato mientras se escribe. Solo el RUT lleva separadores. */
export function formatDocumentInput(type: DocumentType, value: string): string {
  if (type === 'RUT') return formatRutInput(value);
  return cleanDocument(value).slice(0, 20);
}

/** Da formato para mostrar un documento ya guardado. */
export function formatDocument(type: DocumentType, value: string): string {
  if (!value) return '';
  return type === 'RUT' ? formatRut(value) : cleanDocument(value);
}

/** Normaliza antes de enviar al backend (sin puntos ni guiones, en mayúsculas). */
export function normalizeDocument(type: DocumentType, value: string): string {
  return type === 'RUT' ? cleanRut(value) : cleanDocument(value);
}

export function documentPlaceholder(type: DocumentType): string {
  switch (type) {
    case 'RUT':
      return '12.345.678-5';
    case 'DNI':
      return '12345678Z';
    case 'NIE':
      return 'X1234567L';
    case 'CIF':
      return 'B12345674';
    case 'PASAPORTE':
      return 'AB1234567';
    default:
      return '';
  }
}
