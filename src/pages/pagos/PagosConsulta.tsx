import { useEffect, useState } from 'react';
import { createConsultationPayment, fetchConsultationPayments, type ConsultationPayment } from '../../api/consultationPayments';
import { getErrorMessage } from '../../api/client';
import { formatRut } from '../../utils/rut';

const PAYMENT_METHODS = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia'];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}

export default function PagosConsulta() {
  const [payments, setPayments] = useState<ConsultationPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rut, setRut] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    fetchConsultationPayments()
      .then(setPayments)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los pagos')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payment = await createConsultationPayment({
        rut,
        firstName,
        lastName,
        email: email || undefined,
        amount: Number(amount),
        paymentMethod,
      });
      setPayments((prev) => [payment, ...prev]);
      setRut('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setAmount('');
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo registrar el pago'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pagos de Consulta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registro de quién pagó su consulta antes de ser atendido. Es solo informativo — el personal decide con esta
          tabla si corresponde atender al paciente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Registrar pago</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">RUT</span>
            <input
              required
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="12.345.678-9"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</span>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Apellido</span>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correo (opcional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monto</span>
            <input
              required
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Método de pago</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? 'Registrando...' : 'Registrar pago'}
          </button>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
        </div>
      </form>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Pagos registrados</h2>
        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay pagos registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Nombre</th>
                <th className="py-2">RUT</th>
                <th className="py-2">Correo</th>
                <th className="py-2">Fecha</th>
                <th className="py-2">Monto</th>
                <th className="py-2 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="py-2.5 font-medium text-slate-700">
                    {p.firstName} {p.lastName}
                  </td>
                  <td className="py-2.5 text-slate-500">{formatRut(p.rut)}</td>
                  <td className="py-2.5 text-slate-500">{p.email || '—'}</td>
                  <td className="py-2.5 text-slate-500">{formatDateTime(p.createdAt)}</td>
                  <td className="py-2.5 text-slate-500">{formatCLP(p.amount)}</td>
                  <td className="py-2.5 text-right">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Pagado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
