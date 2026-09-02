export const STATUS_LABEL: Record<string, string> = {
  agendada: 'Agendada',
  llego: 'En espera',
  en_atencion: 'En atención',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

export const STATUS_BADGE_CLASS: Record<string, string> = {
  agendada: 'bg-slate-100 text-slate-600',
  llego: 'bg-amber-100 text-amber-700',
  en_atencion: 'bg-emerald-100 text-emerald-700',
  finalizada: 'bg-brand-100 text-brand-700',
  cancelada: 'bg-red-100 text-red-700',
};

export const STATUS_DOT_CLASS: Record<string, string> = {
  agendada: 'bg-slate-400',
  llego: 'bg-amber-500',
  en_atencion: 'bg-emerald-500',
  finalizada: 'bg-brand-500',
  cancelada: 'bg-red-500',
};
