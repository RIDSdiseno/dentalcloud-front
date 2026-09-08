import ExcelJS from 'exceljs';

export const HEADER_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
export const TITLE_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B2E' } };
export const INSTRUCTIONS_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };

export const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

export type ExcelColumn = { header: string; width: number };

export function createWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DentalCloud';
  workbook.created = new Date();
  return workbook;
}

/** Título (fila 1) + subtítulo con fecha/conteo (fila 2) + encabezado de columnas (fila 3). Devuelve la hoja lista para recibir filas desde la 4. */
export function addDataSheet(
  workbook: ExcelJS.Workbook,
  opts: { sheetName: string; title: string; count: number; noun: string; nounPlural: string; columns: ExcelColumn[] }
): ExcelJS.Worksheet {
  const { sheetName, title, count, noun, nounPlural, columns } = opts;
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 3 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  sheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = TITLE_FILL;
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, columns.length);
  const subtitleCell = sheet.getCell(2, 1);
  const fecha = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  subtitleCell.value = `${count} ${count === 1 ? noun : nounPlural} · generado el ${fecha}`;
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

  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columns.length } };
  return sheet;
}

/** Escribe una fila de datos en la hoja (a partir de la fila 4) con bordes y zebra-striping. */
export function writeDataRow(sheet: ExcelJS.Worksheet, values: (string | number | null)[], index: number): ExcelJS.Row {
  const row = sheet.addRow(values);
  for (let col = 1; col <= values.length; col += 1) {
    const cell = row.getCell(col);
    cell.border = THIN_BORDER;
    if (!cell.alignment) cell.alignment = { vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' } };
  }
  return row;
}

export type InstructionLine = { text: string; bold?: boolean };

/** Agrega una hoja "Instrucciones" al principio del libro, explicando cómo llenar la plantilla para que la carga funcione. */
export function addInstructionsSheet(workbook: ExcelJS.Workbook, title: string, lines: InstructionLine[]) {
  const sheet = workbook.addWorksheet('Instrucciones', { properties: { tabColor: { argb: 'FF7C3AED' } } });
  sheet.getColumn(1).width = 100;

  sheet.mergeCells(1, 1, 1, 1);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = TITLE_FILL;
  sheet.getRow(1).height = 30;

  let r = 3;
  for (const line of lines) {
    const cell = sheet.getCell(r, 1);
    cell.value = line.text;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    if (line.bold) {
      cell.font = { bold: true, size: 12, color: { argb: 'FF1E1B2E' } };
      cell.fill = INSTRUCTIONS_FILL;
      sheet.getRow(r).height = 22;
    } else {
      cell.font = { size: 11, color: { argb: 'FF334155' } };
      sheet.getRow(r).height = line.text.length > 90 ? 32 : 18;
    }
    r += 1;
  }

  // Mover la pestaña de instrucciones al inicio (queda como primer sheet).
  const idx = workbook.worksheets.indexOf(sheet);
  if (idx > 0) {
    workbook.worksheets.splice(idx, 1);
    workbook.worksheets.unshift(sheet);
  }
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function cellText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && 'richText' in (value as object)) {
    return (value as { richText: { text: string }[] }).richText.map((t) => t.text).join('');
  }
  return String(value).trim();
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export function isYes(value: string): boolean {
  return /^(s[ií]|true|1|x)$/i.test(value.trim());
}

export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const text = cellText(value).replace(/[^\d.,-]/g, '');
  const normalized = text.replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

export type ParsedRecord = Record<string, string>;

/** Nombre de la hoja de datos que escribe cada plantilla — sirve para detectar cuando el cliente sube la plantilla de otra pestaña por error. */
export const TEMPLATE_SHEET_NAMES = ['Prestaciones', 'Convenios', 'Previsiones', 'Clínicas', 'Inventario', 'Pacientes'] as const;

/**
 * Lee un .xlsx (la plantilla exportada, con Instrucciones + título/subtítulo en
 * las filas 1-2 antes del encabezado real, o un archivo hecho a mano sin esas
 * filas decorativas) y devuelve una fila por registro, usando `aliases`
 * (encabezado en español, en minúsculas -> nombre de campo interno).
 *
 * Si el archivo trae una hoja con el nombre de OTRA de nuestras plantillas
 * (ej. subieron "Previsiones" en el importador de Convenios), se rechaza de
 * inmediato con un mensaje claro en vez de leerla igual — un archivo hecho a
 * mano por el cliente, que no trae ninguno de esos nombres, no se ve afectado.
 */
export async function readTemplateFile(
  file: File,
  aliases: Record<string, string>,
  requiredField: string,
  expectedSheetName: string
): Promise<{ row: number; record: ParsedRecord }[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  if (workbook.worksheets.length === 0) throw new Error('El archivo no tiene ninguna hoja');

  const wrongTemplate = workbook.worksheets.find(
    (s) => (TEMPLATE_SHEET_NAMES as readonly string[]).includes(s.name) && s.name !== expectedSheetName
  );
  if (wrongTemplate) {
    throw new Error(
      `Este archivo es la plantilla de "${wrongTemplate.name}", no la de "${expectedSheetName}". Descarga la plantilla correcta desde esta misma pestaña y vuelve a intentar.`
    );
  }

  // La hoja de datos es la primera que trae una columna con el campo
  // requerido (para tolerar tanto la plantilla exportada, que además incluye
  // una hoja "Instrucciones" al principio, como un archivo con una sola hoja).
  const requiredHeaders = Object.entries(aliases)
    .filter(([, field]) => field === requiredField)
    .map(([header]) => header);

  let sheet: ExcelJS.Worksheet | undefined;
  let headerRowNumber = 1;
  for (const candidate of workbook.worksheets) {
    for (let r = 1; r <= Math.min(candidate.rowCount, 6); r += 1) {
      const values = candidate.getRow(r).values as unknown[];
      if (values.some((v) => requiredHeaders.includes(normalizeHeader(v)))) {
        sheet = candidate;
        headerRowNumber = r;
        break;
      }
    }
    if (sheet) break;
  }

  if (!sheet) throw new Error('No se encontró la columna requerida en el archivo');

  const headerRow = sheet.getRow(headerRowNumber);
  const columnMap: Record<number, string> = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = aliases[normalizeHeader(cell.value)];
    if (key) columnMap[colNumber] = key;
  });

  const results: { row: number; record: ParsedRecord }[] = [];
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;
    const record: ParsedRecord = {};
    row.eachCell((cell, colNumber) => {
      const key = columnMap[colNumber];
      if (key) record[key] = cellText(cell.value);
    });
    if (!record[requiredField]?.trim()) continue;
    results.push({ row: r, record });
  }
  return results;
}
