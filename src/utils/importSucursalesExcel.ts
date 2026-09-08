import { createSucursal } from '../api/catalogs';
import { getErrorMessage } from '../api/client';
import { readTemplateFile } from './excelCommon';
import type { ImportSummary } from './importPrestacionesExcel';

const ALIASES: Record<string, string> = {
  nombre: 'name',
  'dirección': 'address',
  direccion: 'address',
  estado: 'active',
};

export async function importSucursalesExcel(file: File): Promise<ImportSummary> {
  const rows = await readTemplateFile(file, ALIASES, 'name', 'Clínicas');
  const results: ImportSummary['results'] = [];

  for (const { row, record } of rows) {
    const name = record.name.trim();
    try {
      await createSucursal({ name, address: record.address?.trim() || undefined });
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
