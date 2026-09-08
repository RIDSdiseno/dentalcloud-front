import ExcelJS from 'exceljs';
import type { Prestacion } from '../api/catalogs';
import { FACIAL_ZONE_LABELS, type FacialZoneKey } from '../pages/pacientes/facialZoneConfig';
import { ODONTOGRAM_MODE_LABELS } from '../pages/pacientes/odontogramConfig';
import { addInstructionsSheet } from './excelCommon';

function zoneLabel(zone: string): string {
  return FACIAL_ZONE_LABELS[zone as FacialZoneKey] ?? zone;
}

function zonesText(prestacion: Prestacion): string {
  if (prestacion.category !== 'estetica') return '—';
  if (prestacion.appliesToWholeFace) return 'Todo el rostro';
  if (prestacion.allowedZones.length === 0) return 'Todas las zonas';
  return prestacion.allowedZones.map(zoneLabel).join(', ');
}

function precioText(prestacion: Prestacion): string {
  if (!prestacion.zonePrices) return '';
  return Object.entries(prestacion.zonePrices)
    .map(([zone, price]) => `${zoneLabel(zone)}: $${price.toLocaleString('es-CL')}`)
    .join('\n');
}

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF7C3AED' },
};

const TITLE_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E1B2E' },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

export async function exportPrestacionesExcel(prestaciones: Prestacion[], clinicaNombre?: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DentalCloud';
  workbook.created = new Date();

  addInstructionsSheet(workbook, 'Cómo llenar esta plantilla — Prestaciones', [
    { text: 'Esta plantilla sirve para agregar varias prestaciones de una sola vez.', bold: true },
    { text: '1. Completa una fila por cada prestación en la pestaña "Prestaciones" (a la derecha), a partir de la fila 4.' },
    { text: '2. No cambies los nombres de las columnas ni el orden — el sistema los reconoce por el texto del encabezado.' },
    { text: '3. Solo la columna "Nombre" es obligatoria. Las demás pueden dejarse en blanco si no aplican.' },
    { text: '' },
    { text: 'Cómo llenar cada columna:', bold: true },
    { text: '• Código: el código interno de la prestación (opcional, ej. AH-01). Si ya existe una con ese código, esa fila se rechaza al subirla.' },
    { text: '• Categoría: escribe exactamente "Dental" o "Estética".' },
    { text: '• Precio base: solo números, sin puntos ni signo $ (ej. 25000). Si usas "Precio por zona", esta columna se ignora.' },
    { text: '• Precio por zona: opcional. Un precio distinto por zona, con el formato "Zona: $monto", una por línea (ej. "Cuello: $10000" y en la línea de abajo "Frente: $20000").' },
    { text: '• Modo odontograma: solo para prestaciones "Dental". Escribe una de estas opciones: Sesión (toda la boca), Pieza completa, Cara, Extracción, Cuadrante, Sextante, Arcada.' },
    { text: '• Zonas: solo para prestaciones "Estética". Escribe "Todas las zonas", o los nombres separados por coma (ej. "Frente, Mentón, Cuello").' },
    { text: '• Aplica a todo el rostro / Requiere lote/producto / Zonas juntas: escribe "Sí" o "No".' },
    { text: '• Estado: "Activa" o "Desactivada" (si se deja en blanco, la prestación queda activa).' },
    { text: '' },
    { text: 'Cuando termines, guarda el archivo y súbelo con el botón "Agregar mediante Excel". Al final verás cuántas se crearon y el detalle de cualquier fila con error.' },
  ]);

  const sheet = workbook.addWorksheet('Prestaciones', {
    views: [{ state: 'frozen', ySplit: 3 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const columns = [
    { header: 'Nombre', key: 'name', width: 32 },
    { header: 'Código', key: 'code', width: 12 },
    { header: 'Categoría', key: 'category', width: 12 },
    { header: 'Precio base', key: 'basePrice', width: 16 },
    { header: 'Precio por zona', key: 'zonePrices', width: 30 },
    { header: 'Modo odontograma', key: 'odontogramMode', width: 18 },
    { header: 'Zonas', key: 'zones', width: 30 },
    { header: 'Aplica a todo el rostro', key: 'wholeFace', width: 20 },
    { header: 'Requiere lote/producto', key: 'tracking', width: 20 },
    { header: 'Zonas juntas', key: 'zonesTogether', width: 14 },
    { header: 'Estado', key: 'active', width: 14 },
  ];

  sheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `Catálogo de prestaciones${clinicaNombre ? ` — ${clinicaNombre}` : ''}`;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = TITLE_FILL;
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, columns.length);
  const subtitleCell = sheet.getCell(2, 1);
  const fecha = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  subtitleCell.value = `${prestaciones.length} ${prestaciones.length === 1 ? 'prestación' : 'prestaciones'} · generado el ${fecha}`;
  subtitleCell.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(2).height = 20;

  const headerRow = sheet.getRow(3);
  columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width;
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 26;

  prestaciones.forEach((p, index) => {
    const row = sheet.addRow([
      p.name,
      p.code ?? '—',
      p.category === 'estetica' ? 'Estética' : 'Dental',
      p.zonePrices ? null : p.basePrice,
      precioText(p),
      p.category === 'dental' ? (ODONTOGRAM_MODE_LABELS[p.odontogramMode] ?? p.odontogramMode) : '—',
      zonesText(p),
      p.category === 'estetica' ? (p.appliesToWholeFace ? 'Sí' : 'No') : '—',
      p.category === 'estetica' ? (p.requiresProductTracking ? 'Sí' : 'No') : '—',
      p.category === 'estetica' && p.allowedZones.length > 1 ? (p.zonesApplyTogether ? 'Sí' : 'No') : '—',
      p.active ? 'Activa' : 'Desactivada',
    ]);

    const basePriceCell = row.getCell(4);
    if (typeof basePriceCell.value === 'number') {
      basePriceCell.numFmt = '$#,##0';
    }
    row.getCell(5).alignment = { wrapText: true, vertical: 'middle' };

    const stateCell = row.getCell(11);
    stateCell.font = { bold: true, color: { argb: p.active ? 'FF15803D' : 'FF64748B' } };

    for (let col = 1; col <= columns.length; col += 1) {
      const cell = row.getCell(col);
      cell.border = THIN_BORDER;
      if (!cell.alignment) cell.alignment = { vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' },
      };
    }
  });

  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columns.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fechaArchivo = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `catalogo-prestaciones-${fechaArchivo}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
