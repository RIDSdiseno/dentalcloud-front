import { useEffect, useState } from 'react';
import { fetchPaymentGateSettings, updatePaymentGateSettings } from '../../api/paymentGateSettings';
import { getErrorMessage } from '../../api/client';

export function PagosPanel() {
  const [enabled, setEnabled] = useState(false);
  const [minPercent, setMinPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPaymentGateSettings()
      .then((s) => {
        setEnabled(s.paymentGateEnabled);
        setMinPercent(s.paymentGateMinPercent);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar la configuración de pagos')))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const s = await updatePaymentGateSettings({ paymentGateEnabled: enabled, paymentGateMinPercent: minPercent });
      setEnabled(s.paymentGateEnabled);
      setMinPercent(s.paymentGateMinPercent);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la configuración de pagos'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Pagos</h2>
      <p className="mb-5 text-xs text-slate-500">
        Exige un abono mínimo antes de poder marcar procedimientos como completados en un presupuesto.
      </p>

      <label className="mb-5 flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm font-medium text-slate-700">Exigir abono mínimo para iniciar tratamiento</span>
      </label>

      <label className="flex max-w-xs flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Porcentaje mínimo abonado</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={minPercent}
            disabled={!enabled}
            onChange={(e) => setMinPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10 disabled:opacity-50"
          />
          <span className="text-sm text-slate-500">%</span>
        </div>
      </label>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {saved && <p className="text-xs font-medium text-emerald-600">Guardado.</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
