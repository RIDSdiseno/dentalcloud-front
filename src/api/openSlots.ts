import { api } from './client';

export type OpenSlot = {
  id: string;
  clinicaId: string;
  chairId: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  status: string;
  createdByUserId: string;
  appointmentId: string | null;
  chair: { id: string; number: number; name: string | null };
  professional: { id: string; name: string };
};

export type OpenSlotInput = {
  chairId: string;
  professionalId?: string;
  startAt: string;
  endAt: string;
};

export async function fetchOpenSlots(date: string, professionalId?: string) {
  const { data } = await api.get<{ openSlots: OpenSlot[] }>('/open-slots', { params: { date, professionalId } });
  return data.openSlots;
}

export async function createOpenSlot(input: OpenSlotInput) {
  const { data } = await api.post<{ openSlot: OpenSlot }>('/open-slots', input);
  return data.openSlot;
}

export async function deleteOpenSlot(id: string) {
  await api.delete(`/open-slots/${id}`);
}
