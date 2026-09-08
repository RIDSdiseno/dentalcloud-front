import { createConvenio } from '../api/catalogs';
import { getErrorMessage } from '../api/client';
import { parseNumber, readTemplateFile } from './excelCommon';
import type { ImportSummary } from './importPrestacionesExcel';

const ALIASES: Record<string, string> = {
  nombre: 'name',
  'descuento %': 'discountPercent',
  descuento: 'discountPercent',
  estado: 'active',
};

export async function importConveniosExcel(file: File): Promise<ImportSummary> {
  const rows = await readTemplateFile(file, ALIASES, 'name', 'Convenios');
  const results: ImportSummary['results'] = [];

  for (const { row, record } of rows) {
    const name = record.name.trim();
    try {
      const discountPercent = record.discountPercent ? parseNumber(record.discountPercent) : 0;
      await createConvenio({ name, discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0 });
      results.push({ row, name, status: 'ok' });
    } catch (err) {
      results.push({ row, name, status: 'error', message: getErrorMessage(err, 'Error desconocido') });
    }
  }

  return {
    total: results.length,
    created: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'error').length,
    results,
  };
}
