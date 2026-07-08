import { useEffect, useState } from 'react';
import {
  fetchTreatmentPlans,
  deleteTreatmentPlan,
  addTreatmentItem,
  updateTreatmentItem,
  deleteTreatmentItem,
  updateTreatmentPlan,
  type TreatmentPlan,
  type TreatmentStatus,
} from '../../api/treatmentPlans';
import { getErrorMessage } from '../../api/client';
import { TREATMENT_STATUS_LABELS, TREATMENT_STATUS_CLASSES, formatCLP } from '../../utils/treatmentStatus';
import {
  CalendarIcon,
  ChevronDownIcon,
  ClipboardIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from '../../components/icons';
import { TreatmentPlanFormModal } from './TreatmentPlanFormModal';

const STATUS_OPTIONS: TreatmentStatus[] = ['sin_iniciar', 'en_tratamiento', 'terminado', 'alta'];

function Donut({ percent }: { percent: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
      {percent > 0 && (
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#00aeef"
          strokeWidth="14"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      )}
      <text x="50" y="56" textAnchor="middle" fill="#334155" fontSize="18" fontWeight="700">
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

function PlanCard({
  plan,
  onUpdated,
  onDeleted,
  onError,
}: {
  plan: TreatmentPlan;
  onUpdated: (plan: TreatmentPlan) => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newCost, setNewCost] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const completedCount = plan.items.filter((i) => i.completed).length;
  const percent = plan.items.length ? (completedCount / plan.items.length) * 100 : 0;

  async function handleToggleItem(itemId: string, completed: boolean) {
    try {
      const updated = await updateTreatmentItem(itemId, { completed });
      onUpdated(updated);
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo actualizar el procedimiento'));
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const updated = await deleteTreatmentItem(itemId);
      onUpdated(updated);
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo eliminar el procedimiento'));
    }
  }

  async function handleAddItem() {
    if (!newDescription.trim()) return;
    setIsAdding(true);
    try {
      const updated = await addTreatmentItem(plan.id, {
        description: newDescription.trim(),
        cost: Number(newCost) || 0,
      });
      onUpdated(updated);
      setNewDescription('');
      setNewCost('');
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo agregar el procedimiento'));
    } finally {
      setIsAdding(false);
    }
  }

  async function handleStatusChange(status: TreatmentStatus) {
    try {
      const updated = await updateTreatmentPlan(plan.id, { status });
      onUpdated(updated);
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo actualizar el estado'));
    }
  }

  async function handleDeletePlan() {
    const confirmed = window.confirm(`¿Eliminar el presupuesto N° ${plan.number}?`);
    if (!confirmed) return;
    try {
      await deleteTreatmentPlan(plan.id);
      onDeleted(plan.id);
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo eliminar el presupuesto'));
    }
  }

  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <select
          value={plan.status}
          onChange={(e) => handleStatusChange(e.target.value as TreatmentStatus)}
          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${TREATMENT_STATUS_CLASSES[plan.status]}`}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {TREATMENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <span className="text-sm font-semibold text-slate-700">
          N° {plan.number}
          {plan.name && <span className="font-normal text-slate-400"> · {plan.name}</span>}
        </span>

        <span className="flex items-center gap-1 text-xs text-slate-500">
          <CalendarIcon className="h-3.5 w-3.5" />
          {new Date(plan.createdAt).toLocaleDateString('es-CL')}
        </span>

        <span className="flex items-center gap-1 text-xs text-slate-500">
          <UsersIcon className="h-3.5 w-3.5" />
          {plan.professional?.name ?? 'Sin diagnosticador'}
        </span>

        {plan.sucursal && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            {plan.sucursal.name}
          </span>
        )}
        {plan.convenio && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            {plan.convenio.name}
          </span>
        )}
        {plan.prevision && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            {plan.prevision.name}
          </span>
        )}

        <span className="ml-auto text-sm font-semibold text-slate-800">{formatCLP(plan.amount)}</span>

        <span className="text-xs font-medium text-slate-500">
          {completedCount}/{plan.items.length} · {Math.round(percent)}%
        </span>

        <button
          type="button"
          onClick={handleDeletePlan}
          aria-label="Eliminar presupuesto"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <TrashIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Contraer' : 'Expandir'}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
        >
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4">
          <div className="flex flex-col gap-2">
            {plan.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span
                  className={`flex-1 text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                >
                  {item.description}
                  {item.toothNumber && <span className="ml-1.5 text-xs text-slate-400">(Pieza {item.toothNumber})</span>}
                </span>
                <span className="text-sm text-slate-500">{formatCLP(item.cost)}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  aria-label="Eliminar procedimiento"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Nuevo procedimiento..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
            <input
              type="number"
              min={0}
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
              placeholder="Costo"
              className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={isAdding || !newDescription.trim()}
              className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>

          {plan.notes && <p className="mt-3 text-sm text-slate-500">{plan.notes}</p>}
        </div>
      )}
    </div>
  );
}

export function TreatmentPlanTab({ patientId }: { patientId: string }) {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTreatmentPlans(patientId)
      .then(setPlans)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los presupuestos')))
      .finally(() => setIsLoading(false));
  }, [patientId]);

  function handleUpdated(updated: TreatmentPlan) {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleDeleted(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  const allItems = plans.flatMap((p) => p.items);
  const completedCount = allItems.filter((i) => i.completed).length;
  const percentTreated = allItems.length ? (completedCount / allItems.length) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">No tratado vs. tratado</h3>
          {allItems.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay procedimientos registrados.</p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Donut percent={percentTreated} />
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                  Tratado ({completedCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  Sin tratar ({allItems.length - completedCount})
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Abonado vs. no abonado</h3>
          <p className="text-sm text-slate-400">
            Aún no hay abonos. Cuando registres pagos vas a ver acá el porcentaje abonado.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ClipboardIcon className="h-5 w-5 text-brand-500" />
            Presupuestos
          </h2>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo presupuesto
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!isLoading && plans.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            Este paciente aún no tiene presupuestos registrados.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onError={setError}
            />
          ))}
        </div>
      </div>

      {showForm && (
        <TreatmentPlanFormModal
          patientId={patientId}
          onClose={() => setShowForm(false)}
          onCreated={(plan) => {
            setPlans((prev) => [plan, ...prev]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
