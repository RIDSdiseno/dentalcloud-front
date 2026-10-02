import { api } from './client';
import type { AllergyKey } from '../data/allergies';
import type { ClinicalDocument } from './documents';

export type PrivacyConsentStatus = 'pendiente' | 'firmado' | 'rechazado' | 'expirado';

export type Patient = {
  id: string;
  // Tipo del documento guardado en `rut`: RUT | DNI | NIE | PASAPORTE.
  documentType: string;
  rut: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  gender: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  occupation: string | null;
  heightCm: number | null;
  weightKg: number | null;
  allergies: AllergyKey[];
  allergyNotes: string | null;
  medicalConditions: string | null;
  currentMedications: string | null;
  chronicDiseases: string | null;
  dentalHistory: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  healthInsurance: string | null;
  healthInsuranceDetail: string | null;
  bloodType: string | null;
  tags: string[];
  photoUrl: string | null;
  motivoConsulta: string | null;
  motivoConsultaAudioUrl: string | null;
  // Corroboración del médico (Etapa 01): null hasta que un profesional
  // presiona "Confirmar datos del paciente" — se vuelve a poner en null si
  // después cambia algo de identidad/contacto (ver patientsController.ts).
  datosCorroboradosAt: string | null;
  // Anamnesis por checkbox (Etapa 03) — shape en ./anamnesisData.ts.
  anamnesisData: unknown;
  anamnesisSummary: string | null;
  expectativasPaciente: string | null;
  optimoTratamiento: string | null;
  examSkinType: string | null;
  examSkinQuality: string | null;
  examFitzpatrick: string | null;
  examWrinkles: string | null;
  examFlaccidity: string | null;
  examVolume: string | null;
  examAsymmetries: boolean | null;
  examAsymmetryNotes: string | null;
  examDiagnosis: string | null;
  examPhotoFrontalUrl: string | null;
  examPhotoPerfilDerechoUrl: string | null;
  examPhoto45DerechaUrl: string | null;
  examPhoto45IzquierdaUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // Snapshot del consentimiento de protección de datos, derivado de la nueva
  // tabla `consents` (tipo 'proteccion_datos') para no romper vistas que solo
  // necesitan ese estado puntual (lista de pacientes, stats de super-admin).
  // El detalle completo con todos los tipos de consentimiento vive en
  // ConsentimientosTab, vía api/dataConsents.ts.
  privacyConsentStatus: PrivacyConsentStatus;
  privacyConsentMethod: 'email' | 'presencial' | null;
  privacyConsentSentAt: string | null;
  privacyConsentExpiresAt: string | null;
  privacyConsentAt: string | null;
  privacyConsentSignerName: string | null;
  privacyConsentSignerRut: string | null;
};

export type PatientInput = {
  documentType?: string;
  rut: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  address?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  occupation?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  allergies?: AllergyKey[];
  allergyNotes?: string;
  medicalConditions?: string;
  currentMedications?: string;
  chronicDiseases?: string;
  dentalHistory?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  healthInsurance?: string;
  healthInsuranceDetail?: string;
  bloodType?: string;
  tags?: string[];
  motivoConsulta?: string;
  anamnesisData?: unknown;
  expectativasPaciente?: string;
  optimoTratamiento?: string;
  examSkinType?: string;
  examSkinQuality?: string;
  examFitzpatrick?: string;
  examWrinkles?: string;
  examFlaccidity?: string;
  examVolume?: string;
  examAsymmetries?: boolean | null;
  examAsymmetryNotes?: string;
  examDiagnosis?: string;
};

export type ExamPhotoSlot = 'frontal' | 'perfilDerecho' | '45derecha' | '45izquierda' | 'espalda' | 'perfilIzquierdo';
// 'facial' (rostro, de siempre) | 'corporal' (14/09, pedido explícito: switch
// para alternar el registro fotográfico entre rostro y cuerpo) |
// 'facialAvanzado' (30/09, demo: mismos 4 ángulos del rostro, pero tomados con
// el escaneo guiado que detecta la orientación de la cabeza en vivo — historia
// propia, separada del registro facial normal).
export type ExamPhotoArea = 'facial' | 'corporal' | 'facialAvanzado';

