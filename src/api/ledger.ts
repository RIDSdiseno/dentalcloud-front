import { api } from './client';

export type LedgerMovementType = 'abono' | 'interes' | 'ajuste';

export type LedgerMovement = {
  id: string;
  number: number;
  patientId: string;
  treatmentPlanId: string | null;
  treatmentPlan: { id: string; number: number; name: string | null } | null;
  type: LedgerMovementType;
  debe: number;
  haber: number;
  description: string | null;
  paymentMethod: string | null;
  documentNumber: string | null;
  notes: string | null;
  createdAt: string;
  registeredBy: { id: string; name: string };
};

export type PlanLedgerRow = {
  id: string;
  number: number;
  name: string | null;
  createdAt: string;
  subtotal: number;
  interes: number;
  ajustes: number;
  total: number;
  abonado: number;
  saldo: number;
};

export type LedgerRow = {
  id: string;
  comprobante: string;
  number: number;
  createdAt: string;
  debe: number;
  haber: number;
  planNumber: number | null;
  description: string | null;
  paymentMethod: string | null;
  documentNumber: string | null;
  notes: string | null;
  deletable: boolean;
};

export type LedgerSummary = {
  plans: PlanLedgerRow[];
  totals: {
    subtotal: number;
    interes: number;
    ajustes: number;
    total: number;
    abonado: number;
    saldo: number;
  };
  abonosLibres: LedgerMovement[];
  intereses: LedgerMovement[];
  ajustes: LedgerMovement[];
  ledger: LedgerRow[];
  abonosLibresTotal: number;
  saldoTotal: number;
};

export type LedgerMovementInput = {
  patientId: string;
  treatmentPlanId?: string;
  type: LedgerMovementType;
  amount: number;
  direction?: 'debe' | 'haber';
  description?: string;
  paymentMethod?: string;
  documentNumber?: string;
  notes?: string;
};

export async function fetchLedgerSummary(patientId: string) {
  const { data } = await api.get<LedgerSummary>('/ledger/summary', { params: { patientId } });
  return data;
}

export async function createLedgerMovement(input: LedgerMovementInput) {
  const { data } = await api.post<{ movement: LedgerMovement }>('/ledger/movements', input);
  return data.movement;
}

export async function deleteLedgerMovement(id: string) {
  await api.delete(`/ledger/movements/${id}`);
}
