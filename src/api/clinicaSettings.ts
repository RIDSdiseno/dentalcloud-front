import { api } from './client';
import type { ClinicaModuleKey } from './clinicas';

export const PERMISSIONED_ROLES = ['odontologo', 'radiologo', 'operador'] as const;
export type PermissionedRole = (typeof PERMISSIONED_ROLES)[number];

// "Permisos generales": grupos de campos dentro de la ficha del paciente
// (no pantallas completas) — ver PATIENT_FIELD_GROUPS en el backend
// (patientsController.ts) para el detalle de qué campos cubre cada uno.
export const GENERAL_PATIENT_PERMISSION_KEYS = [
  'datosPersonales',
  'datosContacto',
  'antecedentesMedicos',
  'motivoConsulta',
  'contactoEmergencia',
] as const;
export type GeneralPatientPermissionKey = (typeof GENERAL_PATIENT_PERMISSION_KEYS)[number];

// Pestañas de la ficha del paciente que no dependen de un módulo del plan —
// ver PATIENT_TAB_PERMISSION_KEYS en el backend (rolePermissions.ts).
export const PATIENT_TAB_PERMISSION_KEYS = ['fichaDatos', 'fichaExamenEstetico', 'fichaHoras'] as const;
export type PatientTabPermissionKey = (typeof PATIENT_TAB_PERMISSION_KEYS)[number];

export type PermissionKey =
  | ClinicaModuleKey
  | 'rx'
  | 'crearPresupuestos'
  | 'eliminarEvoluciones'
  | 'cartolaGeneral'
  | GeneralPatientPermissionKey
  | PatientTabPermissionKey;

export type RolePermissions = Record<PermissionedRole, Record<PermissionKey, boolean>>;

export async function fetchRolePermissions() {
  const { data } = await api.get<{ rolePermissions: RolePermissions }>('/clinica/role-permissions');
  return data.rolePermissions;
}

export async function updateRolePermissions(
  patch: Partial<Record<PermissionedRole, Partial<Record<PermissionKey, boolean>>>>
) {
  const { data } = await api.patch<{ rolePermissions: RolePermissions }>('/clinica/role-permissions', patch);
  return data.rolePermissions;
}

export const SLOT_DURATION_OPTIONS = [15, 30, 60] as const;
export type SlotDurationMinutes = (typeof SLOT_DURATION_OPTIONS)[number];

export async function updateAgendaSettings(slotDurationMinutes: SlotDurationMinutes) {
  const { data } = await api.patch<{ slotDurationMinutes: number }>('/clinica/agenda-settings', {
    slotDurationMinutes,
  });
  return data.slotDurationMinutes;
}

// "Compañía" en Configuración (15/09, Lámina 8 de la reunión con Urbina) —
// de solo la propia clínica de quien pide, siempre de solo administradores.
export type CompanyInfo = {
  name: string;
  rut: string | null;
  pais: string;
  logoUrl: string | null;
  /** Timbre de la clínica: sale como marca de agua en los PDF. */
  timbreUrl: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  legalName: string | null;
  legalAddress: string | null;
  legalEmail: string | null;
  legalPhone: string | null;
  legalWebsite: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
};

export async function fetchCompanyInfo() {
  const { data } = await api.get<{ company: CompanyInfo }>('/clinica/company');
  return data.company;
}

export async function updateCompanyInfo(patch: Partial<Omit<CompanyInfo, 'logoUrl'>>) {
  const { data } = await api.patch<{ company: CompanyInfo }>('/clinica/company', patch);
  return data.company;
}

// El timbre es por clínica: cada una sube el suyo y sus documentos salen con
// ese sello de fondo (reunión 30/09, tarea 15).
export async function uploadCompanyTimbre(file: File) {
  const formData = new FormData();
  formData.append('timbre', file);
  const { data } = await api.patch<{ company: CompanyInfo }>('/clinica/company/timbre', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.company;
}

export async function removeCompanyTimbre() {
  const { data } = await api.delete<{ company: CompanyInfo }>('/clinica/company/timbre');
  return data.company;
}

export async function uploadCompanyLogo(file: File) {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await api.patch<{ company: CompanyInfo }>('/clinica/company/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.company;
}
