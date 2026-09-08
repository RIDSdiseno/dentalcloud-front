import { Modal } from './Modal';
import type { ImportSummary } from '../utils/importPrestacionesExcel';

type ImportSummaryModalProps = {
  summary: ImportSummary;
  onClose: () => void;
};

export function ImportSummaryModal({ summary, onClose }: ImportSummaryModalProps) {
  return (
    <Modal title="Resultado de la carga" onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{summary.created}</p>
            <p className="text-xs font-medium text-emerald-700">Creadas</p>
          </div>
          <div className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
            <p className="text-xs font-medium text-red-600">Con error</p>
          </div>
        </div>
        {summary.failed > 0 && (
          <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">Fila</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.results
                  .filter((r) => r.status === 'error')
                  .map((r) => (
                    <tr key={r.row}>
                      <td className="px-3 py-2 text-slate-400">{r.row}</td>
                      <td className="px-3 py-2 font-medium text-slate-700">{r.name}</td>
                      <td className="px-3 py-2 text-red-600">{r.message}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
