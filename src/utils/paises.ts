import type { DocumentType } from './documento';

// Espejo de back/src/lib/paises.ts. El país de la clínica es la fuente única de
// la moneda y del tipo de documento: antes todo estaba cableado a Chile, así
// que una clínica española veía "pesos" y no podía cargar un paciente con DNI.
//
// Se mantienen las dos copias (y no un endpoint) porque el frontend necesita
// formatear montos en cada render, y pedirle al servidor cómo se escribe un
// número sería absurdo. Si se agrega un país, hay que agregarlo en ambos.

export type PaisConfig = {
  currency: string;
  locale: string;
  defaultPersonDocument: DocumentType;
  defaultCompanyDocument: DocumentType;
};

export const PAISES: Record<string, PaisConfig> = {
  Chile: { currency: 'CLP', locale: 'es-CL', defaultPersonDocument: 'RUT', defaultCompanyDocument: 'RUT' },
  Argentina: { currency: 'ARS', locale: 'es-AR', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  Perú: { currency: 'PEN', locale: 'es-PE', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  Colombia: { currency: 'COP', locale: 'es-CO', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  México: { currency: 'MXN', locale: 'es-MX', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  Bolivia: { currency: 'BOB', locale: 'es-BO', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  Ecuador: { currency: 'USD', locale: 'es-EC', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  Uruguay: { currency: 'UYU', locale: 'es-UY', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  Paraguay: { currency: 'PYG', locale: 'es-PY', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  Venezuela: { currency: 'VES', locale: 'es-VE', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  España: { currency: 'EUR', locale: 'es-ES', defaultPersonDocument: 'DNI', defaultCompanyDocument: 'CIF' },
  'Estados Unidos': { currency: 'USD', locale: 'en-US', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
  Otro: { currency: 'CLP', locale: 'es-CL', defaultPersonDocument: 'PASAPORTE', defaultCompanyDocument: 'RUT' },
};

export const VALID_PAISES = Object.keys(PAISES);

// Monedas que nunca usan centavos. Mostrar "$ 18.000,00" donde siempre decía
// "$ 18.000" se vería como un error, no como una mejora.
const SIN_DECIMALES = new Set(['CLP', 'PYG', 'COP']);

export function paisConfig(pais: string | null | undefined): PaisConfig {
  return (pais && PAISES[pais]) || PAISES.Chile;
}

/** Formatea un monto con la moneda de un país concreto. */
export function formatMoneyIn(amount: number, pais: string | null | undefined): string {
  const { currency, locale } = paisConfig(pais);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: SIN_DECIMALES.has(currency) ? 0 : 2,
  }).format(amount);
}

// País de la clínica en la que se está trabajando. Es estado de módulo, no de
// React, a propósito: los montos se formatean en decenas de lugares, muchos
// dentro de subcomponentes y de funciones auxiliares que no son componentes y
// por lo tanto no pueden usar hooks. Hacerlo pasar por props o contexto
// obligaría a reescribir media aplicación para un dato que es único y global
// por sesión. Lo mantiene sincronizado AuthContext al iniciar y cerrar sesión.
let currentPais: string | null = null;

export function setCurrentPais(pais: string | null): void {
  currentPais = pais;
}

/**
 * Formatea un monto con la moneda de la clínica de la sesión. Para pantallas de
 * super admin, que muestran varias clínicas a la vez, usar `formatMoneyIn` con
 * el país de cada una: la moneda correcta es la de la clínica, no la de quien mira.
 */
export function formatMoney(amount: number): string {
  return formatMoneyIn(amount, currentPais);
}
