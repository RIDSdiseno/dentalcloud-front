import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import { SLOT_DURATION_OPTIONS, updateAgendaSettings, type SlotDurationMinutes } from '../../api/clinicaSettings';

export function SlotDurationControl() {
  const { user, updateUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.role !== 'admin') return null;

  const slotDurationMinutes = user.slotDurationMinutes ?? 15;

  async function handleChange(value: SlotDurationMinutes) {
    if (value === slotDurationMinutes) return;
    setError(null);
    setIsSaving(true);
    try {
      const updated = await updateAgendaSettings(value);
      updateUser({ slotDurationMinutes: updated });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la duración del bloque'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="slot-duration" className="text-sm font-medium text-slate-500">
        Bloques de
      </label>
      <select
        id="slot-duration"
        value={slotDurationMinutes}
        disabled={isSaving}
        onChange={(e) => handleChange(Number(e.target.value) as SlotDurationMinutes)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {SLOT_DURATION_OPTIONS.map((minutes) => (
          <option key={minutes} value={minutes}>
            {minutes} min
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
