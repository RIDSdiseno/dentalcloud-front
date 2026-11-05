// Fechas "de calendario" (sin hora), como la fecha de nacimiento.
//
// El backend las guarda como medianoche UTC (ej. 1990-05-10T00:00:00.000Z). Si
// se muestran con `new Date(...).toLocaleDateString()`, el navegador las pasa a
// la hora de Chile (UTC-3/-4) y aparece el DÍA ANTERIOR (09-05-1990). Estas
// funciones leen solo la parte AAAA-MM-DD, sin zona horaria.

function parts(value: string | null | undefined): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** "1990-05-10T00:00:00.000Z" -> "10-05-1990" (mismo formato que es-CL). */
export function formatDateOnly(value: string | null | undefined, empty = '—'): string {
  const p = parts(value);
  if (!p) return empty;
  const [y, mo, d] = p;
  return `${String(d).padStart(2, '0')}-${String(mo).padStart(2, '0')}-${y}`;
}

/** Edad en años cumplidos, comparando contra la fecha de hoy en Chile. */
export function ageFromDateOnly(value: string | null | undefined): number | null {
  const p = parts(value);
  if (!p) return null;
  const [y, mo, d] = p;
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }); // AAAA-MM-DD
  const [ty, tm, td] = parts(hoy)!;
  let age = ty - y;
  if (tm < mo || (tm === mo && td < d)) age -= 1;
  return age;
}
