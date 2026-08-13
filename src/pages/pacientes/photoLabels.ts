// Etiquetas de foto por procedimiento/evolución: "Antes"/"Después" para
// registro clínico, "Sticker ficha"/"Sticker paciente" para trazabilidad de
// producto (ej. las dos etiquetas físicas con lote que trae el Ácido
// Hialurónico — una se pega en la ficha, la otra se entrega al paciente).
// Usado en EvolucionesTab para etiquetar las fotos que se suben al
// evolucionar (Antes/Después, o el sticker de lote del producto).
export const PHOTO_LABELS = ['Antes', 'Después', 'Sticker ficha', 'Sticker paciente'] as const;
export type PhotoLabel = (typeof PHOTO_LABELS)[number];

// Producto/lote/vencimiento/cantidad al evolucionar un ítem cuya prestación
// exige trazabilidad — usado en EvolucionesTab (y validado de nuevo en
// evolutionsController.ts).
export function missingRequiredProductFields(fields: {
  productName: string;
  productLot: string;
  productExpiresAt: string;
  productQuantity: string;
}) {
  return (
    !fields.productName.trim() ||
    !fields.productLot.trim() ||
    !fields.productExpiresAt ||
    !fields.productQuantity.trim()
  );
}
