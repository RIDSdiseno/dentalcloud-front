import { api } from './client';

export type ConsultationPayment = {
  id: string;
  clinicaId: string;
  rut: string;
  firstName: string;
  lastName: string;
  email: string | null;
  amount: number;
  paymentMethod: string | null;
  registeredById: string;
  createdAt: string;
};

export async function fetchConsultationPayments() {
  const { data } = await api.get<{ payments: ConsultationPayment[] }>('/consultation-payments');
  return data.payments;
}

export async function createConsultationPayment(input: {
  rut: string;
  firstName: string;
  lastName: string;
  email?: string;
  amount: number;
  paymentMethod?: string;
}) {
  const { data } = await api.post<{ payment: ConsultationPayment }>('/consultation-payments', input);
  return data.payment;
}

export async function findConsultationPaymentByRut(rut: string) {
  const { data } = await api.get<{ payment: ConsultationPayment | null }>(
    `/consultation-payments/by-rut/${encodeURIComponent(rut)}`
  );
  return data.payment;
}
