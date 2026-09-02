import { api } from './client';

export type ClinicaModuleKey =
  | 'pacientes'
  | 'documentosClinicos'
  | 'cartola'
  | 'evoluciones'
  | 'observaciones'
  | 'agenda'
  | 'tratamientos'
  | 'consentimientos';

export type ClinicaModules = Record<ClinicaModuleKey, boolean>;

export type ConsentStats = { pendiente: number; firmado: number; rechazado: number };

export type FederationSyncKey = 'patients' | 'appointments' | 'treatmentPlans' | 'users' | 'sucursales' | 'catalog';
export type FederationSyncSettings = Record<FederationSyncKey, boolean>;

export type Clinica = {
  id: string;
  name: string;
  rut: string | null;
  active: boolean;
  tipo: string;
  pais: string;
  logoUrl: string | null;
  rxEnabled: boolean;
  modules: ClinicaModules;
  federatedClinicId: string | null;
  federationCatalogOnly: boolean;
  federationPaused: boolean;
  federationSyncSettings: FederationSyncSettings;
  createdAt: string;
  patientsCount: number;
  usersCount: number;
  appointmentsCount: number;
  treatmentPlansCount: number;
  treatmentPlansAmount: number;
  documentsCount: number;
  evolutionsCount: number;
  observationsCount: number;
  ledgerMovementsCount: number;
  ledgerNetAmount: number;
  consentStats: ConsentStats;
};

export type AdminPatient = {
  id: string;
  firstName: string;
  lastName: string;
  rut: string;
  createdAt: string;
  privacyConsentStatus: 'pendiente' | 'firmado' | 'rechazado' | 'expirado';
  privacyConsentSentAt: string | null;
  privacyConsentAt: string | null;
  clinicaId: string;
  clinicaName: string;
};

export type AdminAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  type: string;
  clinicaId: string;
  clinicaName: string;
  patientName: string;
};

export type AdminTreatmentPlan = {
  id: string;
  name: string | null;
  status: string;
  amount: number;
  createdAt: string;
  clinicaId: string;
  clinicaName: string;
  patientName: string;
};

export type AdminDocument = {
  id: string;
  category: string;
  fileName: string;
  createdAt: string;
  clinicaId: string;
  clinicaName: string;
  patientName: string;
};

export type AdminLedgerMovement = {
  id: string;
  type: string;
  debe: number;
  haber: number;
  description: string | null;
  createdAt: string;
  clinicaId: string;
  clinicaName: string;
  patientName: string;
};

export type AdminEvolution = {
  id: string;
  summary: string;
  createdAt: string;
  clinicaId: string;
  clinicaName: string;
  patientName: string;
  professionalName: string;
};

export type AdminObservation = {
  id: string;
  summary: string;
  createdAt: string;
  clinicaId: string;
  clinicaName: string;
  patientName: string;
  professionalName: string;
};

export async function fetchClinicas() {
  const { data } = await api.get<{ clinicas: Clinica[] }>('/clinicas');
  return data.clinicas;
}

export async function fetchAllPatients() {
  const { data } = await api.get<{ patients: AdminPatient[] }>('/clinicas/pacientes');
  return data.patients;
}

export async function fetchAllAppointments() {
  const { data } = await api.get<{ appointments: AdminAppointment[] }>('/clinicas/citas');
  return data.appointments;
}

export async function fetchAllTreatmentPlans() {
  const { data } = await api.get<{ treatmentPlans: AdminTreatmentPlan[] }>('/clinicas/tratamientos');
  return data.treatmentPlans;
}

export async function fetchAllDocuments() {
  const { data } = await api.get<{ documents: AdminDocument[] }>('/clinicas/documentos');
  return data.documents;
}

export async function fetchAllLedgerMovements() {
  const { data } = await api.get<{ movements: AdminLedgerMovement[] }>('/clinicas/cartola');
  return data.movements;
}

export async function fetchAllEvolutions() {
  const { data } = await api.get<{ evolutions: AdminEvolution[] }>('/clinicas/evoluciones');
  return data.evolutions;
}

export async function fetchAllObservations() {
  const { data } = await api.get<{ observations: AdminObservation[] }>('/clinicas/observaciones');
  return data.observations;
}

export async function updateClinica(
  id: string,
  patch: {
    name?: string;
    rut?: string;
    active?: boolean;
    tipo?: string;
    pais?: string;
    rxEnabled?: boolean;
    modules?: Partial<ClinicaModules>;
    federationCatalogOnly?: boolean;
    federationPaused?: boolean;
    federationSyncSettings?: Partial<FederationSyncSettings>;
  }
) {
  const { data } = await api.patch<{ clinica: Clinica }>(`/clinicas/${id}`, patch);
  return data.clinica;
}

export async function connectClinicaFederation(id: string) {
  const { data } = await api.post<{ clinica: Clinica }>(`/clinicas/${id}/federation/connect`);
  return data.clinica;
}

export async function disconnectClinicaFederation(id: string) {
  const { data } = await api.post<{ clinica: Clinica }>(`/clinicas/${id}/federation/disconnect`);
  return data.clinica;
}

export async function updateClinicaLogo(id: string, logo: File) {
  const formData = new FormData();
  formData.append('logo', logo);
  const { data } = await api.patch<{ clinica: Clinica }>(`/clinicas/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.clinica;
}

export async function createClinica(input: {
  name: string;
  rut?: string;
  tipo: string;
  pais: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  logo?: File | null;
}) {
  const formData = new FormData();
  formData.append('name', input.name);
  if (input.rut) formData.append('rut', input.rut);
  formData.append('tipo', input.tipo);
  formData.append('pais', input.pais);
  formData.append('adminName', input.adminName);
  formData.append('adminEmail', input.adminEmail);
  formData.append('adminPassword', input.adminPassword);
  if (input.logo) formData.append('logo', input.logo);

  const { data } = await api.post<{ clinica: Clinica }>('/clinicas', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.clinica;
}
