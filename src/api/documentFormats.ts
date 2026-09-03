import { api } from './client';

export type FormatType = 'presupuesto' | 'examenes' | 'plan_tratamiento' | 'receta';

export type DocumentFormat = {
  id: string;
  clinicaId: string;
  name: string;
  type: FormatType;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchDocumentFormats() {
  const { data } = await api.get<{ formats: DocumentFormat[] }>('/document-formats');
  return data.formats;
}

export async function createDocumentFormat(input: { name: string; type: FormatType }) {
  const { data } = await api.post<{ format: DocumentFormat }>('/document-formats', input);
  return data.format;
}

export async function updateDocumentFormat(id: string, input: { name?: string; body?: string }) {
  const { data } = await api.patch<{ format: DocumentFormat }>(`/document-formats/${id}`, input);
  return data.format;
}

export async function deleteDocumentFormat(id: string) {
  await api.delete(`/document-formats/${id}`);
}
