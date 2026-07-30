import { api } from './client';
import type { Sucursal, Prevision, Convenio, Prestacion } from './catalogs';

export type TreatmentStatus = 'sin_iniciar' | 'en_tratamiento' | 'terminado' | 'alta';

export type TreatmentItem = {
  id: string;
  treatmentPlanId: string;
  prestacionId: string | null;
  prestacion: Prestacion | null;
  toothNumber: string | null;
  description: string;
  listPrice: number;
  convenioDiscountPercent: number;
  cost: number;
  completed: boolean;
  // Observación clínica del procedimiento (ej. producto usado, reacción del
  // paciente) — distinta de las notas generales del presupuesto.
  notes: string | null;
  createdAt: string;
};

export type TreatmentPlan = {
  id: string;
  number: number;
  patientId: string;
  professionalId: string | null;
  sucursalId: string | null;
  previsionId: string | null;
  convenioId: string | null;
  name: string | null;
  paymentMethod: string | null;
  status: TreatmentStatus;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  professional: { id: string; name: string } | null;
  sucursal: Sucursal | null;
  prevision: Prevision | null;
  convenio: Convenio | null;
  items: TreatmentItem[];
};

export type TreatmentItemInput = {
  description: string;
  cost: number;
  prestacionId?: string;
  toothNumber?: string;
  listPrice?: number;
  convenioDiscountPercent?: number;
  notes?: string;
};

export type TreatmentPlanInput = {
  patientId: string;
  professionalId?: string;
  sucursalId?: string;
  previsionId?: string;
  convenioId?: string;
  name?: string;
  paymentMethod?: string;
  notes?: string;
  items?: TreatmentItemInput[];
};

export async function fetchTreatmentPlans(patientId: string) {
  const { data } = await api.get<{ plans: TreatmentPlan[] }>('/treatment-plans', {
    params: { patientId },
  });
  return data.plans;
}

export async function createTreatmentPlan(input: TreatmentPlanInput) {
  const { data } = await api.post<{ plan: TreatmentPlan }>('/treatment-plans', input);
  return data.plan;
}

export async function updateTreatmentPlan(
  id: string,
  patch: {
    status?: TreatmentStatus;
    notes?: string;
    professionalId?: string | null;
    name?: string;
    paymentMethod?: string | null;
  }
) {
  const { data } = await api.patch<{ plan: TreatmentPlan }>(`/treatment-plans/${id}`, patch);
  return data.plan;
}

export async function deleteTreatmentPlan(id: string) {
  await api.delete(`/treatment-plans/${id}`);
}

export async function addTreatmentItem(planId: string, item: TreatmentItemInput) {
  const { data } = await api.post<{ plan: TreatmentPlan }>(`/treatment-plans/${planId}/items`, item);
  return data.plan;
}

export async function updateTreatmentItem(
  id: string,
  patch: { description?: string; cost?: number; completed?: boolean; toothNumber?: string | null; notes?: string | null }
) {
  const { data } = await api.patch<{ plan: TreatmentPlan }>(`/treatment-items/${id}`, patch);
  return data.plan;
}

export async function deleteTreatmentItem(id: string) {
  const { data } = await api.delete<{ plan: TreatmentPlan }>(`/treatment-items/${id}`);
  return data.plan;
}
