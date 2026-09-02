import { api } from './client';
import type { AllergyKey } from '../data/allergies';

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
  gender: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  occupation: string | null;
  heightCm: number | null;
  weightKg: number | null;
  allergies: AllergyKey[];
  allergyNotes: string | null;
  medicalConditions: string | null;
  currentMedications: string | null;
  chronicDiseases: string | null;
  dentalHistory: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  healthInsurance: string | null;
  healthInsuranceDetail: string | null;
  bloodType: string | null;
  tags: string[];
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // Snapshot del consentimiento de protección de datos, derivado de la nueva
  // tabla `consents` (tipo 'proteccion_datos') para no romper vistas que solo
  // necesitan ese estado puntual (lista de pacientes, stats de super-admin).
  // El detalle completo con todos los tipos de consentimiento vive en
  // ConsentimientosTab, vía api/dataConsents.ts.
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
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  occupation?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  allergies?: AllergyKey[];
  allergyNotes?: string;
  medicalConditions?: string;
  currentMedications?: string;
  chronicDiseases?: string;
  dentalHistory?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  healthInsurance?: string;
  healthInsuranceDetail?: string;
  bloodType?: string;
  tags?: string[];
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

export async function uploadPatientPhoto(id: string, photo: File) {
  const formData = new FormData();
  formData.append('photo', photo);
  const { data } = await api.patch<{ patient: Patient }>(`/patients/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.patient;
}
