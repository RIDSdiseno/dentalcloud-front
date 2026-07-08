import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import {
  fetchRxOrderDetail,
  updateRxOrder,
  uploadRxOrderFiles,
  deleteRxOrderFile,
  fetchRxOrderPdfUrl,
  fetchRxOrderZipUrl,
  type RxOrderDetail,
} from '../../api/rx';
import { DownloadIcon, TrashIcon, UploadIcon } from '../../components/icons';

const PRIORITIES = ['Normal', 'Urgente'];

export function RxOrderDetailModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const [order, setOrder] = useState<RxOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [prioridad, setPrioridad] = useState('Normal');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingExamId, setUploadingExamId] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function load() {
    setIsLoading(true);
    fetchRxOrderDetail(orderId)
      .then((data) => {
        setOrder(data);
        setDiagnostico(data.diagnostico ?? '');
        setObservaciones(data.observaciones ?? '');
        setPrioridad(data.prioridad ?? 'Normal');
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar la orden')))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [orderId]);

  const isEditable = Boolean(order?.editable);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await updateRxOrder(orderId, { diagnostico, observaciones, prioridad });
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la orden'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpload(examId: number, kindId: number) {
    const input = fileInputRefs.current[examId];
    const files = input?.files;
    if (!files || files.length === 0) return;
    setUploadingExamId(examId);
    setError(null);
    try {
      await uploadRxOrderFiles(orderId, kindId, Array.from(files));
      if (input) input.value = '';
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron subir los archivos'));
    } finally {
      setUploadingExamId(null);
    }
  }

  async function handleDeleteFile(fileId: number) {
    const confirmed = window.confirm('¿Eliminar este archivo?');
    if (!confirmed) return;
    try {
      await deleteRxOrderFile(fileId);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el archivo'));
    }
  }

  async function handleDownloadPdf() {
    try {
      const url = await fetchRxOrderPdfUrl(orderId);
      window.open(url, '_blank');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo generar el PDF'));
    }
  }

  async function handleDownloadZip() {
    try {
      const url = await fetchRxOrderZipUrl(orderId);
      window.open(url, '_blank');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo generar el ZIP'));
    }
  }

  return (
    <Modal title={`Orden Rx N° ${orderId}`} onClose={onClose} maxWidth="max-w-3xl">
      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-400">Cargando orden...</p>
      ) : !order ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              {order.estado_texto}
            </span>
            <span>{order.paciente}</span>
            <span className="text-slate-300">·</span>
            <span>{order.clinica}</span>
            {order.odontologo && (
              <>
                <span className="text-slate-300">·</span>
                <span>{order.odontologo}</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Diagnóstico</label>
              <input
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                disabled={!isEditable}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Prioridad</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                disabled={!isEditable}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={!isEditable}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-slate-800">Exámenes</h3>
            {order.examenes.map((exam) => (
              <div key={exam.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{exam.descripcion}</p>
                    {(exam.piezas_adultos || exam.piezas_ninos) && (
                      <p className="text-xs text-slate-400">
                        Piezas: {[exam.piezas_adultos, exam.piezas_ninos].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </div>
                  {exam.respondida === 1 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                      Respondido
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {exam.archivos.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                      <span className="truncate text-slate-600">{file.name}</span>
                      <div className="flex items-center gap-2">
                        {file.download_url && (
                          <a
                            href={file.download_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Descargar"
                            className="text-slate-400 hover:text-brand-600"
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </a>
                        )}
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id)}
                            aria-label="Eliminar"
                            className="text-slate-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {exam.archivos.length === 0 && <p className="text-xs text-slate-400">Sin archivos adjuntos.</p>}
                </div>

                {isEditable && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      ref={(el) => {
                        fileInputRefs.current[exam.id] = el;
                      }}
                      type="file"
                      multiple
                      className="flex-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpload(exam.id, exam.id_tipo_examen)}
                      disabled={uploadingExamId === exam.id}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      <UploadIcon className="h-3.5 w-3.5" />
                      {uploadingExamId === exam.id ? 'Subiendo...' : 'Adjuntar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadZip}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                ZIP
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
              {isEditable && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
