import { api } from './client';
import type { Sucursal, Prevision, Convenio, Prestacion } from './catalogs';
import type { FacialAnnotations } from '../pages/pacientes/facialZoneConfig';

export type TreatmentStatus = 'sin_iniciar' | 'en_tratamiento' | 'terminado' | 'alta';

export type TreatmentItemPhoto = {
  id: string;
  treatmentItemId: string;
  url: string;
  label: string | null;
  createdAt: string;
};

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
  // Profesional que efectivamente trató el procedimiento — se registra solo
  // al marcar `completed`, distinto de `TreatmentPlan.professional` (quien
  // creó el presupuesto).
  treatedBy: { id: string; name: string } | null;
  treatedAt: string | null;
  // Observación clínica del procedimiento (ej. producto usado, reacción del
  // paciente) — distinta de las notas generales del presupuesto.
  notes: string | null;
  // Trazabilidad del producto usado (ej. estética facial: ácido hialurónico).
  productName: string | null;
  productLot: string | null;
  productExpiresAt: string | null;
  productQuantity: string | null;
  photos: TreatmentItemPhoto[];
  createdAt: string;
};

export type TreatmentPlanPhoto = {
  id: string;
  treatmentPlanId: string;
  url: string;
  label: string | null;
  position: number;
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
  // "dental" | "estetica" — qué diagrama se usó para armar este plan. Solo
  // relevante para clínicas tipo "ambas"; en clínicas puras coincide siempre
  // con el tipo de la clínica.
  diagramType: 'dental' | 'estetica';
  createdAt: string;
  updatedAt: string;
  professional: { id: string; name: string } | null;
  // Usuario que efectivamente creó el registro — distinto de `professional`,
  // ya que un admin puede crear el presupuesto y asignarlo a otro profesional.
  createdBy: { id: string; name: string } | null;
  sucursal: Sucursal | null;
  prevision: Prevision | null;
  convenio: Convenio | null;
  items: TreatmentItem[];
  photos: TreatmentPlanPhoto[];
  facialAnnotations: FacialAnnotations | null;
  facialGender: 'hombre' | 'mujer' | null;
};

export type TreatmentItemInput = {
  description: string;
  cost: number;
  prestacionId?: string;
  toothNumber?: string;
  listPrice?: number;
  convenioDiscountPercent?: number;
  notes?: string;
  productName?: string;
  productLot?: string;
  productExpiresAt?: string;
  productQuantity?: string;
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
  diagramType?: 'dental' | 'estetica';
  items?: TreatmentItemInput[];
  facialAnnotations?: FacialAnnotations;
  facialGender?: 'hombre' | 'mujer';
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
  patch: {
    description?: string;
    cost?: number;
    completed?: boolean;
    toothNumber?: string | null;
    notes?: string | null;
    productName?: string | null;
    productLot?: string | null;
    productExpiresAt?: string | null;
    productQuantity?: string | null;
  }
) {
  const { data } = await api.patch<{ plan: TreatmentPlan }>(`/treatment-items/${id}`, patch);
  return data.plan;
}

export async function deleteTreatmentItem(id: string) {
  const { data } = await api.delete<{ plan: TreatmentPlan }>(`/treatment-items/${id}`);
  return data.plan;
}

export async function uploadTreatmentItemPhoto(itemId: string, file: File, label?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (label) formData.append('label', label);
  const { data } = await api.post<{ plan: TreatmentPlan }>(`/treatment-items/${itemId}/photos`, formData);
  return data.plan;
}

export async function deleteTreatmentItemPhoto(photoId: string) {
  const { data } = await api.delete<{ plan: TreatmentPlan }>(`/treatment-items/photos/${photoId}`);
  return data.plan;
}

export async function uploadTreatmentPlanPhoto(planId: string, file: Blob, label?: string) {
  const formData = new FormData();
  formData.append('file', file, 'plantilla.png');
  if (label) formData.append('label', label);
  const { data } = await api.post<{ plan: TreatmentPlan }>(`/treatment-plans/${planId}/photos`, formData);
  return data.plan;
}

export async function deleteTreatmentPlanPhoto(photoId: string) {
  const { data } = await api.delete<{ plan: TreatmentPlan }>(`/treatment-plans/photos/${photoId}`);
  return data.plan;
}
