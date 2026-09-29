import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  type ClinicalDocument,
  type DocumentCategory,
} from '../../api/documents';
import { createPatientManualReceta } from '../../api/patients';
import { updateMySignature } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { SignaturePad } from '../../components/SignaturePad';
import {
  CameraIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  MailIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
  UploadIcon,
} from '../../components/icons';

const CATEGORIES: { key: DocumentCategory; label: string; icon: typeof FileIcon }[] = [
  { key: 'receta', label: 'Recetas Médicas', icon: ReceiptIcon },
  { key: 'derivacion', label: 'Derivaciones', icon: FolderIcon },
  { key: 'imagen', label: 'Imágenes', icon: CameraIcon },
  { key: 'archivo', label: 'Archivos', icon: FileIcon },
  { key: 'alta', label: 'Documentos de Altas', icon: FileIcon },
  { key: 'solicitud_laboratorio', label: 'Solicitud Laboratorio', icon: MailIcon },
  { key: 'documento_pabellon', label: 'Documento Pabellón', icon: FileIcon },
  { key: 'solicitud_pabellon', label: 'Solicitud Pabellón', icon: MailIcon },
];

function formatBytes(resourceType: string) {
  return resourceType === 'image' ? 'Imagen' : resourceType === 'video' ? 'Video' : 'Archivo';
}

