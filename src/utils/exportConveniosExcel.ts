import type { Convenio } from '../api/catalogs';
import { addDataSheet, addInstructionsSheet, createWorkbook, downloadWorkbook, writeDataRow } from './excelCommon';

export async function exportConveniosExcel(convenios: Convenio[], clinicaNombre?: string) {
  const workbook = createWorkbook();

  addInstructionsSheet(workbook, 'Cómo llenar esta plantilla — Convenios', [
    { text: 'Esta plantilla sirve para agregar varios convenios de una sola vez.', bold: true },
    { text: 'Un convenio es un descuento que se aplica automáticamente al valor de las prestaciones en un presupuesto (ej. Particular, Convenio Colmena).' },
    { text: '' },
    { text: '1. Completa una fila por cada convenio en la pestaña "Convenios" (a la derecha), a partir de la fila 4.' },
    { text: '2. No cambies los nombres de las columnas ni el orden.' },
    { text: '3. Solo la columna "Nombre" es obligatoria.' },
    { text: '' },
    { text: 'Cómo llenar cada columna:', bold: true },
    { text: '• Nombre: el nombre del convenio (ej. Particular, Isapre Consalud). Si ya existe uno con ese nombre, esa fila se rechaza al subirla.' },
    { text: '• Descuento %: un número entre 0 y 100, sin el símbolo %  (ej. 15). Si se deja en blanco, se crea con 0%.' },
    { text: '' },
    { text: 'Cuando termines, guarda el archivo y súbelo con el botón "Agregar mediante Excel".' },
  ]);

  const columns = [
    { header: 'Nombre', width: 32 },
    { header: 'Descuento %', width: 14 },
    { header: 'Estado', width: 14 },
  ];
  const sheet = addDataSheet(workbook, {
    sheetName: 'Convenios',
    title: `Convenios${clinicaNombre ? ` — ${clinicaNombre}` : ''}`,
    count: convenios.length,
    noun: 'convenio',
    nounPlural: 'convenios',
    columns,
  });

  convenios.forEach((c, index) => {
    writeDataRow(sheet, [c.name, c.discountPercent, c.active ? 'Activo' : 'Desactivado'], index);
  });

  const fecha = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `convenios-${fecha}.xlsx`);
}
