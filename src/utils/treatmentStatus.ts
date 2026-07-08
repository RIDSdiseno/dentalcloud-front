import type { TreatmentStatus } from '../api/treatmentPlans';

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  sin_iniciar: 'Sin iniciar',
  en_tratamiento: 'En tratamiento',
  terminado: 'Terminado',
  alta: 'Alta',
};

export const TREATMENT_STATUS_CLASSES: Record<TreatmentStatus, string> = {
  sin_iniciar: 'bg-slate-100 text-slate-600',
  en_tratamiento: 'bg-amber-100 text-amber-700',
  terminado: 'bg-emerald-100 text-emerald-700',
  alta: 'bg-brand-100 text-brand-700',
};

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}