// Los cuatro registros entre los que elige el profesional al enlazar avances
// a una evolución (tarea 18). Los tres primeros son áreas de ExamPhoto; el
// cuarto apunta a ExamVideo, que no tiene área propia.
export type ExamRoundSource = ExamPhotoArea | 'video';

// Referencia a un avance del Examen Estético. No es una copia de las fotos:
// identifica el conjunto (registro + antes/avance + número).
export type EvolutionExamRoundRef = {
  source: ExamRoundSource;
  moment: 'antes' | 'avance';
  round: number;
};

export async function fetchPatients(search?: string) {
  const { data } = await api.get<{ patients: Patient[] }>('/patients', {
    params: search ? { search } : undefined,
  });
  return data.patients;
}

export async function fetchPatient(id: string) {
  const { data } = await api.get<{ patient: Patient }>(`/patients/${id}`);
  return data.patient;
}

export async function createPatient(input: PatientInput) {
  const { data } = await api.post<{ patient: Patient }>('/patients', input);
  return data.patient;
}

export async function updatePatient(id: string, input: Partial<PatientInput>) {
  const { data } = await api.patch<{ patient: Patient }>(`/patients/${id}`, input);
  return data.patient;
}

export async function uploadPatientPhoto(id: string, photo: File) {
  const formData = new FormData();
  formData.append('photo', photo);
  const { data } = await api.patch<{ patient: Patient }>(`/patients/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.patient;
}

export async function uploadMotivoConsultaAudio(id: string, audio: Blob) {
  const formData = new FormData();
  formData.append('audio', audio, 'motivo-consulta.webm');
  const { data } = await api.patch<{ patient: Patient }>(`/patients/${id}/motivo-consulta-audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.patient;
}

export async function corroboratePatientData(id: string) {
  const { data } = await api.post<{ patient: Patient }>(`/patients/${id}/corroborate-data`);
  return data.patient;
}

// Etapa 03: genera (o regenera) el párrafo de "Conclusiones de Anamnesis"
// con IA a partir de los 8 bloques + medicación/alergias/motivo de consulta
// ya guardados.
export async function generatePatientAnamnesisSummary(id: string) {
  const { data } = await api.post<{ patient: Patient }>(`/patients/${id}/anamnesis-summary`);
  return data.patient;
}

// Etapa 04 (bifurcación): genera la receta de exámenes en PDF y la deja
// guardada como documento clínico (categoría solicitud_laboratorio).
export async function createPatientExamRequest(id: string, input: { exams: string; notes?: string }) {
  const { data } = await api.post<{ document: { id: string; fileUrl: string } }>(`/patients/${id}/exam-request`, input);
  return data.document;
}

// Feedback de un usuario real (29/09): la pestaña "Recetas Médicas" solo
// permitía subir un archivo ya existente. Este endpoint arma una receta a
// partir de una lista de medicamentos y la deja guardada como documento
// clínico (categoría "receta"), igual que las que se suben a mano.
export async function createPatientManualReceta(
  id: string,
  input: { medicamentos: { medicamento: string; indicaciones: string }[]; observaciones?: string }
) {
  const { data } = await api.post<{ document: ClinicalDocument }>(`/patients/${id}/receta-manual`, input);
  return data.document;
}

export type ExamPhotoMoment = 'antes' | 'avance';

// Historial del registro fotográfico (11/09): cada captura queda como su
// propia fila con fecha — "Antes" (ronda 1 fija) y una o más rondas de
// "Avance" — en vez de un solo valor por ángulo que se sobrescribía.
export type ExamPhoto = {
  id: string;
  patientId: string;
  area: ExamPhotoArea;
  slot: ExamPhotoSlot;
  moment: ExamPhotoMoment;
  round: number;
  url: string;
  createdAt: string;
};

export async function fetchExamPhotos(patientId: string) {
  const { data } = await api.get<{ examPhotos: ExamPhoto[] }>(`/patients/${patientId}/exam-photos`);
  return data.examPhotos;
}

export async function uploadExamPhoto(
  id: string,
  slot: ExamPhotoSlot,
  photo: File,
  moment: ExamPhotoMoment,
  round: number,
  area: ExamPhotoArea = 'facial'
) {
  const formData = new FormData();
  formData.append('photo', photo);
  formData.append('moment', moment);
  formData.append('round', String(round));
  formData.append('area', area);
  const { data } = await api.patch<{ examPhotos: ExamPhoto[] }>(`/patients/${id}/exam-photo/${slot}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.examPhotos;
}

// Etapa 07 (marcación sobre la foto, 25/09): dibujo del médico aplanado
// sobre una copia de una ExamPhoto — nunca reemplaza la foto original, queda
// como su propia imagen en una lista aparte ("Imágenes marcadas").
export type ExamPhotoMarkup = {
  id: string;
  examPhotoId: string;
  patientId: string;
  url: string;
  createdAt: string;
};

export async function fetchExamPhotoMarkups(patientId: string) {
  const { data } = await api.get<{ examPhotoMarkups: ExamPhotoMarkup[] }>(`/patients/${patientId}/exam-photo-markups`);
  return data.examPhotoMarkups;
}

export async function uploadExamPhotoMarkup(patientId: string, examPhotoId: string, image: Blob) {
  const formData = new FormData();
  formData.append('photo', image, 'marcacion.png');
  const { data } = await api.post<{ examPhotoMarkups: ExamPhotoMarkup[] }>(
    `/patients/${patientId}/exam-photo/${examPhotoId}/markup`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.examPhotoMarkups;
}

export async function deleteExamPhotoMarkup(patientId: string, markupId: string) {
  const { data } = await api.delete<{ examPhotoMarkups: ExamPhotoMarkup[] }>(
    `/patients/${patientId}/exam-photo-markups/${markupId}`
  );
  return data.examPhotoMarkups;
}

// Los dos borrados devuelven fotos Y marcaciones porque borrar una foto arrastra
// las marcaciones hechas sobre ella: con solo las fotos, la pantalla seguiría
// mostrando marcaciones huérfanas hasta recargar.
export async function deleteExamPhoto(patientId: string, examPhotoId: string) {
  const { data } = await api.delete<{ examPhotos: ExamPhoto[]; examPhotoMarkups: ExamPhotoMarkup[] }>(
    `/patients/${patientId}/exam-photos/${examPhotoId}`
  );
  return data;
}

export async function deleteExamPhotoRound(patientId: string, area: ExamPhotoArea, round: number) {
  const { data } = await api.delete<{ examPhotos: ExamPhoto[]; examPhotoMarkups: ExamPhotoMarkup[] }>(
    `/patients/${patientId}/exam-photos/round`,
    { params: { area, moment: 'avance', round } }
  );
  return data;
}

// Registro de video (14/09): mismo esquema de rondas que ExamPhoto (antes /
// avance N), pero un solo video por ronda — no hay "slot" de ángulo.
export type ExamVideo = {
  id: string;
  patientId: string;
  moment: ExamPhotoMoment;
  round: number;
  url: string;
  createdAt: string;
};

export async function fetchExamVideos(patientId: string) {
  const { data } = await api.get<{ examVideos: ExamVideo[] }>(`/patients/${patientId}/exam-videos`);
  return data.examVideos;
}

export async function uploadExamVideo(id: string, video: File, moment: ExamPhotoMoment, round: number) {
  const formData = new FormData();
  formData.append('video', video);
  formData.append('moment', moment);
  formData.append('round', String(round));
  const { data } = await api.patch<{ examVideos: ExamVideo[] }>(`/patients/${id}/exam-video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.examVideos;
}
