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
  const [requiresProductTracking, setRequiresProductTracking] = useState(prestacion?.requiresProductTracking ?? false);
  const [appliesToWholeFace, setAppliesToWholeFace] = useState(prestacion?.appliesToWholeFace ?? false);
  const [zonesApplyTogether, setZonesApplyTogether] = useState(prestacion?.zonesApplyTogether ?? false);
  const [usePerZonePrice, setUsePerZonePrice] = useState(prestacion?.zonePrices != null);
  const [zonePriceInputs, setZonePriceInputs] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(prestacion?.zonePrices ?? {}).map(([zone, price]) => [zone, String(price)]))
  );
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
    // Al recién marcar una zona, parte con el precio base como sugerencia —
    // el usuario lo ajusta si esta zona cuesta distinto.
    setZonePriceInputs((prev) => (prev[zone] !== undefined ? prev : { ...prev, [zone]: basePrice }));
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
    const usingZonePrices = !unrestricted && selectedZones.size > 1 && usePerZonePrice;
    if (usingZonePrices) {
      const invalidZone = Array.from(selectedZones).find((zone) => {
        const value = Number(zonePriceInputs[zone]);
        return !Number.isFinite(value) || value < 0;
      });
      if (invalidZone) {
        setError(`Ingresa un precio válido para "${FACIAL_ZONE_LABELS[invalidZone as keyof typeof FACIAL_ZONE_LABELS] ?? invalidZone}"`);
        return;
      }
    }
    setIsSaving(true);
    try {
      const allowedZones = isEstetica ? (unrestricted ? [] : Array.from(selectedZones)) : [];
      const zonePrices = isEstetica && usingZonePrices
        ? Object.fromEntries(allowedZones.map((zone) => [zone, Math.round(Number(zonePriceInputs[zone]))]))
        : null;
      const saved = prestacion
        ? await updatePrestacion(prestacion.id, {
            name,
            code: code || null,
            basePrice: price,
            category,
            odontogramMode,
            allowedZones,
            requiresProductTracking,
            appliesToWholeFace,
            zonesApplyTogether,
            zonePrices,
          })
        : await createPrestacion({
            name,
            code: code || undefined,
            basePrice: price,
            category,
            odontogramMode,
            allowedZones,
            requiresProductTracking,
            appliesToWholeFace,
            zonesApplyTogether,
            zonePrices,
          });
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
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={requiresProductTracking}
                onChange={(e) => setRequiresProductTracking(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Requiere registrar producto y lote (ej. Ácido Hialurónico, Toxina Botulínica)
            </label>
            <p className="mt-0.5 text-xs text-slate-400">
              Si se marca, el sistema recordará al profesional completar el producto/lote y subir las fotos de sticker
              al agregar esta prestación a un presupuesto.
            </p>
          </div>
        )}

        {isEstetica && (
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={appliesToWholeFace}
                onChange={(e) => setAppliesToWholeFace(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Aplica siempre a todo el rostro (ej. limpieza facial)
            </label>
            <p className="mt-0.5 text-xs text-slate-400">
              Si se marca, al agregar esta prestación a un presupuesto no hará falta marcar ninguna zona en el mapa
              facial — se aplica directo. No tiene sentido combinarlo con zonas restringidas, así que se ignoran.
            </p>
          </div>
        )}

        {isEstetica && !appliesToWholeFace && (
          <div>
            <label className="text-sm font-medium text-slate-700">Zonas donde puede aplicarse</label>
            <p className="mt-0.5 text-xs text-slate-400">
              Elige "Sin restricción" si un mismo implemento (ej. una jeringa) puede aplicarse en cualquier zona según
              el caso. Elige "Zonas específicas" si este tratamiento va sí o sí en una o más zonas puntuales (ej.
              Rinoplastía → solo Nariz) — esas zonas se preseleccionan solas al usarlo en un presupuesto.
            </p>

            <div className="mt-2 flex w-fit gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setUnrestricted(true)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  unrestricted ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sin restricción
              </button>
              <button
                type="button"
                onClick={() => setUnrestricted(false)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  !unrestricted ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Zonas específicas
              </button>
            </div>

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
                Selecciona al menos una zona, o vuelve a "Sin restricción" arriba.
              </p>
            )}

            {!unrestricted && selectedZones.size > 1 && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Al usar esta prestación en un presupuesto...</p>
                <div className="mt-1.5 flex w-fit gap-1 rounded-lg bg-slate-200/70 p-1 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setZonesApplyTogether(false)}
                    className={`rounded-md px-3 py-1.5 text-left transition-colors ${
                      !zonesApplyTogether ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    El profesional elige cuáles aplican
                  </button>
                  <button
                    type="button"
                    onClick={() => setZonesApplyTogether(true)}
                    className={`rounded-md px-3 py-1.5 text-left transition-colors ${
                      zonesApplyTogether ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Se aplican todas juntas, sin elegir
                  </button>
                </div>
              </div>
            )}

            {!unrestricted && selectedZones.size > 1 && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Precio</p>
                <div className="mt-1.5 flex w-fit gap-1 rounded-lg bg-slate-200/70 p-1 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setUsePerZonePrice(false)}
                    className={`rounded-md px-3 py-1.5 transition-colors ${
                      !usePerZonePrice ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Mismo precio para todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsePerZonePrice(true)}
                    className={`rounded-md px-3 py-1.5 transition-colors ${
                      usePerZonePrice ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Precio distinto por zona
                  </button>
                </div>

                {usePerZonePrice && (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Array.from(selectedZones).map((zone) => (
                      <div key={zone}>
                        <label className="text-xs text-slate-500">{FACIAL_ZONE_LABELS[zone as keyof typeof FACIAL_ZONE_LABELS] ?? zone}</label>
                        <input
                          type="number"
                          min={0}
                          value={zonePriceInputs[zone] ?? ''}
                          onChange={(e) => setZonePriceInputs((prev) => ({ ...prev, [zone]: e.target.value }))}
                          placeholder={basePrice || '0'}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
