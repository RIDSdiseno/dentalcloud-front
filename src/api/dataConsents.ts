import { api } from './client';

export async function sendDataConsent(patientId: string) {
  const { data } = await api.post<{ status: string; sentAt: string; expiresAt: string }>(
    '/data-consents',
    { patientId }
  );
  return data;
}

export async function fetchConsentText() {
  const { data } = await api.get<{ text: string }>('/data-consents/text');
  return data.text;
}

export async function respondDataConsentInPerson(
  patientId: string,
  input: { decision: 'firmado' | 'rechazado'; signerName: string; signerRut: string; readConfirmed: boolean }
) {
  const { data } = await api.post<{ status: string; respondedAt: string }>(
    `/data-consents/${patientId}/respond`,
    input
  );
  return data;
}
