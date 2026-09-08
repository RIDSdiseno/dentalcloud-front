import ExcelJS from 'exceljs';
import { getErrorMessage } from '../api/client';
import { createPrestacion, type Prestacion, type PrestacionOdontogramMode } from '../api/catalogs';
import { FACIAL_ZONE_LABELS, type FacialZoneKey } from '../pages/pacientes/facialZoneConfig';
import { ODONTOGRAM_MODE_LABELS } from '../pages/pacientes/odontogramConfig';
import { TEMPLATE_SHEET_NAMES } from './excelCommon';

const ZONE_LABEL_TO_KEY: Record<string, FacialZoneKey> = Object.fromEntries(
  Object.entries(FACIAL_ZONE_LABELS).map(([key, label]) => [label.toLowerCase(), key as FacialZoneKey])
);

const ODONTOGRAM_LABEL_TO_MODE: Record<string, PrestacionOdontogramMode> = Object.fromEntries(
  Object.entries(ODONTOGRAM_MODE_LABELS).map(([mode, label]) => [label.toLowerCase(), mode as PrestacionOdontogramMode])
);

const COLUMN_ALIASES: Record<string, string> = {
  nombre: 'name',
  codigo: 'code',
  'código': 'code',
  categoria: 'category',
  'categoría': 'category',
  'precio base': 'basePrice',
  'precio por zona': 'zonePrices',
  'modo odontograma': 'odontogramMode',
  zonas: 'zones',
  'aplica a todo el rostro': 'wholeFace',
  'requiere lote/producto': 'tracking',
  'zonas juntas': 'zonesTogether',
  estado: 'active',
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function cellText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && 'richText' in (value as object)) {
    return (value as { richText: { text: string }[] }).richText.map((t) => t.text).join('');
  }
  return String(value).trim();
}

function isYes(value: string): boolean {
  return /^(s[ií]|true|1|x)$/i.test(value.trim());
}

function parseZones(value: string): string[] {
  if (!value || value === '—' || /todas las zonas/i.test(value)) return [];
  return value
    .split(',')
    .map((piece) => piece.trim().toLowerCase())
    .map((label) => ZONE_LABEL_TO_KEY[label])
    .filter((key): key is FacialZoneKey => Boolean(key));
}

function parseZonePrices(value: string): Record<string, number> | null {
  if (!value.trim()) return null;
  const entries: [string, number][] = [];
  for (const line of value.split(/\n|;/)) {
    const match = line.match(/^\s*(.+?)\s*:\s*\$?\s*([\d.,]+)\s*$/);
    if (!match) continue;
    const zoneKey = ZONE_LABEL_TO_KEY[match[1].trim().toLowerCase()];
    const price = Number(match[2].replace(/\./g, '').replace(',', '.'));
    if (zoneKey && Number.isFinite(price)) entries.push([zoneKey, price]);
  }
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function parsePrice(value: unknown): number {
  if (typeof value === 'number') return value;
  const text = cellText(value).replace(/[^\d.,-]/g, '');
  const normalized = text.replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

export type ImportRowResult = { row: number; name: string; status: 'ok' | 'error'; message?: string };

export type ImportSummary = {
  total: number;
  created: number;
  failed: number;
  results: ImportRowResult[];
};

export async function importPrestacionesExcel(file: File): Promise<ImportSummary> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  if (workbook.worksheets.length === 0) throw new Error('El archivo no tiene ninguna hoja');

  const wrongTemplate = workbook.worksheets.find(
    (s) => (TEMPLATE_SHEET_NAMES as readonly string[]).includes(s.name) && s.name !== 'Prestaciones'
  );
  if (wrongTemplate) {
    throw new Error(
      `Este archivo es la plantilla de "${wrongTemplate.name}", no la de "Prestaciones". Descarga la plantilla correcta desde esta misma pestaña y vuelve a intentar.`
    );
  }

  // La plantilla exportada trae una hoja "Instrucciones" primero y recién
  // después la hoja de datos, con título + subtítulo en las filas 1-2 y el
  // encabezado real en la fila 3 — se busca la hoja y fila que contenga
  // "nombre" en alguna celda, para tolerar también un Excel hecho a mano de
  // una sola hoja y sin esas filas decorativas.
  let sheet: ExcelJS.Worksheet | undefined;
  let headerRowNumber = 1;
  for (const candidate of workbook.worksheets) {
    for (let r = 1; r <= Math.min(candidate.rowCount, 6); r += 1) {
      const values = candidate.getRow(r).values as unknown[];
      if (values.some((v) => normalizeHeader(v) === 'nombre')) {
        sheet = candidate;
        headerRowNumber = r;
        break;
      }
    }
    if (sheet) break;
  }
  if (!sheet) throw new Error('No se encontró la columna "Nombre" en el Excel');

  const headerRow = sheet.getRow(headerRowNumber);
  const columnMap: Record<number, string> = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = COLUMN_ALIASES[normalizeHeader(cell.value)];
    if (key) columnMap[colNumber] = key;
  });

  if (!Object.values(columnMap).includes('name')) {
    throw new Error('No se encontró la columna "Nombre" en el Excel');
  }

  const results: ImportRowResult[] = [];

  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const record: Record<string, string> = {};
    row.eachCell((cell, colNumber) => {
      const key = columnMap[colNumber];
      if (key) record[key] = cellText(cell.value);
    });

    const name = record.name?.trim();
    if (!name) continue;

    try {
      const category = /estetica|estética/i.test(record.category ?? '') ? 'estetica' : record.category ? 'dental' : undefined;
      const zonePrices = parseZonePrices(record.zonePrices ?? '');
      const allowedZones = parseZones(record.zones ?? '');
      const odontogramMode = record.odontogramMode ? ODONTOGRAM_LABEL_TO_MODE[record.odontogramMode.toLowerCase()] : undefined;
      const basePrice = parsePrice(record.basePrice);

      if (!zonePrices && !Number.isFinite(basePrice)) {
        results.push({ row: r, name, status: 'error', message: 'Precio base inválido' });
        continue;
      }

      await createPrestacion({
        name,
        code: record.code && record.code !== '—' ? record.code : undefined,
        basePrice: zonePrices ? 0 : basePrice,
        category,
        odontogramMode,
        allowedZones: allowedZones.length > 0 ? allowedZones : undefined,
        requiresProductTracking: record.tracking ? isYes(record.tracking) : undefined,
        appliesToWholeFace: record.wholeFace ? isYes(record.wholeFace) : undefined,
        zonesApplyTogether: record.zonesTogether ? isYes(record.zonesTogether) : undefined,
        zonePrices,
      });
      results.push({ row: r, name, status: 'ok' });
    } catch (err) {
      results.push({ row: r, name, status: 'error', message: getErrorMessage(err, 'Error desconocido') });
    }
  }

  return {
    total: results.length,
    created: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'error').length,
    results,
  };
}

export type { Prestacion };
