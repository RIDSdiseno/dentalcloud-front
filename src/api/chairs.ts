import { api } from './client';

export type Chair = {
  id: string;
  number: number;
  name: string | null;
  active: boolean;
  createdAt: string;
};

export async function fetchChairs(includeInactive = false) {
  const { data } = await api.get<{ chairs: Chair[] }>('/chairs', {
    params: includeInactive ? { all: 'true' } : undefined,
  });
  return data.chairs;
}

export async function createChair(input: { number: number; name?: string }) {
  const { data } = await api.post<{ chair: Chair }>('/chairs', input);
  return data.chair;
}

export async function updateChair(id: string, input: { name?: string | null; active?: boolean }) {
  const { data } = await api.patch<{ chair: Chair }>(`/chairs/${id}`, input);
  return data.chair;
}

export async function deleteChair(id: string) {
  await api.delete(`/chairs/${id}`);
}
