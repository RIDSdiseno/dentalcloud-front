import { api } from './client';

export type DocumentCategory =
  | 'receta'
  | 'derivacion'
  | 'imagen'
  | 'archivo'
  | 'alta'
  | 'solicitud_laboratorio'
  | 'documento_pabellon'
  | 'solicitud_pabellon';

export type ClinicalDocument = {
  id: string;
  patientId: string;
  category: DocumentCategory;
  fileName: string;
  fileUrl: string;
  resourceType: string;
  description: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string };
};

export async function fetchDocuments(patientId: string, category: DocumentCategory) {
  const { data } = await api.get<{ documents: ClinicalDocument[] }>('/documents', {
    params: { patientId, category },
  });
  return data.documents;
}

export async function uploadDocument(input: {
  patientId: string;
  category: DocumentCategory;
  description?: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append('patientId', input.patientId);
  formData.append('category', input.category);
  if (input.description) formData.append('description', input.description);
  formData.append('file', input.file);

  const { data } = await api.post<{ document: ClinicalDocument }>('/documents', formData);
  return data.document;
}

export async function deleteDocument(id: string) {
  await api.delete(`/documents/${id}`);
}
