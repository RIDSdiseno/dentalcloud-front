import { useEffect, useRef, useState } from 'react';
import {
  fetchTreatmentPlans,
  deleteTreatmentPlan,
  addTreatmentItem,
  updateTreatmentItem,
  deleteTreatmentItem,
  updateTreatmentPlan,
  uploadTreatmentItemPhoto,
  deleteTreatmentItemPhoto,
  uploadTreatmentPlanPhoto,
  deleteTreatmentPlanPhoto,
  type TreatmentItem,
  type TreatmentPlan,
  type TreatmentStatus,
} from '../../api/treatmentPlans';
import type { Patient } from '../../api/patients';
import { getErrorMessage } from '../../api/client';
import { TREATMENT_STATUS_LABELS, TREATMENT_STATUS_CLASSES, formatCLP } from '../../utils/treatmentStatus';
import {
  CalendarIcon,
  ChevronDownIcon,
  ClipboardIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
  UsersIcon,
} from '../../components/icons';
import { Modal } from '../../components/Modal';
import { TreatmentPlanFormModal } from './TreatmentPlanFormModal';
import { PhotoEditorModal } from './PhotoEditorModal';
import { FacialZonesHighlight } from './FacialMap';
import { FACIAL_ZONES, FACIAL_ZONE_LABELS, parseTreatedZones, type FacialZoneKey } from './facialZoneConfig';
import { useAuth } from '../../context/AuthContext';

// Etiquetas de foto por procedimiento: "Antes"/"Después" para registro clínico,
// "Sticker ficha"/"Sticker paciente" para trazabilidad de producto (ej. las dos
// etiquetas físicas con lote que trae el Ácido Hialurónico — una se pega en la
// ficha, la otra se entrega al paciente).
const PHOTO_LABELS = ['Antes', 'Después', 'Sticker ficha', 'Sticker paciente'] as const;
type PhotoLabel = (typeof PHOTO_LABELS)[number];

