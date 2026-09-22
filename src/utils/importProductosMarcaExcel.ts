import { createProductoMarca } from '../api/catalogs';
import { getErrorMessage } from '../api/client';
import { parseNumber, readTemplateFile } from './excelCommon';
import type { ImportSummary } from './importPrestacionesExcel';

const ALIASES: Record<string, string> = {
  'producto genérico': 'nombreGenerico',
  'producto generico': 'nombreGenerico',
  marca: 'marca',
  unidad: 'unidad',
  'costo por envase': 'costo',
  costo: 'costo',
  rendimiento: 'rendimientoPorEnvase',
  'margen %': 'margenPercent',
  margen: 'margenPercent',
};

export async function importProductosMarcaExcel(file: File): Promise<ImportSummary> {
  const rows = await readTemplateFile(file, ALIASES, 'nombreGenerico', 'Productos y Marcas');
  const results: ImportSummary['results'] = [];

  for (const { row, record } of rows) {
    const nombreGenerico = record.nombreGenerico.trim();
    const marca = record.marca?.trim();
    if (!marca) {
      results.push({ row, name: nombreGenerico, status: 'error', message: 'Falta la marca' });
      continue;
    }
    try {
      await createProductoMarca({
        nombreGenerico,
        marca,
        unidad: record.unidad?.trim() || undefined,
        costo: record.costo ? parseNumber(record.costo) : undefined,
        rendimientoPorEnvase: record.rendimientoPorEnvase ? Math.max(1, parseNumber(record.rendimientoPorEnvase)) : undefined,
        margenPercent: record.margenPercent ? parseNumber(record.margenPercent) : undefined,
      });
      results.push({ row, name: `${nombreGenerico} (${marca})`, status: 'ok' });
    } catch (err) {
      results.push({ row, name: `${nombreGenerico} (${marca})`, status: 'error', message: getErrorMessage(err, 'Error desconocido') });
    }
  }

  return {
    total: results.length,
    created: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'error').length,
    results,
  };
}
