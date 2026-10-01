import { api } from './client';
import type { Patient } from './patients';

export type AppointmentStatus = 'agendada' | 'llego' | 'en_atencion' | 'finalizada' | 'cancelada';

// "Motivo de consulta" al agendar (reunión 30/09, tarea 21). Antes todo se
// escribía mezclado en el campo libre "Motivo / notas".
export type ConsultaTipo = 'primera_vez' | 'tratamiento';

export const CONSULTA_TIPO_LABELS: Record<ConsultaTipo, string> = {
  primera_vez: 'Primera vez',
  tratamiento: 'Tratamiento',
};

export type Appointment = {
  id: string;
  chairId: string;
  patientId: string;
  professionalId: string | null;
  startAt: string;
  endAt: string;
  notes: string | null;
  // Cancelación: motivo obligatorio, con quién la canceló y cuándo. Null en
  // las citas vigentes y en las que se cancelaron antes de este cambio.
  cancelacionMotivo: string | null;
  canceladaAt: string | null;
  canceladaPor: { id: string; name: string } | null;
  // "Primera vez / Tratamiento" y el motivo cuando es tratamiento.
  consultaTipo: ConsultaTipo | null;
  motivoConsulta: string | null;
  status: string;
  type: string;
  arrivedAt: string | null;
  attentionStartedAt: string | null;
  attentionEndedAt: string | null;
  motivoUrgencia: string | null;
  triageLevel: string | null;
  receivedByUserId: string | null;
  patientConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: Pick<Patient, 'id' | 'rut' | 'firstName' | 'lastName' | 'phone'>;
  professional: { id: string; name: string } | null;
  receivedBy: { id: string; name: string } | null;
  chair: { id: string; number: number; name: string | null } | null;
};

export type AppointmentInput =
  | {
      chairId: string;
      patientId: string;
      professionalId?: string;
      startAt: string;
      endAt: string;
      notes?: string;
      type?: string;
      consultaTipo?: ConsultaTipo;
      motivoConsulta?: string;
      openSlotId?: undefined;
    }
  | {
      // Nace de tomar una hora publicada ("Agregar horas disponibles") — el
      // sillón/profesional/horario los define el backend a partir de la hora
      // publicada, no se mandan acá.
      openSlotId: string;
      patientId: string;
      notes?: string;
      type?: string;
      consultaTipo?: ConsultaTipo;
      motivoConsulta?: string;
    };

export type TriageLevel = 'leve' | 'moderada' | 'grave';

export type UrgencyAppointmentInput = {
  patientId: string;
  professionalId?: string;
  motivoUrgencia: string;
  triageLevel?: TriageLevel;
  durationMinutes?: number;
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

export async function createUrgencyAppointment(input: UrgencyAppointmentInput) {
  const { data } = await api.post<{ appointment: Appointment }>('/appointments/urgencia', input);
  return data.appointment;
}

/** Cancela la cita (no la borra): exige un motivo y devuelve la cita ya
 *  cancelada, que sigue en el historial del paciente. */
export async function cancelAppointment(id: string, reason: string) {
  const { data } = await api.delete<{ appointment: Appointment }>(`/appointments/${id}`, { data: { reason } });
  return data.appointment;
}

export async function markAppointmentArrival(id: string) {
  const { data } = await api.patch<{ appointment: Appointment }>(`/appointments/${id}/arrival`);
  return data.appointment;
}

export async function startAppointmentAttention(id: string) {
  const { data } = await api.patch<{ appointment: Appointment }>(`/appointments/${id}/start-attention`);
  return data.appointment;
}

export async function finishAppointmentAttention(id: string) {
  const { data } = await api.patch<{ appointment: Appointment }>(`/appointments/${id}/finish`);
  return data.appointment;
}
