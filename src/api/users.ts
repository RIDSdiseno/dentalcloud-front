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
};

export async function fetchUsers() {
  const { data } = await api.get<{ users: StaffUser[] }>('/users');
  return data.users;
}

export async function createUser(input: CreateUserInput) {
  const { data } = await api.post<{ user: StaffUser }>('/users', input);
  return data.user;
}

export async function updateUserRut(id: string, rut: string | null) {
  const { data } = await api.patch<{ user: StaffUser }>(`/users/${id}`, { rut });
  return data.user;
}
