import { useEffect, useState } from 'react';
import {
  createDocumentFormat,
  deleteDocumentFormat,
  fetchDocumentFormats,
  updateDocumentFormat,
  type DocumentFormat,
  type FormatType,
} from '../../api/documentFormats';
import { getErrorMessage } from '../../api/client';
import { EditIcon, PlusIcon, TrashIcon } from '../../components/icons';

const FORMAT_TYPE_LABEL: Record<FormatType, string> = {
  presupuesto: 'Presupuesto',
  examenes: 'Exámenes',
  plan_tratamiento: 'Plan de tratamiento',
  receta: 'Receta',
};

export function FormatosPanel() {
  const [formats, setFormats] = useState<DocumentFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<DocumentFormat | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  function reload() {
    setLoading(true);
    fetchDocumentFormats()
      .then(setFormats)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los formatos')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(type: FormatType) {
    setMenuOpen(false);
    try {
      const format = await createDocumentFormat({ name: `${FORMAT_TYPE_LABEL[type]} nuevo`, type });
      setFormats((prev) => [format, ...prev]);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el formato'));
    }
  }

  async function handleRename(id: string) {
    try {
      const updated = await updateDocumentFormat(id, { name: renameValue });
      setFormats((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo renombrar el formato'));
    } finally {
      setRenamingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocumentFormat(id);
      setFormats((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el formato'));
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Formatos</h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Nuevo Formato
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {(Object.keys(FORMAT_TYPE_LABEL) as FormatType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleCreate(type)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                >
                  {FORMAT_TYPE_LABEL[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : formats.length === 0 ? (
        <p className="text-sm text-slate-400">Aún no hay formatos creados.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2">Nombre</th>
              <th className="py-2">Tipo</th>
              <th className="py-2">Última edición</th>
              <th className="py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {formats.map((format) => (
              <tr key={format.id} className="border-b border-slate-50">
                <td className="py-2.5">
                  {renamingId === format.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(format.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(format.id)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    <span className="font-medium text-slate-700">{format.name}</span>
                  )}
                </td>
                <td className="py-2.5 text-slate-500">{FORMAT_TYPE_LABEL[format.type]}</td>
                <td className="py-2.5 text-slate-500">{new Date(format.updatedAt).toLocaleDateString('es-CL')}</td>
                <td className="py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewFormat(format)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Vista previa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(format.id);
                        setRenameValue(format.name);
                      }}
                      aria-label="Renombrar"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(format.id)}
                      aria-label="Eliminar"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {previewFormat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setPreviewFormat(null)}>
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{previewFormat.name}</h3>
              <button type="button" onClick={() => setPreviewFormat(null)} className="text-xs font-semibold text-slate-500 underline">
                Cerrar
              </button>
            </div>
            <textarea
              defaultValue={previewFormat.body}
              rows={12}
              placeholder="Escribe el contenido de esta plantilla..."
              onBlur={(e) => updateDocumentFormat(previewFormat.id, { body: e.target.value }).then((f) => setFormats((prev) => prev.map((p) => (p.id === f.id ? f : p))))}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
