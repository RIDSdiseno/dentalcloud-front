import { api } from './client';

export type Evolution = {
  id: string;
  patientId: string;
  professionalId: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  professional: { id: string; name: string };
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

export async function createEvolution(input: { patientId: string; professionalId?: string; content: string }) {
  const { data } = await api.post<{ evolution: Evolution }>('/evolutions', input);
  return data.evolution;
}

export async function updateEvolution(id: string, patch: { content?: string; enabled?: boolean }) {
  const { data } = await api.patch<{ evolution: Evolution }>(`/evolutions/${id}`, patch);
  return data.evolution;
}
