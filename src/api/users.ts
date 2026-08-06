import { api } from './client';

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
