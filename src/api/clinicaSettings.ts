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

export type PermissionKey = ClinicaModuleKey | 'rx' | 'crearPresupuestos' | GeneralPatientPermissionKey;

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
