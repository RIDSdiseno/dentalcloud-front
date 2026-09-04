import { api } from './client';

export type PaymentGateSettings = {
  paymentGateEnabled: boolean;
  paymentGateMinPercent: number;
};

export async function fetchPaymentGateSettings() {
  const { data } = await api.get<PaymentGateSettings>('/clinica/payment-gate-settings');
  return data;
}

export async function updatePaymentGateSettings(input: Partial<PaymentGateSettings>) {
  const { data } = await api.patch<PaymentGateSettings>('/clinica/payment-gate-settings', input);
  return data;
}
