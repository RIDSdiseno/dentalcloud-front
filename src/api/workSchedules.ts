import { api } from './client';

export type WorkSchedule = {
  id: string;
  professionalId: string;
  chairId: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  chair: { id: string; number: number; name: string | null } | null;
};

export type WorkScheduleInput = {
  professionalId: string;
  chairId?: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

export async function fetchWorkSchedules(professionalId: string) {
  const { data } = await api.get<{ schedules: WorkSchedule[] }>('/work-schedules', {
    params: { professionalId },
  });
  return data.schedules;
}

export async function createWorkSchedule(input: WorkScheduleInput) {
  const { data } = await api.post<{ schedule: WorkSchedule }>('/work-schedules', input);
  return data.schedule;
}

export async function deleteWorkSchedule(id: string) {
  await api.delete(`/work-schedules/${id}`);
}