export function DocumentosClinicosTab({ patientId }: { patientId: string }) {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('receta');
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showManualReceta, setShowManualReceta] = useState(false);
  const [medicamentos, setMedicamentos] = useState([{ medicamento: '', indicaciones: '' }]);
  const [observaciones, setObservaciones] = useState('');
  const [isCreatingReceta, setIsCreatingReceta] = useState(false);
  const [recetaError, setRecetaError] = useState<string | null>(null);

  const [signatureDraft, setSignatureDraft] = useState<string | null>(null);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [redrawSignature, setRedrawSignature] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchDocuments(patientId, activeCategory)
      .then(setDocuments)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los documentos')))
      .finally(() => setIsLoading(false));
  }, [patientId, activeCategory]);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Selecciona un archivo para subir');
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const document = await uploadDocument({ patientId, category: activeCategory, description, file });
      setDocuments((prev) => [document, ...prev]);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo subir el archivo'));
    } finally {
      setIsUploading(false);
    }
  }

  function updateMedicamentoRow(index: number, field: 'medicamento' | 'indicaciones', value: string) {
    setMedicamentos((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addMedicamentoRow() {
    setMedicamentos((prev) => [...prev, { medicamento: '', indicaciones: '' }]);
  }

  function removeMedicamentoRow(index: number) {
    setMedicamentos((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleSaveSignature() {
    if (!signatureDraft) return;
    setSignatureError(null);
    setIsSavingSignature(true);
    try {
      const updated = await updateMySignature(signatureDraft);
      updateUser({ signatureUrl: updated.signatureUrl });
      setSignatureDraft(null);
      setRedrawSignature(false);
    } catch (err) {
      setSignatureError(getErrorMessage(err, 'No se pudo guardar la firma'));
    } finally {
      setIsSavingSignature(false);
    }
  }

  async function handleCreateManualReceta() {
    if (!user?.signatureUrl) {
      setRecetaError('Necesitas guardar tu firma antes de generar la receta');
      return;
    }
    const items = medicamentos
      .map((row) => ({ medicamento: row.medicamento.trim(), indicaciones: row.indicaciones.trim() }))
      .filter((row) => row.medicamento);
    if (items.length === 0) {
      setRecetaError('Agrega al menos un medicamento');
      return;
    }
    setRecetaError(null);
    setIsCreatingReceta(true);
    try {
      const document = await createPatientManualReceta(patientId, { medicamentos: items, observaciones });
      setDocuments((prev) => [document, ...prev]);
      setMedicamentos([{ medicamento: '', indicaciones: '' }]);
      setObservaciones('');
      setShowManualReceta(false);
    } catch (err) {
      setRecetaError(getErrorMessage(err, 'No se pudo generar la receta'));
    } finally {
      setIsCreatingReceta(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('¿Eliminar este documento?');
    if (!confirmed) return;
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el documento'));
    }
  }

  const canDelete = (uploadedById: string) => isAdmin || uploadedById === user?.id;
  const activeMeta = CATEGORIES.find((c) => c.key === activeCategory)!;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <activeMeta.icon className="h-5 w-5 text-brand-500" />
          {activeMeta.label}
        </h2>

        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-end dark:border-slate-700 dark:bg-slate-800">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Archivo</label>
            <input
              ref={fileInputRef}
              type="file"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Descripción (opcional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Receta amoxicilina 500mg"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <UploadIcon className="h-4 w-4" />
            {isUploading ? 'Subiendo...' : 'Subir'}
          </button>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

        {activeCategory === 'receta' && (
          <div className="mt-4">
            {!showManualReceta ? (
              <button
                type="button"
                onClick={() => setShowManualReceta(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                <PlusIcon className="h-4 w-4" />
                Crear receta manual
              </button>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Receta manual</h3>
                  <button
                    type="button"
                    onClick={() => setShowManualReceta(false)}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {medicamentos.map((row, index) => (
                    <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <input
                        value={row.medicamento}
                        onChange={(e) => updateMedicamentoRow(index, 'medicamento', e.target.value)}
                        placeholder="Ej: Paracetamol 500mg"
                        className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 sm:w-auto"
                      />
                      <input
                        value={row.indicaciones}
                        onChange={(e) => updateMedicamentoRow(index, 'indicaciones', e.target.value)}
                        placeholder="Indicaciones: 1 tableta cada 8 horas por 5 días"
                        className="w-full flex-[1.4] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 sm:w-auto"
                      />
                      <button
                        type="button"
                        onClick={() => removeMedicamentoRow(index)}
                        disabled={medicamentos.length === 1}
                        aria-label="Quitar medicamento"
                        className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addMedicamentoRow}
                    className="flex w-fit items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Agregar medicamento
                  </button>

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Observaciones (opcional)</label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={2}
                      placeholder="Ej: Control en 7 días"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Tu firma</p>
                    {user?.signatureUrl && !redrawSignature ? (
                      <div className="mt-2 flex items-center gap-3">
                        <img
                          src={user.signatureUrl}
                          alt="Firma guardada"
                          className="h-12 rounded border border-slate-200 bg-white px-2 dark:border-slate-700"
                        />
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Firmarás con tu firma guardada</p>
                          <button
                            type="button"
                            onClick={() => setRedrawSignature(true)}
                            className="w-fit text-left text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                          >
                            Cambiar firma
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                          Necesitas guardar tu firma para poder generar la receta.
                        </p>
                        <SignaturePad onChange={setSignatureDraft} height={110} />
                        {signatureError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{signatureError}</p>}
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleSaveSignature}
                            disabled={!signatureDraft || isSavingSignature}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                          >
                            {isSavingSignature ? 'Guardando...' : 'Guardar firma'}
                          </button>
                          {user?.signatureUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setRedrawSignature(false);
                                setSignatureDraft(null);
                              }}
                              className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {recetaError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{recetaError}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleCreateManualReceta}
                    disabled={isCreatingReceta || !user?.signatureUrl}
                    className="flex w-fit items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <ReceiptIcon className="h-4 w-4" />
                    {isCreatingReceta ? 'Generando PDF...' : 'Generar receta en PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {!isLoading && documents.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              Aún no se han subido archivos en {activeMeta.label}.
            </p>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{doc.fileName}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {formatBytes(doc.resourceType)} · {doc.uploadedBy.name} ·{' '}
                  {new Date(doc.createdAt).toLocaleDateString('es-CL')}
                  {doc.description && ` · ${doc.description}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Descargar"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:text-slate-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                >
                  <DownloadIcon className="h-4 w-4" />
                </a>
                {canDelete(doc.uploadedBy.id) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    aria-label="Eliminar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
