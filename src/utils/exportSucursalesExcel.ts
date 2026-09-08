import type { Sucursal } from '../api/catalogs';
import { addDataSheet, addInstructionsSheet, createWorkbook, downloadWorkbook, writeDataRow } from './excelCommon';

export async function exportSucursalesExcel(sucursales: Sucursal[], clinicaNombre?: string) {
  const workbook = createWorkbook();

  addInstructionsSheet(workbook, 'Cómo llenar esta plantilla — Clínicas', [
    { text: 'Esta plantilla sirve para agregar varias clínicas (sedes) de una sola vez.', bold: true },
    { text: 'Una clínica es una sede física dentro de este holding. Cada presupuesto se asocia a una de ellas.' },
    { text: '' },
    { text: '1. Completa una fila por cada clínica en la pestaña "Clínicas" (a la derecha), a partir de la fila 4.' },
    { text: '2. No cambies los nombres de las columnas ni el orden.' },
    { text: '3. Solo la columna "Nombre" es obligatoria.' },
    { text: '' },
    { text: 'Cómo llenar cada columna:', bold: true },
    { text: '• Nombre: el nombre de la sede (ej. Sede Providencia). Si ya existe una con ese nombre, esa fila se rechaza al subirla.' },
    { text: '• Dirección: opcional, texto libre (ej. Av. Providencia 1234).' },
    { text: '' },
    { text: 'Cuando termines, guarda el archivo y súbelo con el botón "Agregar mediante Excel".' },
  ]);

  const columns = [
    { header: 'Nombre', width: 32 },
    { header: 'Dirección', width: 36 },
    { header: 'Estado', width: 14 },
  ];
  const sheet = addDataSheet(workbook, {
    sheetName: 'Clínicas',
    title: `Clínicas${clinicaNombre ? ` — ${clinicaNombre}` : ''}`,
    count: sucursales.length,
    noun: 'clínica',
    nounPlural: 'clínicas',
    columns,
  });

  sucursales.forEach((s, index) => {
    writeDataRow(sheet, [s.name, s.address ?? '', s.active ? 'Activa' : 'Desactivada'], index);
  });

  const fecha = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `clinicas-${fecha}.xlsx`);
}
