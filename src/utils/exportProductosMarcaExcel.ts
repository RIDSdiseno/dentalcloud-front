import type { ProductoMarca } from '../api/catalogs';
import { addDataSheet, addInstructionsSheet, createWorkbook, downloadWorkbook, writeDataRow } from './excelCommon';

function formatCLP(value: number) {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

export async function exportProductosMarcaExcel(productos: ProductoMarca[], clinicaNombre?: string) {
  const workbook = createWorkbook();

  addInstructionsSheet(workbook, 'Cómo llenar esta plantilla — Productos y Marcas', [
    { text: 'Esta plantilla sirve para agregar varios productos del catálogo multimarca de una sola vez.', bold: true },
    { text: '1. Completa una fila por cada producto en la pestaña "Productos y Marcas" (a la derecha), a partir de la fila 4.' },
    { text: '2. No cambies los nombres de las columnas ni el orden.' },
    { text: '3. "Producto genérico" y "Marca" son obligatorios. Las demás pueden dejarse en blanco.' },
    { text: '' },
    { text: 'Cómo llenar cada columna:', bold: true },
    { text: '• Producto genérico: ej. Toxina botulínica, Ácido hialurónico.' },
    { text: '• Marca: ej. Dysport, Juvederm. Si ya existe ese producto con esa misma marca, esa fila se rechaza al subirla.' },
    { text: '• Unidad: en qué se mide (ej. unidad, ml). Si se deja en blanco, queda como "unidad".' },
    { text: '• Costo por envase: solo números, sin puntos ni signo $ (ej. 180000) — lo que cuesta el envase completo, no la dosis.' },
    { text: '• Rendimiento: cuántas "unidad" rinde UN envase (ej. 500 UI por vial). Si se deja en blanco, queda en 1.' },
    { text: '• Margen %: solo el número (ej. 60 para 60%). Si se deja en blanco, queda en 0.' },
    { text: '• Precio de venta: se calcula solo (costo ÷ rendimiento × (1 + margen%)) — esta columna es solo informativa, no se lee al subir el archivo.' },
    { text: '' },
    { text: 'Cuando termines, guarda el archivo y súbelo con el botón "Agregar mediante Excel". Al final verás cuántos se crearon y el detalle de cualquier fila con error.' },
  ]);

  const columns = [
    { header: 'Producto genérico', width: 28 },
    { header: 'Marca', width: 20 },
    { header: 'Unidad', width: 12 },
    { header: 'Costo por envase', width: 18 },
    { header: 'Rendimiento', width: 14 },
    { header: 'Margen %', width: 12 },
    { header: 'Precio de venta', width: 18 },
    { header: 'Estado', width: 14 },
  ];
  const sheet = addDataSheet(workbook, {
    sheetName: 'Productos y Marcas',
    title: `Catálogo de productos${clinicaNombre ? ` — ${clinicaNombre}` : ''}`,
    count: productos.length,
    noun: 'producto',
    nounPlural: 'productos',
    columns,
  });

  productos.forEach((p, index) => {
    const row = writeDataRow(
      sheet,
      [p.nombreGenerico, p.marca, p.unidad, p.costo, p.rendimientoPorEnvase, p.margenPercent, formatCLP(p.precioVenta), p.active ? 'Activo' : 'Desactivado'],
      index
    );
    row.getCell(4).numFmt = '$#,##0';
  });

  const fecha = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `catalogo-productos-marca-${fecha}.xlsx`);
}
