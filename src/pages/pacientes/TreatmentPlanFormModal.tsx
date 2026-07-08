import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createTreatmentPlan, type TreatmentPlan, type TreatmentItemInput } from '../../api/treatmentPlans';
import { fetchUsers, type StaffUser } from '../../api/users';
import { fetchSucursales, fetchPrevisiones, fetchConvenios, fetchPrestaciones } from '../../api/catalogs';
import type { Sucursal, Prevision, Convenio, Prestacion } from '../../api/catalogs';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { formatCLP } from '../../utils/treatmentStatus';
import { CheckIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/icons';
import { Odontogram } from './Odontogram';

type ItemRow = {
  key: string;
  prestacionId?: string;
  description: string;
  toothNumber: string | null;
  listPrice: number;
  convenioDiscountPercent: number;
  cost: number;
};

type TreatmentPlanFormModalProps = {
  patientId: string;
  onClose: () => void;
  onCreated: (plan: TreatmentPlan) => void;
};

const STEPS = [
  { key: 1, label: 'Datos administrativos' },
  { key: 2, label: 'Prestaciones' },
  { key: 3, label: 'Totales y forma de pago' },
] as const;

const PAYMENT_METHODS = ['Contado', 'Cuotas'];

function convenioPrice(listPrice: number, discountPercent: number) {
  return Math.round(listPrice * (1 - discountPercent / 100));
}

export function TreatmentPlanFormModal({ patientId, onClose, onCreated }: TreatmentPlanFormModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [professionals, setProfessionals] = useState<StaffUser[]>([]);
  const [professionalId, setProfessionalId] = useState('');
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState('');
  const [previsiones, setPrevisiones] = useState<Prevision[]>([]);
  const [previsionId, setPrevisionId] = useState('');
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [convenioId, setConvenioId] = useState('');

  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [prestacionSearch, setPrestacionSearch] = useState('');
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [lastAddedKeys, setLastAddedKeys] = useState<string[]>([]);
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [customCost, setCustomCost] = useState('');

  const [name, setName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isAdmin) fetchUsers().then(setProfessionals).catch(() => undefined);
    fetchSucursales().then(setSucursales).catch(() => undefined);
    fetchPrevisiones().then(setPrevisiones).catch(() => undefined);
    fetchConvenios().then(setConvenios).catch(() => undefined);
    fetchPrestaciones().then(setPrestaciones).catch(() => undefined);
  }, [isAdmin]);

  const selectedConvenio = convenios.find((c) => c.id === convenioId) ?? null;

  const filteredPrestaciones = useMemo(() => {
    const q = prestacionSearch.trim().toLowerCase();
    if (!q) return [];
    return prestaciones.filter((p) => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)).slice(0, 8);
  }, [prestacionSearch, prestaciones]);

  const total = items.reduce((sum, i) => sum + i.cost, 0);

  function addPrestacionRow(prestacion: Prestacion) {
    const discount = selectedConvenio?.discountPercent ?? 0;
    const price = convenioPrice(prestacion.basePrice, discount);
    const teeth = selectedTeeth.length > 0 ? selectedTeeth : [null];
    const newRows = teeth.map((tooth, i) => ({
      key: `${prestacion.id}-${Date.now()}-${items.length}-${i}`,
      prestacionId: prestacion.id,
      description: prestacion.name,
      toothNumber: tooth,
      listPrice: prestacion.basePrice,
      convenioDiscountPercent: discount,
      cost: price,
    }));
    setItems((prev) => [...prev, ...newRows]);
    setLastAddedKeys(newRows.map((r) => r.key));
    setPrestacionSearch('');
  }

  function addCustomRow() {
    if (!customDescription.trim()) return;
    const cost = Number(customCost) || 0;
    const teeth = selectedTeeth.length > 0 ? selectedTeeth : [null];
    const newRows = teeth.map((tooth, i) => ({
      key: `custom-${Date.now()}-${items.length}-${i}`,
      description: customDescription.trim(),
      toothNumber: tooth,
      listPrice: cost,
      convenioDiscountPercent: 0,
      cost,
    }));
    setItems((prev) => [...prev, ...newRows]);
    setLastAddedKeys(newRows.map((r) => r.key));
    setCustomDescription('');
    setCustomCost('');
    setShowCustomItem(false);
  }

  function updateItemCost(key: string, value: string) {
    const cost = Number(value) || 0;
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, cost } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function goToStep2() {
    if (!sucursalId) {
      setError('Selecciona una sucursal');
      return;
    }
    if (!convenioId) {
      setError('Selecciona un convenio');
      return;
    }
    setError(null);
    setStep(2);
  }

  function goToStep3() {
    if (items.length === 0) {
      setError('Agrega al menos una prestación');
      return;
    }
    setError(null);
    setStep(3);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const itemInputs: TreatmentItemInput[] = items.map((i) => ({
        description: i.description,
        cost: i.cost,
        prestacionId: i.prestacionId,
        toothNumber: i.toothNumber ?? undefined,
        listPrice: i.listPrice,
        convenioDiscountPercent: i.convenioDiscountPercent,
      }));

      const plan = await createTreatmentPlan({
        patientId,
        professionalId: isAdmin && professionalId ? professionalId : undefined,
        sucursalId,
        previsionId: previsionId || undefined,
        convenioId,
        name: name || undefined,
        paymentMethod,
        notes: notes || undefined,
        items: itemInputs,
      });
      onCreated(plan);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el presupuesto'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Nuevo presupuesto" onClose={onClose} maxWidth="max-w-[1400px]">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step === s.key
                      ? 'bg-brand-600 text-white'
                      : step > s.key
                        ? 'bg-brand-100 text-brand-600'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.key ? <CheckIcon className="h-3.5 w-3.5" /> : s.key}
                </span>
                <span className={`text-xs font-medium ${step === s.key ? 'text-slate-800' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && <div className="h-px flex-1 bg-slate-200" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Sucursal <span className="text-red-500">*</span>
                </label>
                <select
                  value={sucursalId}
                  onChange={(e) => setSucursalId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                >
                  <option value="">Selecciona...</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Previsión</label>
                <select
                  value={previsionId}
                  onChange={(e) => setPrevisionId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                >
                  <option value="">Sin especificar</option>
                  {previsiones.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Convenio <span className="text-red-500">*</span>
                </label>
                <select
                  value={convenioId}
                  onChange={(e) => setConvenioId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                >
                  <option value="">Selecciona...</option>
                  {convenios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.discountPercent > 0 ? `(-${c.discountPercent}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Profesional</label>
                  <select
                    value={professionalId}
                    onChange={(e) => setProfessionalId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                  >
                    <option value="">Yo mismo ({user?.name})</option>
                    {professionals
                      .filter((p) => p.id !== user?.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({roleLabel(p.role)})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className="relative">
                <label className="text-sm font-medium text-slate-700">Buscar prestación</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={prestacionSearch}
                      onChange={(e) => setPrestacionSearch(e.target.value)}
                      placeholder="Ej: destartraje, resina, corona..."
                      className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                    />
                  </div>
                  <button
                    type="button"
                    disabled
                    title="Próximamente"
                    className="shrink-0 cursor-not-allowed rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
                  >
                    Avanzada
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Próximamente"
                    className="shrink-0 cursor-not-allowed rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
                  >
                    Plantillas
                  </button>
                </div>
                {filteredPrestaciones.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredPrestaciones.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addPrestacionRow(p)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                      >
                        <span className="text-slate-700">{p.name}</span>
                        <span className="text-slate-500">{formatCLP(p.basePrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Odontogram selected={selectedTeeth} onSelect={setSelectedTeeth} />

              <div>
                {showCustomItem ? (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                    <input
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Descripción del procedimiento"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                    />
                    <input
                      type="number"
                      min={0}
                      value={customCost}
                      onChange={(e) => setCustomCost(e.target.value)}
                      placeholder="Costo"
                      className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                    />
                    <button
                      type="button"
                      onClick={addCustomRow}
                      className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomItem(false)}
                      className="text-sm text-slate-400 hover:text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCustomItem(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Prestación fuera de catálogo
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:col-span-1">
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Convenio actual</p>
                <p className="text-sm font-semibold text-slate-700">
                  {selectedConvenio ? selectedConvenio.name : 'Sin convenio'}
                  {selectedConvenio && selectedConvenio.discountPercent > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-brand-600">-{selectedConvenio.discountPercent}%</span>
                  )}
                </p>
              </div>

              <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Área</th>
                      <th className="px-3 py-2 text-left">Prestación</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-400">
                          Aún no hay prestaciones agregadas.
                        </td>
                      </tr>
                    )}
                    {items.map((item) => (
                      <tr
                        key={item.key}
                        onClick={() => setLastAddedKeys([item.key])}
                        className={`cursor-pointer transition-colors ${
                          lastAddedKeys.includes(item.key) ? 'bg-amber-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-2 text-slate-500">{item.toothNumber ?? 'Sesión'}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {item.description}
                          {item.convenioDiscountPercent > 0 && (
                            <span className="ml-1 text-xs text-brand-600">-{item.convenioDiscountPercent}%</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            value={item.cost}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateItemCost(item.key, e.target.value)}
                            className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(item.key);
                            }}
                            aria-label="Quitar"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {items.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50">
                        <td colSpan={2} className="px-3 py-2 text-sm font-semibold text-slate-600">
                          Total
                        </td>
                        <td colSpan={2} className="px-3 py-2 text-right text-sm font-bold text-brand-600">
                          {formatCLP(total)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Prestación</th>
                    <th className="px-3 py-2 text-left">Área</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-right">Dcto convenio</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.key}>
                      <td className="px-3 py-2 text-slate-700">{item.description}</td>
                      <td className="px-3 py-2 text-slate-500">{item.toothNumber ?? 'Sesión'}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{formatCLP(item.listPrice)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">
                        {item.convenioDiscountPercent > 0 ? `-${item.convenioDiscountPercent}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatCLP(item.cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold text-slate-600">
                      Total presupuesto
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-brand-600">{formatCLP(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="plan-name" className="text-sm font-medium text-slate-700">
                  Nombre del presupuesto
                </label>
                <input
                  id="plan-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Plan rehabilitación oral"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                />
              </div>
              <div>
                <label htmlFor="plan-payment" className="text-sm font-medium text-slate-700">
                  Forma de pago
                </label>
                <select
                  id="plan-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label htmlFor="plan-notes" className="text-sm font-medium text-slate-700">
                  Observaciones generales
                </label>
                <textarea
                  id="plan-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={1}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                />
              </div>
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep((s) => ((s - 1) as 1 | 2 | 3)))}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {step === 1 ? 'Cancelar' : 'Prev'}
          </button>

          {step === 1 && (
            <button
              type="button"
              onClick={goToStep2}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Siguiente
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={goToStep3}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Siguiente
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Creando...' : 'Crear presupuesto'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
