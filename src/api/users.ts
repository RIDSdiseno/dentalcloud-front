import { api } from './client';
import type { ClinicaModuleKey } from './clinicas';
import type { PermissionKey } from './clinicaSettings';

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  rut: string | null;
  createdAt: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'odontologo' | 'radiologo' | 'operador';
  rut?: string;
};

// Cuando el profesional (odontólogo/radiólogo) se sincroniza con RIDS RX y esa
// sincronización generó una contraseña nueva para su cuenta allá (radiólogos
// necesitan login propio en RIDS RX), viaja una única vez en la respuesta.
export type DimageSyncResult = {
  dimageGeneratedPassword?: string | null;
  dimageSyncError?: string | null;
};

export type ImportedProfessional = { name: string; rut: string; role: string; generatedPassword: string };

export async function fetchUsers() {
  const { data } = await api.get<{ users: StaffUser[] }>('/users');
  return data.users;
}

export async function createUser(input: CreateUserInput) {
  const { data } = await api.post<{ user: StaffUser } & DimageSyncResult>('/users', input);
  return data;
}

export async function updateUserRut(id: string, rut: string | null) {
  const { data } = await api.patch<{ user: StaffUser } & DimageSyncResult>(`/users/${id}`, { rut });
  return data;
}

export async function importProfessionalsFromDimage() {
  const { data } = await api.post<{ imported: ImportedProfessional[] }>('/users/import-from-dimage');
  return data.imported;
}

// Excepciones de permisos/módulos para un usuario puntual, por encima del
// default de su rol y del plan de la clínica — ver PermisosUsuarioModal.
export type UserPermissionsInfo = {
  role: string;
  isPermissionedRole: boolean;
  permissionDefaults: Record<PermissionKey, boolean>;
  moduleDefaults: Record<ClinicaModuleKey, boolean>;
  permissionOverrides: Partial<Record<PermissionKey, boolean>>;
  moduleOverrides: Partial<Record<ClinicaModuleKey, boolean>>;
  effectivePermissions: Record<PermissionKey, boolean>;
  effectiveModules: Record<ClinicaModuleKey, boolean>;
};

export async function fetchUserPermissions(userId: string) {
  const { data } = await api.get<UserPermissionsInfo>(`/users/${userId}/permissions`);
  return data;
}

// `null` en un valor borra la excepción (vuelve a heredar el default).
export async function updateUserPermissionOverrides(
  userId: string,
  patch: {
    permissionOverrides?: Partial<Record<PermissionKey, boolean | null>>;
    moduleOverrides?: Partial<Record<ClinicaModuleKey, boolean | null>>;
  }
) {
  const { data } = await api.patch<{
    permissionOverrides: Partial<Record<PermissionKey, boolean>>;
    moduleOverrides: Partial<Record<ClinicaModuleKey, boolean>>;
  }>(`/users/${userId}/permissions`, patch);
  return data;
}
