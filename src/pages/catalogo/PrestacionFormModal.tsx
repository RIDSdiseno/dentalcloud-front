import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createPrestacion, updatePrestacion, type Prestacion, type PrestacionOdontogramMode } from '../../api/catalogs';
import { FACIAL_ZONES, FACIAL_ZONE_LABELS } from '../../pages/pacientes/facialZoneConfig';
import { modeFromName, ODONTOGRAM_MODE_LABELS, ODONTOGRAM_MODES } from '../../pages/pacientes/odontogramConfig';

type PrestacionFormModalProps = {
  prestacion: Prestacion | null;
  // Tipo de la clínica: determina si hace falta preguntar la categoría o si
  // ya está implícita (clínicas puramente "dental" o "estetica").
  clinicaTipo: string | null | undefined;
  onClose: () => void;
  onSaved: (prestacion: Prestacion) => void;
};

export function PrestacionFormModal({ prestacion, clinicaTipo, onClose, onSaved }: PrestacionFormModalProps) {
  const showCategoryPicker = clinicaTipo === 'ambas';
  const [name, setName] = useState(prestacion?.name ?? '');
  const [code, setCode] = useState(prestacion?.code ?? '');
  const [basePrice, setBasePrice] = useState(String(prestacion?.basePrice ?? ''));
  const [category, setCategory] = useState<'dental' | 'estetica'>(
    prestacion?.category ?? (clinicaTipo === 'estetica' ? 'estetica' : 'dental')
  );
  const [unrestricted, setUnrestricted] = useState((prestacion?.allowedZones.length ?? 0) === 0);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set(prestacion?.allowedZones ?? []));
  const [odontogramMode, setOdontogramMode] = useState<PrestacionOdontogramMode>(
    prestacion?.odontogramMode ?? modeFromName(name)
  );
  // Mientras el usuario no toque el selector a mano, la sugerencia se
  // recalcula sola a medida que escribe el nombre (sólo para prestaciones
  // nuevas — al editar una existente su modo ya guardado manda siempre).
  const [modeTouched, setModeTouched] = useState(Boolean(prestacion));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEstetica = category === 'estetica';

  function handleNameChange(value: string) {
    setName(value);
    if (!modeTouched) setOdontogramMode(modeFromName(value));
  }

  function handleModeChange(value: PrestacionOdontogramMode) {
    setModeTouched(true);
    setOdontogramMode(value);
  }

  function toggleZone(zone: string) {
    setSelectedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    const price = Number(basePrice);
    if (!Number.isFinite(price) || price < 0) {
      setError('Ingresa un precio válido');
      return;
    }
    setIsSaving(true);
    try {
      const allowedZones = isEstetica ? (unrestricted ? [] : Array.from(selectedZones)) : [];
      const saved = prestacion
        ? await updatePrestacion(prestacion.id, { name, code: code || null, basePrice: price, category, odontogramMode, allowedZones })
        : await createPrestacion({ name, code: code || undefined, basePrice: price, category, odontogramMode, allowedZones });
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la prestación'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={prestacion ? 'Editar prestación' : 'Nueva prestación'} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ej: Ácido Hialurónico"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        {showCategoryPicker && (
          <div>
            <label className="text-sm font-medium text-slate-700">Tipo de prestación</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory('dental')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  category === 'dental'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Dental
              </button>
              <button
                type="button"
                onClick={() => setCategory('estetica')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  category === 'estetica'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Estética
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Código</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: AH-01"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Precio <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
        </div>

        {!isEstetica && (
          <div>
            <label className="text-sm font-medium text-slate-700">Modo de selección en el odontograma</label>
            <p className="mt-0.5 text-xs text-slate-400">
              Sugerido automáticamente por el nombre — cámbialo si esta prestación no se elige por pieza (ej. flúor
              se aplica a toda la boca, una resina se elige por cara).
            </p>
            <select
              value={odontogramMode}
              onChange={(e) => handleModeChange(e.target.value as PrestacionOdontogramMode)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              {ODONTOGRAM_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {ODONTOGRAM_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
        )}

        {isEstetica && (
          <div>
            <label className="text-sm font-medium text-slate-700">Zonas donde puede aplicarse</label>
            <p className="mt-0.5 text-xs text-slate-400">
              Un mismo implemento (ej. una jeringa) puede aplicarse en varias zonas en una misma sesión. Restringe
              solo si este tratamiento es específico de una o más zonas puntuales.
            </p>

            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={unrestricted}
                onChange={(e) => setUnrestricted(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Sin restricción (aplica a cualquier zona)
            </label>

            {!unrestricted && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
                {FACIAL_ZONES.map((zone) => (
                  <label key={zone} className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedZones.has(zone)}
                      onChange={() => toggleZone(zone)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    {FACIAL_ZONE_LABELS[zone]}
                  </label>
                ))}
              </div>
            )}
            {!unrestricted && selectedZones.size === 0 && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                Selecciona al menos una zona, o marca "Sin restricción" arriba.
              </p>
            )}
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
