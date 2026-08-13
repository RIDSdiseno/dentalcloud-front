import { api } from './client';

export type ConsentStatus = 'pendiente' | 'firmado' | 'rechazado' | 'expirado';

export type ConsentType = {
  id: string;
  code: string;
  name: string;
  legalText: string;
  active: boolean;
  pdfUrl: string | null;
  pdfPublicId: string | null;
};

export type PatientConsent = {
  id: string;
  consentTypeId: string;
  status: ConsentStatus;
  method: 'email' | 'presencial' | null;
  sentAt: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  signerName: string | null;
  signerRut: string | null;
};

export async function fetchConsentTypes() {
  const { data } = await api.get<{ consentTypes: ConsentType[] }>('/data-consents/types');
  return data.consentTypes;
}

export async function fetchPatientConsents(patientId: string) {
  const { data } = await api.get<{ consents: PatientConsent[] }>(`/data-consents/patient/${patientId}`);
  return data.consents;
}

export async function sendDataConsent(patientId: string, consentTypeId: string) {
  const { data } = await api.post<{ status: ConsentStatus; sentAt: string; expiresAt: string }>('/data-consents', {
    patientId,
    consentTypeId,
  });
  return data;
}

export async function fetchConsentText(consentTypeId: string) {
  const { data } = await api.get<{ text: string; pdfUrl: string | null }>(`/data-consents/text/${consentTypeId}`);
  return data;
}

export async function uploadConsentTypePdf(consentTypeId: string, file: File) {
  const formData = new FormData();
  formData.append('pdf', file);
  const { data } = await api.post<{ consentType: ConsentType }>(
    `/data-consents/types/${consentTypeId}/pdf`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.consentType;
}

export async function removeConsentTypePdf(consentTypeId: string) {
  const { data } = await api.delete<{ consentType: ConsentType }>(`/data-consents/types/${consentTypeId}/pdf`);
  return data.consentType;
}

export async function downloadConsentPdf(consentId: string) {
  const { data } = await api.get<Blob>(`/data-consents/${consentId}/pdf`, { responseType: 'blob' });
  return data;
}

export async function respondDataConsentInPerson(
  patientId: string,
  consentTypeId: string,
  input: {
    decision: 'firmado' | 'rechazado';
    signerName: string;
    signerRut: string;
    readConfirmed: boolean;
    signatureDataUrl?: string | null;
  }
) {
  const { data } = await api.post<{ status: ConsentStatus; respondedAt: string }>(
    `/data-consents/${patientId}/${consentTypeId}/respond`,
    input
  );
  return data;
}
