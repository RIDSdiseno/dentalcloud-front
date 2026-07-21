import { api } from './client';

export type PrivacyConsentStatus = 'pendiente' | 'firmado' | 'rechazado' | 'expirado';

export type Patient = {
  id: string;
  rut: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  privacyConsentStatus: PrivacyConsentStatus;
  privacyConsentMethod: 'email' | 'presencial' | null;
  privacyConsentSentAt: string | null;
  privacyConsentExpiresAt: string | null;
  privacyConsentAt: string | null;
  privacyConsentSignerName: string | null;
  privacyConsentSignerRut: string | null;
};

export type PatientInput = {
  rut: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  address?: string;
};

export async function fetchPatients(search?: string) {
  const { data } = await api.get<{ patients: Patient[] }>('/patients', {
    params: search ? { search } : undefined,
  });
  return data.patients;
}

export async function fetchPatient(id: string) {
  const { data } = await api.get<{ patient: Patient }>(`/patients/${id}`);
  return data.patient;
}

export async function createPatient(input: PatientInput) {
  const { data } = await api.post<{ patient: Patient }>('/patients', input);
  return data.patient;
}

export async function updatePatient(id: string, input: Partial<PatientInput>) {
  const { data } = await api.patch<{ patient: Patient }>(`/patients/${id}`, input);
  return data.patient;
}
