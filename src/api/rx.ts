import { api } from './client';

export type DimagePatient = {
  id: number;
  rut: string;
  name: string;
  email: string | null;
  celphone: string | null;
  address: string | null;
  dateofbirth: string | null;
};

export type ExamType = {
  id: number;
  descripcion: string;
  grupo?: string;
  group?: string;
};

export type ExamGroup = {
  id: number;
  nombre: string;
  tab: string;
};

export type RxOrder = {
  id: number;
  estado_texto: string;
  editable: boolean;
  visitable: boolean;
  odontologo?: string;
  radiologos_asignados?: string;
  ruts_radiologos_pendientes?: string;
  examenes_orden?: string;
  [key: string]: unknown;
};

export type CreateRxOrderInput = {
  patientId: string;
  professionalId?: string;
  sucursalId: string;
  diagnostico?: string;
  observaciones?: string;
  prioridad?: string;
  examenes: Array<{ kindId: number; dientes?: string[]; urlTexto?: string; otroInput?: string }>;
};

export type RxOrderFile = {
  id: number;
  name: string;
  extension: string;
  is_image: boolean;
  file_size: number;
  url: string | null;
  download_url: string | null;
  // Presente solo para estudios 3D (CBCT): URL al primer archivo DICOM de la
  // serie, en el mismo dominio de RIDS RX donde vive el visor Med3Web
  // (RIDS RX sirve una carpeta plana de .dcm + un file_list.txt junto a él).
  ruta_dcm?: string | null;
};

export type RxOrderExam = {
  id: number;
  id_tipo_examen: number;
  tipo_examen: string;
  descripcion: string;
  grupo: string;
  piezas_adultos: string;
  piezas_ninos: string;
  dientes: number[];
  otroinput: string | null;
  radiologo: string | null;
  rut_radiologo: string | null;
  respondida: number;
  respondible: number;
  archivos: RxOrderFile[];
  respuesta: Record<string, unknown> | null;
};

export type RxOrderDetail = {
  id: number;
  paciente: string;
  rut_paciente: string;
  clinica: string;
  odontologo: string | null;
  diagnostico: string | null;
  observaciones: string | null;
  prioridad: string;
  estado_texto: string;
  editable: number;
  visitable: number;
  examenes: RxOrderExam[];
  [key: string]: unknown;
};

export type UpdateRxOrderInput = {
  diagnostico?: string;
  observaciones?: string;
  prioridad?: string;
  professionalId?: string;
  examenes?: Array<{ kindId: number; dientes?: string[]; urlTexto?: string; otroInput?: string }>;
};

export async function fetchExamCatalog() {
  const { data } = await api.get<{ types: ExamType[]; groups: ExamGroup[] }>('/rx/exam-catalog');
  return data;
}

export async function fetchPatientRxStatus(patientId: string) {
  const { data } = await api.get<{ synced: boolean; patient: DimagePatient | null }>('/rx/patient-status', {
    params: { patientId },
  });
  return data;
}

export async function syncPatientToRx(patientId: string) {
  const { data } = await api.post<{ patient: DimagePatient }>('/rx/patient-sync', { patientId });
  return data.patient;
}

export async function fetchRxOrders(patientId: string) {
  const { data } = await api.get<{ data: RxOrder[]; total?: number }>('/rx/orders', { params: { patientId } });
  return data.data ?? [];
}

export async function createRxOrder(input: CreateRxOrderInput) {
  const { data } = await api.post('/rx/orders', input);
  return data;
}

export async function sendRxOrder(orderId: number) {
  const { data } = await api.patch(`/rx/orders/${orderId}/send`);
  return data;
}

export async function fetchRxOrderPdfUrl(orderId: number) {
  const { data } = await api.get<{ url: string }>(`/rx/orders/${orderId}/pdf`);
  return data.url;
}

export async function fetchRxOrderZipUrl(orderId: number) {
  const { data } = await api.get<{ url: string }>(`/rx/orders/${orderId}/zip`);
  return data.url;
}

export async function fetchRxOrderDetail(orderId: number) {
  const { data } = await api.get<RxOrderDetail>(`/rx/orders/${orderId}`);
  return data;
}

export async function fetchDicomViewerToken(orderId: number) {
  const { data } = await api.post<{ token: string; entryFilename: string }>(
    `/rx/orders/${orderId}/dicom-viewer-token`
  );
  return data;
}

export async function updateRxOrder(orderId: number, input: UpdateRxOrderInput) {
  const { data } = await api.put(`/rx/orders/${orderId}`, input);
  return data;
}

export async function uploadRxOrderFiles(orderId: number, examinationId: number, files: File[]) {
  const formData = new FormData();
  for (const file of files) formData.append('files', file);
  const { data } = await api.post(`/rx/orders/${orderId}/files/${examinationId}`, formData);
  return data;
}

export async function deleteRxOrderFile(fileId: number) {
  await api.delete(`/rx/order-files/${fileId}`);
}
