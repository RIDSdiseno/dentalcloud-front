import { api } from './client';
import type { Patient } from './patients';

export type Appointment = {
  id: string;
  chairId: string;
  patientId: string;
  professionalId: string | null;
  startAt: string;
  endAt: string;
  notes: string | null;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  patient: Pick<Patient, 'id' | 'rut' | 'firstName' | 'lastName' | 'phone'>;
  professional: { id: string; name: string } | null;
  chair: { id: string; number: number; name: string | null } | null;
};

export type AppointmentInput = {
  chairId: string;
  patientId: string;
  professionalId?: string;
  startAt: string;
  endAt: string;
  notes?: string;
  type?: string;
};

export async function fetchAppointments(date: string, options?: { mine?: boolean }) {
  const { data } = await api.get<{ appointments: Appointment[] }>('/appointments', {
    params: { date, mine: options?.mine ? 'true' : undefined },
  });
  return data.appointments;
}

export async function fetchAppointmentsRange(from: string, to: string, chairId?: string) {
  const { data } = await api.get<{ appointments: Appointment[] }>('/appointments', {
    params: { from, to, chairId },
  });
  return data.appointments;
}

export async function fetchPatientAppointments(patientId: string) {
  const { data } = await api.get<{ appointments: Appointment[] }>('/appointments', {
    params: { patientId },
  });
  return data.appointments;
}

export async function createAppointment(input: AppointmentInput) {
  const { data } = await api.post<{ appointment: Appointment }>('/appointments', input);
  return data.appointment;
}

export async function deleteAppointment(id: string) {
  await api.delete(`/appointments/${id}`);
}
