import { api } from './client';

export type AdministrativeObservation = {
  id: string;
  patientId: string;
  professionalId: string;
  content: string;
  createdAt: string;
  professional: { id: string; name: string };
};

export async function fetchObservations(patientId: string) {
  const { data } = await api.get<{ observations: AdministrativeObservation[] }>('/observations', {
    params: { patientId },
  });
  return data.observations;
}

export async function createObservation(input: { patientId: string; professionalId?: string; content: string }) {
  const { data } = await api.post<{ observation: AdministrativeObservation }>('/observations', input);
  return data.observation;
}

export async function deleteObservation(id: string) {
  await api.delete(`/observations/${id}`);
}
