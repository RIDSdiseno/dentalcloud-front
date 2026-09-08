import type { InventorySupply } from '../api/inventory';
import { INVENTORY_CATEGORIES, INVENTORY_UNITS, CONSULTING_ROOMS } from '../api/inventory';
import { addDataSheet, addInstructionsSheet, createWorkbook, downloadWorkbook, writeDataRow } from './excelCommon';

export async function exportInsumosExcel(insumos: InventorySupply[], clinicaNombre?: string) {
  const workbook = createWorkbook();

  addInstructionsSheet(workbook, 'Cómo llenar esta plantilla — Inventario', [
    { text: 'Esta plantilla sirve para agregar varios insumos de una sola vez.', bold: true },
    { text: '1. Completa una fila por cada insumo en la pestaña "Inventario" (a la derecha), a partir de la fila 4.' },
    { text: '2. No cambies los nombres de las columnas ni el orden.' },
    { text: '3. Solo la columna "Nombre" es obligatoria. Las demás pueden dejarse en blanco si no aplican.' },
    { text: '' },
    { text: 'Cómo llenar cada columna:', bold: true },
    { text: '• Nombre: el nombre del insumo (ej. Guantes de nitrilo talla M).' },
    { text: `• Categoría: una de estas opciones exactas: ${INVENTORY_CATEGORIES.join(', ')}.` },
    { text: '• Sede: el nombre exacto de una de las clínicas de la pestaña "Clínicas". Es obligatoria en la mayoría de los casos — solo puede omitirse si el holding aún no tiene ninguna sede activa.' },
    { text: '• Proveedor: texto libre, opcional (ej. Distribuidora Dental SPA).' },
    { text: `• Sala/Consultorio: una de estas opciones exactas, opcional: ${CONSULTING_ROOMS.join(', ')}.` },
    { text: `• Cantidad y Unidad: la cantidad es un número (ej. 50) y la unidad una de: ${INVENTORY_UNITS.join(', ')}.` },
    { text: '• Costo unitario y Costo total: solo números, sin puntos ni signo $ (ej. 1500).' },
    { text: '• Stock mínimo: número — bajo ese nivel, el insumo aparece como "Bajo stock".' },
    { text: '• Fecha compra: formato AAAA-MM-DD (ej. 2026-03-15), opcional.' },
    { text: '' },
    { text: 'Cuando termines, guarda el archivo y súbelo con el botón "Agregar mediante Excel". Los lotes de cada insumo se administran aparte, desde el botón "Lotes".' },
  ]);

  const columns = [
    { header: 'Nombre', width: 30 },
    { header: 'Categoría', width: 16 },
    { header: 'Sede', width: 20 },
    { header: 'Proveedor', width: 22 },
    { header: 'Sala/Consultorio', width: 18 },
    { header: 'Cantidad', width: 12 },
    { header: 'Unidad', width: 12 },
    { header: 'Costo unitario', width: 16 },
    { header: 'Costo total', width: 16 },
    { header: 'Stock mínimo', width: 14 },
    { header: 'Fecha compra', width: 16 },
  ];
  const sheet = addDataSheet(workbook, {
    sheetName: 'Inventario',
    title: `Inventario${clinicaNombre ? ` — ${clinicaNombre}` : ''}`,
    count: insumos.length,
    noun: 'insumo',
    nounPlural: 'insumos',
    columns,
  });

  insumos.forEach((item, index) => {
    const row = writeDataRow(
      sheet,
      [
        item.name,
        item.category ?? '',
        item.location?.name ?? '',
        item.supplier ?? '',
        item.consultingRoom ?? '',
        item.quantity ?? null,
        item.unit ?? '',
        item.unitCost ?? null,
        item.totalCost ?? null,
        item.minimumStock ?? null,
        item.purchaseDate ? item.purchaseDate.slice(0, 10) : '',
      ],
      index
    );
    if (typeof item.unitCost === 'number') row.getCell(8).numFmt = '$#,##0';
    if (typeof item.totalCost === 'number') row.getCell(9).numFmt = '$#,##0';
  });

  const fecha = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `inventario-${fecha}.xlsx`);
}
