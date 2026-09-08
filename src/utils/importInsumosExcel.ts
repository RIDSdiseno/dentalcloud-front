import type { Sucursal } from '../api/catalogs';
import { createInsumo } from '../api/inventory';
import { getErrorMessage } from '../api/client';
import { parseNumber, readTemplateFile } from './excelCommon';
import type { ImportSummary } from './importPrestacionesExcel';

const ALIASES: Record<string, string> = {
  nombre: 'name',
  'categoría': 'category',
  categoria: 'category',
  sede: 'sucursal',
  proveedor: 'supplier',
  'sala/consultorio': 'consultingRoom',
  'sala consultorio': 'consultingRoom',
  cantidad: 'quantity',
  unidad: 'unit',
  'costo unitario': 'unitCost',
  'costo total': 'totalCost',
  'stock mínimo': 'minimumStock',
  'stock minimo': 'minimumStock',
  'fecha compra': 'purchaseDate',
};

export async function importInsumosExcel(file: File, sucursales: Sucursal[]): Promise<ImportSummary> {
  const rows = await readTemplateFile(file, ALIASES, 'name', 'Inventario');
  const results: ImportSummary['results'] = [];
  const sucursalByName = new Map(sucursales.map((s) => [s.name.trim().toLowerCase(), s.id]));

  for (const { row, record } of rows) {
    const name = record.name.trim();
    try {
      const sucursalId = record.sucursal?.trim() ? sucursalByName.get(record.sucursal.trim().toLowerCase()) : undefined;
      if (record.sucursal?.trim() && !sucursalId) {
        results.push({ row, name, status: 'error', message: `No existe una clínica llamada "${record.sucursal.trim()}"` });
        continue;
      }

      await createInsumo({
        name,
        sucursalId,
        category: record.category?.trim() || undefined,
        supplier: record.supplier?.trim() || undefined,
        consultingRoom: record.consultingRoom?.trim() || undefined,
        quantity: record.quantity?.trim() ? parseNumber(record.quantity) : undefined,
        unit: record.unit?.trim() || undefined,
        unitCost: record.unitCost?.trim() ? parseNumber(record.unitCost) : undefined,
        totalCost: record.totalCost?.trim() ? parseNumber(record.totalCost) : undefined,
        minimumStock: record.minimumStock?.trim() ? parseNumber(record.minimumStock) : undefined,
        purchaseDate: record.purchaseDate?.trim() || undefined,
      });
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
