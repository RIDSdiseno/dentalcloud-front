import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

// Instancia sin credenciales ni interceptors de JWT: esta página se abre sin sesión.
const publicApi = axios.create({ baseURL });

export type PublicAppointment = {
  patientFirstName: string;
  professionalName: string;
  startAt: string;
  clinicaNombre: string;
  clinicaLogoUrl: string | null;
  alreadyConfirmed: boolean;
};

export async function fetchPublicAppointment(token: string) {
  const { data } = await publicApi.get<PublicAppointment>(`/public/appointments/${token}`);
  return data;
}

export async function confirmPublicAppointment(token: string) {
  const { data } = await publicApi.post<{ confirmed: boolean }>(`/public/appointments/${token}/confirm`);
  return data;
}
