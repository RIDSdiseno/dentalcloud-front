import { api } from './client';
import type { EvolutionExamRoundRef } from './patients';

export type EvolutionPhoto = {
  id: string;
  evolutionId: string;
  url: string;
  label: string | null;
  createdAt: string;
};

export type Evolution = {
  id: string;
  patientId: string;
  professionalId: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  professional: { id: string; name: string };
  // Anulación. Una evolución es registro clínico: no se borra, se anula — se
  // queda en la ficha, tachada, con quién, cuándo y por qué (ver backend).
  // `anuladaAt === null` significa vigente.
  anuladaAt: string | null;
  anulacionMotivo: string | null;
  anuladaPor: { id: string; name: string } | null;
  // Procedimiento del presupuesto que esta evolución documenta — al crearla
  // con esto, el procedimiento queda marcado como realizado (ver backend).
  treatmentItem: { id: string; description: string; treatmentPlanId: string } | null;
  // Trazabilidad del producto usado, documentada al evolucionar (no al
  // presupuestar — el presupuesto puede venir de otro sistema).
  productName: string | null;
  productLot: string | null;
  productExpiresAt: string | null;
  productQuantity: string | null;
  /** Lo que costó el insumo aplicado. Foto del precio al momento de atender. */
  productTotalCost: number | null;
  photos: EvolutionPhoto[];
  // Avances del Examen Estético que esta evolución muestra (tarea 18).
  examRounds: (EvolutionExamRoundRef & { id: string })[];
};

export type EnabledFilter = 'true' | 'false' | 'all';

export async function fetchEvolutions(
  patientId: string,
  options?: { professionalId?: string; enabled?: EnabledFilter }
) {
  const { data } = await api.get<{ evolutions: Evolution[] }>('/evolutions', {
    params: {
      patientId,
      professionalId: options?.professionalId || undefined,
      enabled: options?.enabled ?? 'true',
    },
  });
  return data.evolutions;
}

export async function createEvolution(input: {
  patientId: string;
  professionalId?: string;
  content: string;
  treatmentItemId?: string;
  productName?: string;
  productLot?: string;
  productExpiresAt?: string;
  productQuantity?: string;
  /** Lote real del inventario: si van los tres, el backend descuenta el stock. */
  productLotId?: string;
  productSupplyId?: string;
  productQuantityUsed?: number;
  productUnitCost?: number;
  examRounds?: EvolutionExamRoundRef[];
}) {
  const { data } = await api.post<{ evolution: Evolution }>('/evolutions', input);
  return data.evolution;
}

export async function updateEvolution(
  id: string,
  patch: { content?: string; enabled?: boolean; examRounds?: EvolutionExamRoundRef[] }
) {
  const { data } = await api.patch<{ evolution: Evolution }>(`/evolutions/${id}`, patch);
  return data.evolution;
}

export async function uploadEvolutionPhoto(evolutionId: string, file: File, label?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (label) formData.append('label', label);
  const { data } = await api.post<{ evolution: Evolution }>(`/evolutions/${evolutionId}/photos`, formData);
  return data.evolution;
}

export async function deleteEvolutionPhoto(photoId: string) {
  const { data } = await api.delete<{ evolution: Evolution }>(`/evolutions/photos/${photoId}`);
  return data.evolution;
}

// Anula la evolución (no es deshabilitar, y no la borra): exige un motivo y
// devuelve la evolución ya anulada, que sigue apareciendo en la ficha. El
// endpoint sigue siendo DELETE por compatibilidad con el resto del front.
export async function annulEvolution(id: string, reason: string) {
  const { data } = await api.delete<{ evolution: Evolution }>(`/evolutions/${id}`, { data: { reason } });
  return data.evolution;
}
