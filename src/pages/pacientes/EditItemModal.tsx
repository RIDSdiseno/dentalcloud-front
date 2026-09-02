import { useState } from 'react';
import type { TreatmentItem, TreatmentPlan } from '../../api/treatmentPlans';
import { updateTreatmentItem } from '../../api/treatmentPlans';
import { getErrorMessage } from '../../api/client';
import { Modal } from '../../components/Modal';
import { FacialMap, type FacialGender } from './FacialMap';
import { parseTreatedZones, zoneNumberForBackend } from './facialZoneConfig';
import type { ToothSelection } from './Odontogram';

// Edita descripción y zona/pieza de un procedimiento YA agregado a un
// presupuesto (creado o en edición) — a diferencia de solo poder quitarlo y
// volver a agregarlo, esto actualiza el ítem existente en su lugar. No toca
// producto/lote/notas/fotos a propósito: eso sigue registrándose únicamente
// al Evolucionar (ver ItemDetailsPanel en TreatmentPlanTab.tsx).
export function EditItemModal({
  item,
  isEstetica,
  facialGender,
  onClose,
  onSaved,
}: {
  item: TreatmentItem;
  isEstetica: boolean;
  facialGender: FacialGender;
  onClose: () => void;
  onSaved: (plan: TreatmentPlan) => void;
}) {
  const [description, setDescription] = useState(item.description);
  const [toothNumber, setToothNumber] = useState(item.toothNumber ?? '');
  const [selection, setSelection] = useState<ToothSelection[]>(() =>
    isEstetica ? parseTreatedZones(item.toothNumber).map((zone) => ({ tooth: zone, surface: 'center' as const })) : []
  );
  const [gender, setGender] = useState<FacialGender>(facialGender);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!description.trim()) {
      setError('La descripción no puede quedar vacía');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTreatmentItem(item.id, {
        description: description.trim(),
        toothNumber: isEstetica ? zoneNumberForBackend('tooth', selection) : toothNumber.trim() || null,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el procedimiento'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Editar procedimiento" onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Descripción</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </label>

        {isEstetica ? (
          <FacialMap mode="tooth" selection={selection} onSelectionChange={setSelection} gender={gender} onGenderChange={setGender} />
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Pieza(s)</span>
            <input
              value={toothNumber}
              onChange={(e) => setToothNumber(e.target.value)}
              placeholder="Ej: 11, 12"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </label>
        )}

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
