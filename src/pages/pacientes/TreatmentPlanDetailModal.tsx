import { Modal } from '../../components/Modal';
import { formatCLP } from '../../utils/treatmentStatus';
import type { TreatmentPlan } from '../../api/treatmentPlans';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}

export function TreatmentPlanDetailModal({ plan, onClose }: { plan: TreatmentPlan; onClose: () => void }) {
  const isEstetica = plan.diagramType === 'estetica';
  const completedCount = plan.items.filter((i) => i.completed).length;

  return (
    <Modal
      title={`Presupuesto N° ${plan.number}${plan.name ? ` · ${plan.name}` : ''}`}
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Fecha</p>
            <p className="font-medium text-slate-700">{new Date(plan.createdAt).toLocaleDateString('es-CL')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Creado por</p>
            <p className="font-medium text-slate-700">{plan.createdBy?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Profesional a cargo</p>
            <p className="font-medium text-slate-700">{plan.professional?.name ?? 'Sin diagnosticador'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Sucursal</p>
            <p className="font-medium text-slate-700">{plan.sucursal?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Avance</p>
            <p className="font-medium text-slate-700">
              {completedCount}/{plan.items.length} procedimientos
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Procedimiento</th>
                <th className="px-3 py-2 text-left">{isEstetica ? 'Zona' : 'Pieza'}</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-right">Dcto</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Tratado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-slate-700">
                    {item.description}
                    {!item.completed && <span className="ml-1.5 text-xs text-amber-600">(pendiente)</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{item.toothNumber ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{formatCLP(item.listPrice)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    {item.convenioDiscountPercent > 0 ? `-${item.convenioDiscountPercent}%` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatCLP(item.cost)}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {item.treatedBy ? (
                      <>
                        {item.treatedBy.name}
                        {item.treatedAt && (
                          <span className="block text-xs text-slate-400">{formatDateTime(item.treatedAt)}</span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold text-slate-600">
                  Total presupuesto
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold text-brand-600">{formatCLP(plan.amount)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
