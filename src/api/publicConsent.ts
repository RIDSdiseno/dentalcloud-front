import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

// Instancia sin credenciales ni interceptors de JWT: esta página se abre sin sesión.
const publicApi = axios.create({ baseURL });

export type PublicConsent = {
  patientName: string;
  consentTypeName: string;
  contentSnapshot: string;
  pdfUrl: string | null;
  expiresAt: string;
};

export async function fetchPublicConsent(token: string) {
  const { data } = await publicApi.get<PublicConsent>(`/public/consents/${token}`);
  return data;
}

export async function respondPublicConsent(
  token: string,
  input: {
    decision: 'firmado' | 'rechazado';
    signerName: string;
    signerRut: string;
    readConfirmed: boolean;
    signatureDataUrl?: string | null;
  }
) {
  const { data } = await publicApi.post<{ status: string; respondedAt: string }>(
    `/public/consents/${token}/respond`,
    input
  );
  return data;
}
