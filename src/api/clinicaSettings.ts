import { api } from './client';
import type { ClinicaModuleKey } from './clinicas';

export const PERMISSIONED_ROLES = ['odontologo', 'radiologo', 'operador'] as const;
export type PermissionedRole = (typeof PERMISSIONED_ROLES)[number];

export type PermissionKey = ClinicaModuleKey | 'rx';

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
