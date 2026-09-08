import type { Prevision } from '../api/catalogs';
import { addDataSheet, addInstructionsSheet, createWorkbook, downloadWorkbook, writeDataRow } from './excelCommon';

export async function exportPrevisionesExcel(previsiones: Prevision[], clinicaNombre?: string) {
  const workbook = createWorkbook();

  addInstructionsSheet(workbook, 'Cómo llenar esta plantilla — Previsiones', [
    { text: 'Esta plantilla sirve para agregar varias previsiones de una sola vez.', bold: true },
    { text: 'Una previsión es solo informativa dentro del presupuesto (ej. Fonasa, Isapre, Particular) — no aplica ningún descuento.' },
    { text: '' },
    { text: '1. Completa una fila por cada previsión en la pestaña "Previsiones" (a la derecha), a partir de la fila 4.' },
    { text: '2. No cambies los nombres de las columnas ni el orden.' },
    { text: '3. La columna "Nombre" es obligatoria.' },
    { text: '' },
    { text: 'Cómo llenar cada columna:', bold: true },
    { text: '• Nombre: el nombre de la previsión (ej. Fonasa, Isapre Consalud, Particular). Si ya existe una con ese nombre, esa fila se rechaza al subirla.' },
    { text: '' },
    { text: 'Cuando termines, guarda el archivo y súbelo con el botón "Agregar mediante Excel".' },
  ]);

  const columns = [
    { header: 'Nombre', width: 32 },
    { header: 'Estado', width: 14 },
  ];
  const sheet = addDataSheet(workbook, {
    sheetName: 'Previsiones',
    title: `Previsiones${clinicaNombre ? ` — ${clinicaNombre}` : ''}`,
    count: previsiones.length,
    noun: 'previsión',
    nounPlural: 'previsiones',
    columns,
  });

  previsiones.forEach((p, index) => {
    writeDataRow(sheet, [p.name, p.active ? 'Activa' : 'Desactivada'], index);
  });

  const fecha = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `previsiones-${fecha}.xlsx`);
}
