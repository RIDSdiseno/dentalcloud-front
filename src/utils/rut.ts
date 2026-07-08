export function cleanRut(rut: string) {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

export function isValidRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (clean.length < 2) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return expectedDv === dv;
}

export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (!clean) return '';
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return body ? `${withDots}-${dv}` : dv;
}

/** Reformats a RUT on every keystroke into `12.345.678-9`, capped at 8 body digits + dv. */
export function formatRutInput(value: string): string {
  const clean = cleanRut(value).slice(0, 9);
  if (clean.length <= 1) return clean;
  return formatRut(clean);
}