function PlantillaFotografica({
  plan,
  onUpdated,
  onError,
}: {
  plan: TreatmentPlan;
  onUpdated: (plan: TreatmentPlan) => void;
  onError: (message: string) => void;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingMoment, setPendingMoment] = useState<'Antes' | 'Después'>('Antes');
  const [pendingZone, setPendingZone] = useState<FacialZoneKey>(FACIAL_ZONES[0]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleConfirmEdit(blob: Blob) {
    setPendingFile(null);
    setIsUploading(true);
    try {
      const label = `${FACIAL_ZONE_LABELS[pendingZone]} — ${pendingMoment}`;
      const updated = await uploadTreatmentPlanPhoto(plan.id, blob, label);
      onUpdated(updated);
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo subir la foto'));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(photoId: string, label: string | null) {
    const confirmed = window.confirm(
      label ? `¿Eliminar la foto "${label}"? Esta acción no se puede deshacer.` : '¿Eliminar esta foto? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;
    try {
      const updated = await deleteTreatmentPlanPhoto(photoId);
      onUpdated(updated);
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo eliminar la foto'));
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Plantilla fotográfica</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pendingZone}
            onChange={(e) => setPendingZone(e.target.value as FacialZoneKey)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:border-brand-500"
          >
            {FACIAL_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {FACIAL_ZONE_LABELS[zone]}
              </option>
            ))}
          </select>
          <div className="flex shrink-0 gap-1 rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
            {(['Antes', 'Después'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setPendingMoment(l)}
                className={`rounded-md px-2 py-0.5 transition-colors ${
                  pendingMoment === l ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {plan.photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-slate-200">
            <a href={photo.url} target="_blank" rel="noreferrer">
              <img src={photo.url} alt={photo.label ?? 'Foto de plantilla'} className="h-full w-full object-cover" />
            </a>
            {photo.label && (
              <span className="absolute bottom-1 left-1 rounded bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {photo.label}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleDelete(photo.id, photo.label)}
              aria-label="Eliminar foto"
              className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePick} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600 disabled:opacity-60"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="text-[11px] font-medium">
            {isUploading ? 'Subiendo...' : `Agregar (${FACIAL_ZONE_LABELS[pendingZone]})`}
          </span>
        </button>
      </div>

      {pendingFile && (
        <PhotoEditorModal file={pendingFile} onClose={() => setPendingFile(null)} onConfirm={handleConfirmEdit} />
      )}
    </div>
  );
}

const STATUS_OPTIONS: TreatmentStatus[] = ['sin_iniciar', 'en_tratamiento', 'terminado', 'alta'];

function ItemDetailsPanel({
  item,
  onUpdated,
  onError,
}: {
  item: TreatmentItem;
  onUpdated: (plan: TreatmentPlan) => void;
  onError: (message: string) => void;
}) {
  const [notes, setNotes] = useState(item.notes ?? '');
  const [productName, setProductName] = useState(item.productName ?? '');
  const [productLot, setProductLot] = useState(item.productLot ?? '');
  const [productExpiresAt, setProductExpiresAt] = useState(item.productExpiresAt?.slice(0, 10) ?? '');
  const [productQuantity, setProductQuantity] = useState(item.productQuantity ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<PhotoLabel>('Antes');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dirty =
    notes !== (item.notes ?? '') ||
    productName !== (item.productName ?? '') ||
    productLot !== (item.productLot ?? '') ||
    productExpiresAt !== (item.productExpiresAt?.slice(0, 10) ?? '') ||
    productQuantity !== (item.productQuantity ?? '');

  // Si la prestación exige trazabilidad (ver Catálogo) pero el ítem nunca
  // registró el producto (ej. se creó antes de que existiera este control, o
  // se agregó como personalizada), es un vacío más grave que fotos faltantes.
  const requiresProduct = item.prestacion?.requiresProductTracking ?? false;
  const missingProduct = requiresProduct && !item.productName?.trim();

  // Si el procedimiento registra un producto (ej. Ácido Hialurónico), se
  // esperan las 2 fotos de sticker del lote (ficha + paciente) — se avisa
  // contra `item.photos` (ya guardado), no contra el estado local sin guardar.
  const missingStickers: string[] = [];
  if (item.productName?.trim()) {
    if (!item.photos.some((p) => p.label === 'Sticker ficha')) missingStickers.push('la ficha');
    if (!item.photos.some((p) => p.label === 'Sticker paciente')) missingStickers.push('el paciente');
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const plan = await updateTreatmentItem(item.id, {
        notes: notes.trim() || null,
        productName: productName.trim() || null,
        productLot: productLot.trim() || null,
        productExpiresAt: productExpiresAt || null,
        productQuantity: productQuantity.trim() || null,
      });
      onUpdated(plan);
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo guardar la información del procedimiento'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUploadPhoto() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const plan = await uploadTreatmentItemPhoto(item.id, file, pendingLabel);
      onUpdated(plan);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo subir la foto'));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeletePhoto(photoId: string, label: string | null) {
    const confirmed = window.confirm(
      label ? `¿Eliminar la foto "${label}"? Esta acción no se puede deshacer.` : '¿Eliminar esta foto? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;
    try {
      const plan = await deleteTreatmentItemPhoto(photoId);
      onUpdated(plan);
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo eliminar la foto'));
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-white/70 p-2.5" onClick={(e) => e.stopPropagation()}>
      {item.completed && item.treatedBy && (
        <p className="text-xs text-slate-400">
          Tratado por {item.treatedBy.name}
          {item.treatedAt && ` · ${new Date(item.treatedAt).toLocaleDateString('es-CL')}`}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Producto (ej. Ácido Hialurónico)"
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
        <input
          value={productLot}
          onChange={(e) => setProductLot(e.target.value)}
          placeholder="N° de lote"
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
        <input
          type="date"
          value={productExpiresAt}
          onChange={(e) => setProductExpiresAt(e.target.value)}
          title="Fecha de vencimiento"
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
        <input
          value={productQuantity}
          onChange={(e) => setProductQuantity(e.target.value)}
          placeholder="Cantidad (ej. 1 jeringa 1ml)"
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
      </div>

      <div className="flex items-start gap-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={1}
          placeholder="Notas clínicas (ej. reacción del paciente)..."
          className="flex-1 resize-none rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        )}
      </div>

      {missingProduct && (
        <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
          Esta prestación requiere registrar el producto y su lote — complétalo arriba.
        </p>
      )}

      {missingStickers.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
          Falta subir el sticker del producto para {missingStickers.join(' y ')}.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-400">Fotos del procedimiento</span>
        <div className="flex flex-wrap shrink-0 gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium">
          {PHOTO_LABELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setPendingLabel(l)}
              className={`rounded-md px-2 py-0.5 transition-colors ${
                pendingLabel === l ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {item.photos.map((photo) => (
          <div key={photo.id} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
            <a href={photo.url} target="_blank" rel="noreferrer">
              <img src={photo.url} alt={photo.label ?? 'Foto del procedimiento'} className="h-full w-full object-cover" />
            </a>
            {photo.label && (
              <span className="absolute bottom-0.5 left-0.5 rounded bg-slate-900/60 px-1 py-0.5 text-[9px] font-medium text-white">
                {photo.label}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleDeletePhoto(photo.id, photo.label)}
              aria-label="Eliminar foto"
              className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600 disabled:opacity-60"
        >
          <UploadIcon className="h-4 w-4" />
          <span className="text-[10px] font-medium">{isUploading ? '...' : 'Foto'}</span>
        </button>
      </div>
    </div>
  );
}

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
  const isEstetica = plan.diagramType === 'estetica';
  const [expanded, setExpanded] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newCost, setNewCost] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // El viaje al servidor toma varios segundos (recalcula el plan completo),
  // así que el check debe reflejarse al instante en cada click sin bloquear
  // el checkbox (bloquearlo se sentía como si la casilla tuviera delay). En
  // vez de eso: se agrupan los clicks rápidos sobre el mismo ítem en una sola
  // solicitud (debounce) y se descarta cualquier respuesta que ya haya sido
  // superada por un click más reciente (token por ítem).
  const pendingToggles = useRef(
    new Map<string, { token: number; timer: ReturnType<typeof setTimeout>; previousCompleted: boolean }>()
  );

  // Cada respuesta del servidor trae una FOTO completa del plan (todos los
  // ítems), tomada en el momento en que ESA solicitud se procesó. Si dos
  // ítems distintos se tocan casi al mismo tiempo, la respuesta de uno puede
  // llegar mientras la del otro sigue en camino, y esa foto puede mostrar al
  // otro ítem todavía con su valor viejo — aplicarla tal cual pisaría (con
  // datos desactualizados) un cambio más reciente que ya se ve en pantalla.
  // `planRef` mantiene accesible el estado MÁS actual del plan (no el de
  // cuando se programó el timeout) para poder fusionar correctamente.
  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    const pending = pendingToggles.current;
    return () => {
      pending.forEach(({ timer }) => clearTimeout(timer));
    };
  }, []);

  // Aplica una foto del plan que vino del servidor, preservando el valor
  // ACTUAL en pantalla de cualquier ítem que todavía tenga su propio toggle
  // en curso (salvo `authoritativeItemId`, el ítem que esta respuesta en
  // particular sí confirma de forma definitiva).
  function applyServerPlan(serverPlan: TreatmentPlan, authoritativeItemId?: string) {
    if (pendingToggles.current.size === 0) {
      onUpdated(serverPlan);
      return;
    }
    const currentItems = planRef.current.items;
    onUpdated({
      ...serverPlan,
      items: serverPlan.items.map((serverItem) => {
        if (serverItem.id === authoritativeItemId) return serverItem;
        if (!pendingToggles.current.has(serverItem.id)) return serverItem;
        return currentItems.find((i) => i.id === serverItem.id) ?? serverItem;
      }),
    });
  }

  const completedCount = plan.items.filter((i) => i.completed).length;
  const percent = plan.items.length ? (completedCount / plan.items.length) * 100 : 0;

  function handleToggleItem(itemId: string, completed: boolean) {
    const existing = pendingToggles.current.get(itemId);
    if (existing) clearTimeout(existing.timer);
    const previousCompleted = existing?.previousCompleted ?? (plan.items.find((i) => i.id === itemId)?.completed ?? false);
    const token = (existing?.token ?? 0) + 1;

    onUpdated({
      ...plan,
      items: plan.items.map((i) => (i.id === itemId ? { ...i, completed } : i)),
    });

    const timer = setTimeout(async () => {
      try {
        const updated = await updateTreatmentItem(itemId, { completed });
        if (pendingToggles.current.get(itemId)?.token === token) {
          pendingToggles.current.delete(itemId);
          applyServerPlan(updated, itemId);
        }
      } catch (err) {
        if (pendingToggles.current.get(itemId)?.token === token) {
          pendingToggles.current.delete(itemId);
          onUpdated({
            ...planRef.current,
            items: planRef.current.items.map((i) => (i.id === itemId ? { ...i, completed: previousCompleted } : i)),
          });
          onError(getErrorMessage(err, 'No se pudo actualizar el procedimiento'));
        }
      }
    }, 400);

    pendingToggles.current.set(itemId, { token, timer, previousCompleted });
  }

  async function handleDeleteItem(itemId: string, description: string) {
    const confirmed = window.confirm(`¿Eliminar el procedimiento "${description}"? Se perderá su registro de producto/lote y fotos asociadas.`);
    if (!confirmed) return;
    try {
      const updated = await deleteTreatmentItem(itemId);
      applyServerPlan(updated);
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
      applyServerPlan(updated);
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
      applyServerPlan(updated);
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

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-1.5 text-[11px] text-slate-400">
        <span>Creado por {plan.createdBy?.name ?? 'Sin registro'}</span>
        {plan.startedAt && (
          <span>
            · Pasó a tratamiento el {new Date(plan.startedAt).toLocaleDateString('es-CL')}
            {plan.startedBy && ` (${plan.startedBy.name})`}
          </span>
        )}
        {plan.completedAt && (
          <span>
            · Completado el {new Date(plan.completedAt).toLocaleDateString('es-CL')}
            {plan.completedBy && ` (${plan.completedBy.name})`}
          </span>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4">
          <div className="flex flex-col gap-2">
            {plan.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5 rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-3">
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
                    {item.toothNumber && (
                      <span className="ml-1.5 text-xs text-slate-400">
                        ({isEstetica ? 'Zona' : 'Pieza'}: {item.toothNumber})
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-slate-500">{formatCLP(item.cost)}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id, item.description)}
                    aria-label="Eliminar procedimiento"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ItemDetailsPanel item={item} onUpdated={applyServerPlan} onError={onError} />
              </div>
            ))}
          </div>

          {isEstetica && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <PlantillaFotografica plan={plan} onUpdated={applyServerPlan} onError={onError} />
            </div>
          )}

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

// Foto "antes" de un procedimiento: primero se busca en las fotos del propio
// item (etiquetadas solo "Antes"/"Después"); si no tiene, se busca en la
// plantilla fotográfica del presupuesto por zona (etiquetada "Zona — Antes").
function findAntesPhotoUrl(item: TreatmentItem, plan: TreatmentPlan): string | undefined {
  const itemAntes = item.photos.find((p) => p.label === 'Antes');
  if (itemAntes) return itemAntes.url;
  if (!item.toothNumber) return undefined;
  const zones = item.toothNumber.split(',').map((z) => z.trim());
  const planAntes = plan.photos.find((p) => p.label?.endsWith('Antes') && zones.some((z) => p.label!.startsWith(z)));
  return planAntes?.url;
}

// Unión de las zonas de todas las prestaciones del presupuesto (una foto
// puede "aplicar a todo el rostro" y no tener zona — esas se ignoran acá).
function treatedZonesOf(plan: TreatmentPlan): FacialZoneKey[] {
  return Array.from(new Set(plan.items.flatMap((i) => parseTreatedZones(i.toothNumber))));
}

// Resumen de solo lectura de un presupuesto para el historial del paciente:
// a diferencia de PlanCard (editable, con todas las zonas disponibles), acá
// solo se listan las zonas efectivamente tratadas junto con el procedimiento
// indicado y su foto de "antes" si existe.
function PlanZonesHistoryCard({ plan }: { plan: TreatmentPlan }) {
  const [showDetail, setShowDetail] = useState(false);
  const itemsWithZones = plan.items.filter((i) => i.toothNumber);
  const treatedZones = treatedZonesOf(plan);

  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">
          Presupuesto N° {plan.number} · {new Date(plan.createdAt).toLocaleDateString('es-CL')}
          {plan.name && <span className="font-normal text-slate-400"> · {plan.name}</span>}
        </p>
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="shrink-0 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
        >
          Ver detalle
        </button>
      </div>

      <FacialZonesHighlight
        gender={plan.facialGender ?? 'mujer'}
        zones={treatedZones}
        annotations={plan.facialAnnotations}
        className="mt-2 max-w-[160px]"
      />

      <div className="mt-2 flex flex-col gap-2">
        {itemsWithZones.map((item) => {
          const antesUrl = findAntesPhotoUrl(item, plan);
          return (
            <div key={item.id} className="flex items-center gap-2">
              {antesUrl ? (
                <a href={antesUrl} target="_blank" rel="noreferrer" className="shrink-0">
                  <img
                    src={antesUrl}
                    alt={`Antes — ${item.toothNumber}`}
                    className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                </a>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[9px] text-slate-300 ring-1 ring-slate-200">
                  Sin foto
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-brand-700">{item.toothNumber}</p>
                <p className="truncate text-[11px] text-slate-500">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {showDetail && <PlanDetailModal plan={plan} onClose={() => setShowDetail(false)} />}
    </div>
  );
}

// Vista de solo lectura con TODO el detalle del presupuesto (a diferencia de
// PlanCard, que es la vista editable en la lista de "Presupuestos"): datos
// administrativos, cada procedimiento con su producto/lote/notas y fotos en
// tamaño legible, y la plantilla fotográfica completa del presupuesto.
function PlanDetailModal({ plan, onClose }: { plan: TreatmentPlan; onClose: () => void }) {
  const zones = treatedZonesOf(plan);
  const hasAnnotations = Boolean(
    plan.facialAnnotations &&
      (plan.facialAnnotations.frontal.length > 0 ||
        plan.facialAnnotations.perfilDerecho.length > 0 ||
        plan.facialAnnotations.perfilIzquierdo.length > 0)
  );

  return (
    <Modal title={`Presupuesto N° ${plan.number}`} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Fecha</p>
            <p className="text-sm text-slate-700">{new Date(plan.createdAt).toLocaleDateString('es-CL')}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estado</p>
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TREATMENT_STATUS_CLASSES[plan.status]}`}>
              {TREATMENT_STATUS_LABELS[plan.status]}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Creado por</p>
            <p className="text-sm text-slate-700">{plan.createdBy?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Profesional</p>
            <p className="text-sm text-slate-700">{plan.professional?.name ?? 'Sin diagnosticador'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Forma de pago</p>
            <p className="text-sm text-slate-700">{plan.paymentMethod ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sucursal</p>
            <p className="text-sm text-slate-700">{plan.sucursal?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Convenio</p>
            <p className="text-sm text-slate-700">{plan.convenio?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Previsión</p>
            <p className="text-sm text-slate-700">{plan.prevision?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
            <p className="text-sm font-semibold text-brand-600">{formatCLP(plan.amount)}</p>
          </div>
        </div>

        {(zones.length > 0 || hasAnnotations) && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Zonas intervenidas</p>
            <FacialZonesHighlight
              gender={plan.facialGender ?? 'mujer'}
              zones={zones}
              annotations={plan.facialAnnotations}
              className="max-w-[220px]"
            />
          </div>
        )}

        {plan.notes && (
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Observaciones generales</p>
            <p className="mt-0.5 text-sm text-slate-600">{plan.notes}</p>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Procedimientos</p>
          <div className="flex flex-col gap-2">
            {plan.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.description}</p>
                    {item.toothNumber && <p className="text-xs text-brand-600">{item.toothNumber}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-700">{formatCLP(item.cost)}</span>
                </div>

                {item.completed && item.treatedBy && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Tratado por {item.treatedBy.name}
                    {item.treatedAt && ` · ${new Date(item.treatedAt).toLocaleDateString('es-CL')}`}
                  </p>
                )}

                {(item.productName || item.productLot || item.productExpiresAt || item.productQuantity) && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {[
                      item.productName,
                      item.productLot && `Lote ${item.productLot}`,
                      item.productQuantity,
                      item.productExpiresAt && `Vence ${new Date(item.productExpiresAt).toLocaleDateString('es-CL')}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}

                {item.notes && <p className="mt-1.5 text-xs text-slate-500 italic">{item.notes}</p>}

                {item.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.photos.map((photo) => (
                      <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="relative">
                        <img
                          src={photo.url}
                          alt={photo.label ?? 'Foto del procedimiento'}
                          className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                        {photo.label && (
                          <span className="absolute bottom-0.5 left-0.5 rounded bg-slate-900/60 px-1 py-0.5 text-[9px] font-medium text-white">
                            {photo.label}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {plan.photos.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Plantilla fotográfica</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {plan.photos.map((photo) => (
                <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="relative">
                  <img
                    src={photo.url}
                    alt={photo.label ?? 'Foto de plantilla'}
                    className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200"
                  />
                  {photo.label && (
                    <span className="absolute bottom-1 left-1 rounded bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {photo.label}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function TreatmentPlanTab({ patient }: { patient: Patient }) {
  const patientId = patient.id;
  const { user } = useAuth();
  // Clínicas "ambas" mezclan presupuestos dental/estética — la sección de
  // zonas tratadas debe seguir disponible para ellas, no solo para clínicas
  // puramente "estetica".
  const isEstetica = user?.clinicaTipo === 'estetica' || user?.clinicaTipo === 'ambas';
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | 'all'>('all');

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
    setSelectedPlanId((current) => (current === id ? 'all' : current));
  }

  const selectedPlan = selectedPlanId === 'all' ? null : plans.find((p) => p.id === selectedPlanId) ?? null;
  const chartItems = selectedPlan ? selectedPlan.items : plans.flatMap((p) => p.items);
  const completedCount = chartItems.filter((i) => i.completed).length;
  const percentTreated = chartItems.length ? (completedCount / chartItems.length) * 100 : 0;

  // Presupuestos con al menos una prestación con zona asignada — solo los
  // armados con mapa facial tienen `toothNumber` en formato de zona; mezclar
  // ítems de presupuestos con odontograma (clínicas "ambas") produciría
  // zonas inválidas.
  const plansWithZones = plans.filter((p) => p.diagramType === 'estetica' && p.items.some((i) => i.toothNumber));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">No tratado vs. tratado</h3>
            {plans.length > 0 && (
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              >
                <option value="all">Todos los presupuestos</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    N° {p.number}
                  </option>
                ))}
              </select>
            )}
          </div>
          {chartItems.length === 0 ? (
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
                  Sin tratar ({chartItems.length - completedCount})
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

        {isEstetica && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Historial de zonas tratadas</h3>
            {plansWithZones.length === 0 ? (
              <p className="text-sm text-slate-400">Aún no hay zonas registradas para este paciente.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {plansWithZones.map((plan) => (
                  <PlanZonesHistoryCard key={plan.id} plan={plan} />
                ))}
              </div>
            )}
          </div>
        )}
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
          patient={patient}
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
