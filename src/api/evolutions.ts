import { api } from './client';

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
  // Procedimiento del presupuesto que esta evolución documenta — al crearla
  // con esto, el procedimiento queda marcado como realizado (ver backend).
  treatmentItem: { id: string; description: string; treatmentPlanId: string } | null;
  // Trazabilidad del producto usado, documentada al evolucionar (no al
  // presupuestar — el presupuesto puede venir de otro sistema).
  productName: string | null;
  productLot: string | null;
  productExpiresAt: string | null;
  productQuantity: string | null;
  photos: EvolutionPhoto[];
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
}) {
  const { data } = await api.post<{ evolution: Evolution }>('/evolutions', input);
  return data.evolution;
}

export async function updateEvolution(id: string, patch: { content?: string; enabled?: boolean }) {
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

// Borra la evolución de verdad (no es deshabilitar) — exige un motivo, que
// queda guardado para auditoría (ver EvolutionDeletion en el backend).
export async function deleteEvolution(id: string, reason: string) {
  await api.delete(`/evolutions/${id}`, { data: { reason } });
}
