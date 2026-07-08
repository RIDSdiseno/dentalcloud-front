import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createLedgerMovement, type LedgerMovement, type LedgerMovementType } from '../../api/ledger';
import type { PlanLedgerRow } from '../../api/ledger';

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro'];

const TYPE_TITLES: Record<LedgerMovementType, string> = {
  abono: 'Nuevo abono',
  interes: 'Nuevo interés',
  ajuste: 'Nuevo ajuste',
};

type LedgerMovementFormModalProps = {
  patientId: string;
  type: LedgerMovementType;
  plans: PlanLedgerRow[];
  onClose: () => void;
  onCreated: (movement: LedgerMovement) => void;
};

export function LedgerMovementFormModal({ patientId, type, plans, onClose, onCreated }: LedgerMovementFormModalProps) {
  const [treatmentPlanId, setTreatmentPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'debe' | 'haber'>('debe');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [documentNumber, setDocumentNumber] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amountNumber = Number(amount);
    if (!amountNumber || amountNumber <= 0) {
      setError('Ingresa un monto mayor a 0');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const movement = await createLedgerMovement({
        patientId,
        treatmentPlanId: treatmentPlanId || undefined,
        type,
        amount: amountNumber,
        direction: type === 'ajuste' ? direction : undefined,
        description: description || undefined,
        paymentMethod: type === 'abono' ? paymentMethod : undefined,
        documentNumber: type === 'abono' ? documentNumber || undefined : undefined,
        notes: notes || undefined,
      });
      onCreated(movement);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar el movimiento'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={TYPE_TITLES[type]} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="mov-plan" className="text-sm font-medium text-slate-700">
            Presupuesto {type === 'abono' && '(opcional, vacío = abono libre)'}
          </label>
          <select
            id="mov-plan"
            value={treatmentPlanId}
            onChange={(e) => setTreatmentPlanId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          >
            <option value="">Sin presupuesto asociado</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                N° {p.number} {p.name ? `· ${p.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="mov-amount" className="text-sm font-medium text-slate-700">
              Monto
            </label>
            <input
              id="mov-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          {type === 'ajuste' && (
            <div>
              <label htmlFor="mov-direction" className="text-sm font-medium text-slate-700">
                Dirección
              </label>
              <select
                id="mov-direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'debe' | 'haber')}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              >
                <option value="debe">Debe (aumenta saldo)</option>
                <option value="haber">Haber (disminuye saldo)</option>
              </select>
            </div>
          )}
          {type === 'abono' && (
            <div>
              <label htmlFor="mov-payment" className="text-sm font-medium text-slate-700">
                Forma de pago
              </label>
              <select
                id="mov-payment"
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
          )}
        </div>

        {type === 'abono' && (
          <div>
            <label htmlFor="mov-doc" className="text-sm font-medium text-slate-700">
              N° documento
            </label>
            <input
              id="mov-doc"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
        )}

        <div>
          <label htmlFor="mov-description" className="text-sm font-medium text-slate-700">
            Glosa
          </label>
          <input
            id="mov-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve del movimiento"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label htmlFor="mov-notes" className="text-sm font-medium text-slate-700">
            Observación
          </label>
          <textarea
            id="mov-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
