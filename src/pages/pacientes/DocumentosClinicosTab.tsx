import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  type ClinicalDocument,
  type DocumentCategory,
} from '../../api/documents';
import { useAuth } from '../../context/AuthContext';
import {
  CameraIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  MailIcon,
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('receta');
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <activeMeta.icon className="h-5 w-5 text-brand-500" />
          {activeMeta.label}
        </h2>

        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">Archivo</label>
            <input
              ref={fileInputRef}
              type="file"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">Descripción (opcional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Receta amoxicilina 500mg"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
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

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex flex-col gap-2">
          {!isLoading && documents.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Aún no se han subido archivos en {activeMeta.label}.
            </p>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">{doc.fileName}</p>
                <p className="text-xs text-slate-400">
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                >
                  <DownloadIcon className="h-4 w-4" />
                </a>
                {canDelete(doc.uploadedBy.id) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    aria-label="Eliminar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
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
