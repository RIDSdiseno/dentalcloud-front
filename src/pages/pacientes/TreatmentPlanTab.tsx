import { useEffect, useRef, useState } from 'react';
import {
  fetchTreatmentPlans,
  deleteTreatmentPlan,
  addTreatmentItem,
  addTreatmentPlanEdit,
  updateTreatmentItem,
  deleteTreatmentItem,
  updateTreatmentPlan,
  uploadTreatmentPlanPhoto,
  deleteTreatmentPlanPhoto,
  downloadTreatmentPlanReport,
  type TreatmentItem,
  type TreatmentPlan,
  type TreatmentStatus,
} from '../../api/treatmentPlans';
import type { Patient } from '../../api/patients';
import { getErrorMessage } from '../../api/client';
import { TREATMENT_STATUS_LABELS, TREATMENT_STATUS_CLASSES, formatCLP } from '../../utils/treatmentStatus';
import {
  ActivityIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClipboardIcon,
  DownloadIcon,
  EditIcon,
  FileIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
} from '../../components/icons';
import { Modal } from '../../components/Modal';
import { ReasonModal } from '../../components/ReasonModal';
import { TreatmentPlanFormModal } from './TreatmentPlanFormModal';
import { PhotoEditorModal } from './PhotoEditorModal';
import { FacialZonesHighlight } from './FacialMap';
import { FACIAL_ZONES, FACIAL_ZONE_LABELS, parseTreatedZones, type FacialZoneKey } from './facialZoneConfig';
import { useAuth } from '../../context/AuthContext';
import { Odontogram, type OdontogramMode, type ToothSelection } from './Odontogram';
import { getOdontogramConfig, selectionFromDefaults, splitSelectionByTooth, toothNumberForBackend } from './odontogramConfig';
import { fetchPrestaciones } from '../../api/catalogs';
import type { Prestacion } from '../../api/catalogs';

// Estado de vencimiento del producto usado en un ítem — trazabilidad de
// lote/vencimiento (ver reunión). `daysUntil` negativo = ya venció.
function productExpiryStatus(item: TreatmentItem): { status: 'expired' | 'soon'; expiresAt: Date; daysUntil: number } | null {
  if (!item.productExpiresAt) return null;
  const expiresAt = new Date(item.productExpiresAt);
  const daysUntil = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return { status: 'expired', expiresAt, daysUntil };
  if (daysUntil <= 30) return { status: 'soon', expiresAt, daysUntil };
  return null;
}

function PlantillaFotografica({
  plan,
  onUpdated,
  onError,
  readOnly = false,
}: {
  plan: TreatmentPlan;
  onUpdated: (plan: TreatmentPlan) => void;
  onError: (message: string) => void;
  // Presupuesto "de alta" — se puede seguir viendo la plantilla, pero no
  // subir ni borrar fotos (ver PlanCard, `isAlta`).
  readOnly?: boolean;
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
        {!readOnly && (
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
        )}
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
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleDelete(photo.id, photo.label)}
                aria-label="Eliminar foto"
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <>
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
          </>
        )}
      </div>

      {pendingFile && (
        <PhotoEditorModal file={pendingFile} onClose={() => setPendingFile(null)} onConfirm={handleConfirmEdit} />
      )}
    </div>
  );
}

const STATUS_OPTIONS: TreatmentStatus[] = ['sin_iniciar', 'en_tratamiento', 'terminado', 'alta'];

function ItemDetailsPanel({ item }: { item: TreatmentItem }) {
  // Producto/lote, notas y fotos ahora se registran únicamente al Evolucionar
  // el presupuesto (ver EvolucionesTab.tsx, se documenta desde esa pestaña) —
  // este panel solo muestra lo ya grabado, no permite editarlo directamente
  // desde Tratamiento.
  const requiresProduct = item.prestacion?.requiresProductTracking ?? false;
  const missingProduct = requiresProduct && !item.productName?.trim();

  const missingStickers: string[] = [];
  if (item.productName?.trim()) {
    if (!item.photos.some((p) => p.label === 'Sticker ficha')) missingStickers.push('la ficha');
    if (!item.photos.some((p) => p.label === 'Sticker paciente')) missingStickers.push('el paciente');
  }

  const expiry = productExpiryStatus(item);

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-white/70 p-2.5" onClick={(e) => e.stopPropagation()}>
      {item.completed && item.treatedBy && (
        <p className="text-xs text-slate-400">
          Tratado por {item.treatedBy.name}
          {item.treatedAt && ` · ${new Date(item.treatedAt).toLocaleDateString('es-CL')}`}
        </p>
      )}

      {(item.productName || item.productLot || item.productExpiresAt || item.productQuantity) && (
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
          <p><span className="text-slate-400">Producto:</span> {item.productName || '—'}</p>
          <p><span className="text-slate-400">Lote:</span> {item.productLot || '—'}</p>
          <p>
            <span className="text-slate-400">Vence:</span>{' '}
            {item.productExpiresAt ? new Date(item.productExpiresAt).toLocaleDateString('es-CL') : '—'}
          </p>
          <p><span className="text-slate-400">Cantidad:</span> {item.productQuantity || '—'}</p>
        </div>
      )}

      {item.notes && <p className="text-xs text-slate-600">{item.notes}</p>}

      {missingProduct && (
        <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
          Esta prestación requiere registrar el producto y su lote — se completa al Evolucionar.
        </p>
      )}

      {expiry?.status === 'expired' && (
        <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
          El producto usado venció el {expiry.expiresAt.toLocaleDateString('es-CL')} — revisa el lote antes de
          continuar.
        </p>
      )}
      {expiry?.status === 'soon' && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
          El producto usado vence el {expiry.expiresAt.toLocaleDateString('es-CL')} ({expiry.daysUntil} día
          {expiry.daysUntil === 1 ? '' : 's'}).
        </p>
      )}

      {missingStickers.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
          Falta subir el sticker del producto para {missingStickers.join(' y ')} (se sube al Evolucionar).
        </p>
      )}

      {item.photos.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-400">Fotos del procedimiento</span>
          <div className="flex flex-wrap items-center gap-2">
            {item.photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200"
              >
                <img src={photo.url} alt={photo.label ?? 'Foto del procedimiento'} className="h-full w-full object-cover" />
                {photo.label && (
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-slate-900/60 px-1 py-0.5 text-[9px] font-medium text-white">
                    {photo.label}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
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

// DOCX (a diferencia del PDF, que se abre "inline" en una pestaña nueva) no
// lo puede previsualizar el navegador — se fuerza la descarga con un enlace
// temporal, el mismo truco de siempre para descargar un blob como archivo.
function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Modal chico para elegir el formato del informe — solo aparece con el
// presupuesto de alta (ver botón "Generar informe" en PlanCard).
function ReportFormatModal({ plan, onClose, onError }: { plan: TreatmentPlan; onClose: () => void; onError: (message: string) => void }) {
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'docx' | null>(null);

  async function handleDownload(format: 'pdf' | 'docx') {
    setIsDownloading(format);
    try {
      const blob = await downloadTreatmentPlanReport(plan.id, format);
      triggerBlobDownload(blob, `informe-presupuesto-${plan.number}.${format}`);
      onClose();
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo generar el informe'));
    } finally {
      setIsDownloading(null);
    }
  }

  return (
    <Modal title="Generar informe" onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600">
          Informe del presupuesto N° {plan.number}, con las prestaciones realizadas y las fotos registradas.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleDownload('pdf')}
            disabled={isDownloading !== null}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-slate-200 py-4 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileIcon className="h-6 w-6 text-brand-600" />
            {isDownloading === 'pdf' ? 'Generando...' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={() => handleDownload('docx')}
            disabled={isDownloading !== null}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-slate-200 py-4 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileIcon className="h-6 w-6 text-brand-600" />
            {isDownloading === 'docx' ? 'Generando...' : 'Word (.docx)'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PlanCard({
  plan,
  onUpdated,
  onDeleted,
  onError,
  onEvolucionar,
  onEdit,
}: {
  plan: TreatmentPlan;
  onUpdated: (plan: TreatmentPlan) => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
  onEvolucionar: (treatmentItemId: string | null) => void;
  onEdit: (plan: TreatmentPlan) => void;
}) {
  const isEstetica = plan.diagramType === 'estetica';
  // Un presupuesto "de alta" queda congelado — solo se puede ver el detalle,
  // ninguna acción de edición (estado, modificar, evolucionar, ítems, fotos)
  // queda disponible (pedido explícito del usuario).
  const isAlta = plan.status === 'alta';
  const [expanded, setExpanded] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newCost, setNewCost] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Cualquier cambio al contenido de un presupuesto ya "en tratamiento"
  // (modificarlo, agregar o quitar un procedimiento) exige dejar un motivo
  // primero — a diferencia de uno que aún no arrancó, ahí se edita libremente.
  // Marcar un procedimiento como realizado NO pasa por acá: eso es ejecutar
  // el tratamiento, no modificarlo.
  function requireReasonIfInTreatment(action: () => void) {
    if (plan.status === 'en_tratamiento') {
      pendingActionRef.current = action;
      setShowReasonModal(true);
    } else {
      action();
    }
  }

  // Pide confirmar antes de pasar a Evolución — es la acción que marca el
  // procedimiento como realizado, así que conviene un paso intermedio en vez
  // de saltar directo a la pestaña Evoluciones al primer clic. Si el
  // presupuesto tiene un solo procedimiento pendiente, se preselecciona ahí;
  // con varios, el usuario elige desde el propio desplegable de Evoluciones.
  function handleClickEvolucionar() {
    const confirmed = window.confirm('¿Estás seguro de continuar con el tratamiento de este presupuesto?');
    if (!confirmed) return;
    const pending = plan.items.filter((i) => !i.completed);
    onEvolucionar(pending.length === 1 ? pending[0].id : null);
  }

  // Un presupuesto "en tratamiento" ya se empezó a tratar — modificarlo (ej.
  // agregar una prestación que no se había considerado) exige dejar por qué,
  // a diferencia de uno que aún no arrancó (ahí se edita libremente).
  function handleClickModificar() {
    requireReasonIfInTreatment(() => onEdit(plan));
  }

  async function handleReasonAccepted(reason: string) {
    try {
      await addTreatmentPlanEdit(plan.id, reason);
      setShowReasonModal(false);
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action?.();
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo registrar el motivo de la modificación'));
    }
  }

  // Buscador de prestaciones + odontograma para agregar procedimientos a un
  // plan YA EXISTENTE (antes sólo existía en el asistente "Nuevo presupuesto"
  // al crear el plan desde cero) — mismo criterio que ahí: la pieza/cara la
  // determina la prestación elegida, salvo que se abra "fuera de catálogo".
  // Sólo para planes dentales; los estéticos siguen con el ingreso manual de
  // siempre hasta que el mapa facial también se integre aquí.
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [prestacionSearch, setPrestacionSearch] = useState('');
  const [pickedPrestacion, setPickedPrestacion] = useState<Prestacion | null>(null);
  const [entryMode, setEntryMode] = useState<'catalog' | 'custom' | null>(null);
  const [draftMode, setDraftMode] = useState<OdontogramMode | null>(null);
  const [draftSelection, setDraftSelection] = useState<ToothSelection[]>([]);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (isEstetica) return;
    fetchPrestaciones()
      .then((list) => setPrestaciones(list.filter((p) => p.category !== 'estetica')))
      .catch(() => undefined);
  }, [isEstetica]);

  const filteredPrestaciones = (() => {
    const q = prestacionSearch.trim().toLowerCase();
    if (!q) return [];
    return prestaciones.filter((p) => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)).slice(0, 8);
  })();

  function resetEntry() {
    setPickedPrestacion(null);
    setEntryMode(null);
    setDraftMode(null);
    setDraftSelection([]);
    setDraftError(null);
    setNewDescription('');
    setNewCost('');
  }

  function pickPrestacion(prestacion: Prestacion) {
    setPrestacionSearch('');
    const config = getOdontogramConfig(prestacion);
    setPickedPrestacion(prestacion);
    setEntryMode('catalog');
    setDraftMode(config.mode);
    setDraftSelection(selectionFromDefaults(config.defaultTeeth, config.defaultSurfaces));
    setDraftError(null);
    setNewDescription(prestacion.name);
    const discount = plan.convenio?.discountPercent ?? 0;
    setNewCost(String(Math.round(prestacion.basePrice * (1 - discount / 100))));
  }

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

  function handleDeleteItem(itemId: string, description: string) {
    const confirmed = window.confirm(`¿Eliminar el procedimiento "${description}"? Se perderá su registro de producto/lote y fotos asociadas.`);
    if (!confirmed) return;
    requireReasonIfInTreatment(() => performDeleteItem(itemId));
  }

  async function performDeleteItem(itemId: string) {
    try {
      const updated = await deleteTreatmentItem(itemId);
      applyServerPlan(updated);
    } catch (err) {
      onError(getErrorMessage(err, 'No se pudo eliminar el procedimiento'));
    }
  }

  function handleAddItem() {
    if (!newDescription.trim()) return;
    if (entryMode !== null && draftMode && draftMode !== 'session' && draftSelection.length === 0) {
      setDraftError(draftMode === 'surface' ? 'Selecciona al menos una cara.' : 'Selecciona al menos una pieza.');
      return;
    }
    requireReasonIfInTreatment(performAddItem);
  }

  async function performAddItem() {
    setIsAdding(true);
    try {
      const discount = plan.convenio?.discountPercent ?? 0;
      // El precio de catálogo es por pieza, no por presupuesto completo: si
      // se marcaron varias piezas en un modo que se cobra por pieza (pieza
      // completa/cara/extracción), se agrega un ítem por cada una en vez de
      // uno solo con todas adentro. Se manda una llamada a la vez (no en
      // paralelo) porque el backend recalcula el total sumando todos los
      // ítems vigentes en cada creación.
      const perUnitModes: OdontogramMode[] = ['tooth', 'extraction', 'surface'];
      const groups = draftMode && perUnitModes.includes(draftMode) ? splitSelectionByTooth(draftSelection) : [draftSelection];
      let updated = plan;
      for (const group of groups) {
        const toothNumber = draftMode ? toothNumberForBackend(draftMode, group) : undefined;
        updated = await addTreatmentItem(plan.id, {
          description: newDescription.trim(),
          cost: Number(newCost) || 0,
          ...(pickedPrestacion
            ? {
                prestacionId: pickedPrestacion.id,
                listPrice: pickedPrestacion.basePrice,
                convenioDiscountPercent: discount,
              }
            : {}),
          ...(toothNumber ? { toothNumber } : {}),
        });
      }
      applyServerPlan(updated);
      resetEntry();
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
          disabled={isAlta}
          title={isAlta ? 'Presupuesto de alta — ya no se puede modificar' : undefined}
          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-70 ${TREATMENT_STATUS_CLASSES[plan.status]}`}
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
          {plan.professional?.name ?? plan.remoteProfessionalName ?? 'Sin diagnosticador'}
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

        {!isAlta && (
          <button
            type="button"
            onClick={handleClickModificar}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <EditIcon className="h-3.5 w-3.5" />
            Modificar
          </button>
        )}

        {plan.items.length > 0 && !isAlta && (
          <button
            type="button"
            onClick={handleClickEvolucionar}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          >
            <ActivityIcon className="h-3.5 w-3.5" />
            Evolucionar
          </button>
        )}

        {!isAlta && (
          <button
            type="button"
            onClick={handleDeletePlan}
            aria-label="Eliminar presupuesto"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}

        {isAlta && (
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Generar informe
          </button>
        )}

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
                    disabled={isAlta}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                    {(() => {
                      const expiry = productExpiryStatus(item);
                      if (!expiry) return null;
                      return (
                        <span
                          title={
                            expiry.status === 'expired'
                              ? `Producto vencido el ${expiry.expiresAt.toLocaleDateString('es-CL')}`
                              : `Producto vence el ${expiry.expiresAt.toLocaleDateString('es-CL')}`
                          }
                          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            expiry.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {expiry.status === 'expired' ? 'Producto vencido' : 'Producto por vencer'}
                        </span>
                      );
                    })()}
                  </span>
                  <span className="text-sm text-slate-500">{formatCLP(item.cost)}</span>
                  {!isAlta && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id, item.description)}
                      aria-label="Eliminar procedimiento"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <ItemDetailsPanel item={item} />
              </div>
            ))}
          </div>

          {isEstetica && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <PlantillaFotografica plan={plan} onUpdated={applyServerPlan} onError={onError} readOnly={isAlta} />
            </div>
          )}

          {!isAlta && (isEstetica ? (
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
          ) : (
            <div className="mt-3 flex flex-col gap-2.5 rounded-lg bg-slate-50 p-3">
              {prestaciones.length > 0 && (
                <div className="relative">
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={prestacionSearch}
                      onChange={(e) => setPrestacionSearch(e.target.value)}
                      placeholder="Buscar prestación del catálogo..."
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                    />
                  </div>
                  {filteredPrestaciones.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      {filteredPrestaciones.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => pickPrestacion(p)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                        >
                          <span className="text-slate-700">{p.name}</span>
                          <span className="text-slate-500">{formatCLP(p.basePrice)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {entryMode !== null && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {entryMode === 'catalog' ? `Prestación del catálogo: ${pickedPrestacion?.name}` : 'Prestación fuera de catálogo'}
                    </span>
                    <button type="button" onClick={resetEntry} className="text-xs font-semibold text-slate-500 underline hover:text-slate-700">
                      Cancelar
                    </button>
                  </div>

                  {entryMode === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Descripción del procedimiento"
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
                    </div>
                  )}

                  {draftError && <p className="text-xs font-medium text-red-600">{draftError}</p>}

                  <Odontogram
                    mode={draftMode ?? 'session'}
                    selection={draftSelection}
                    onSelectionChange={setDraftSelection}
                    onModeChange={entryMode === 'custom' ? setDraftMode : undefined}
                    allowedModes={entryMode === 'custom' || !draftMode ? undefined : [draftMode]}
                  />

                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={isAdding || !newDescription.trim()}
                    className="flex items-center justify-center gap-1 self-end rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Agregar
                  </button>
                </>
              )}
            </div>
          ))}

          {plan.notes && <p className="mt-3 text-sm text-slate-500">{plan.notes}</p>}
        </div>
      )}

      {showReasonModal && (
        <ReasonModal
          title="Modificar presupuesto en tratamiento"
          description="Este presupuesto ya está en tratamiento. Indica el motivo por el que lo vas a modificar antes de continuar."
          placeholder="Ej: se agrega una zona adicional pedida por la paciente en la sesión de hoy."
          onClose={() => setShowReasonModal(false)}
          onAccept={handleReasonAccepted}
        />
      )}

      {showReportModal && <ReportFormatModal plan={plan} onClose={() => setShowReportModal(false)} onError={onError} />}
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
            <p className="text-sm text-slate-700">{plan.professional?.name ?? plan.remoteProfessionalName ?? 'Sin diagnosticador'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Forma de pago</p>
            <p className="text-sm text-slate-700">{plan.paymentMethod ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Clínica</p>
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

// Lista completa de presupuestos del paciente (no solo los con zonas) — el
// resumen inline de "Historial de zonas tratadas" solo alcanza a mostrar el
// más reciente sin abrumar la pantalla; acá se puede llegar a cualquiera.
function PlanHistoryModal({ plans, onClose }: { plans: TreatmentPlan[]; onClose: () => void }) {
  const [detailPlan, setDetailPlan] = useState<TreatmentPlan | null>(null);

  return (
    <Modal title="Historial de presupuestos" onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
        {plans.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Aún no hay presupuestos para este paciente.</p>}
        {plans.map((plan) => (
          <div key={plan.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700">
                N° {plan.number} · {new Date(plan.createdAt).toLocaleDateString('es-CL')}
                {plan.name && <span className="text-slate-400"> · {plan.name}</span>}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TREATMENT_STATUS_CLASSES[plan.status]}`}>
                  {TREATMENT_STATUS_LABELS[plan.status]}
                </span>
                {formatCLP(plan.amount)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetailPlan(plan)}
              className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Ver detalle
            </button>
          </div>
        ))}
      </div>

      {detailPlan && <PlanDetailModal plan={detailPlan} onClose={() => setDetailPlan(null)} />}
    </Modal>
  );
}

export function TreatmentPlanTab({
  patient,
  onEvolucionar,
}: {
  patient: Patient;
  // Al presionar "Evolucionar" en un presupuesto, se documenta desde la
  // pestaña Evoluciones (no en un modal aparte) — este callback lleva al
  // padre (FichaPaciente) el id del único procedimiento pendiente si el
  // presupuesto tiene uno solo (para preseleccionarlo ahí), o `null` si tiene
  // varios (el usuario elige desde el propio desplegable de Evoluciones).
  onEvolucionar: (treatmentItemId: string | null) => void;
}) {
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
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | 'all'>('all');
  const [planSearch, setPlanSearch] = useState('');
  const [showPlanHistory, setShowPlanHistory] = useState(false);

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

  const filteredPlans = (() => {
    const q = planSearch.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (p) =>
        String(p.number).includes(q) ||
        (p.name ?? '').toLowerCase().includes(q) ||
        p.items.some((i) => i.description.toLowerCase().includes(q))
    );
  })();

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
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Historial de zonas tratadas</h3>
              {plans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPlanHistory(true)}
                  className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Ver historial
                </button>
              )}
            </div>
            {plansWithZones.length === 0 ? (
              <p className="text-sm text-slate-400">Aún no hay zonas registradas para este paciente.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Solo el más reciente a modo de vistazo rápido — el resto (y
                    los presupuestos sin zonas) se ven en "Ver historial". */}
                <PlanZonesHistoryCard plan={plansWithZones[0]} />
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
          {user?.permissions?.crearPresupuestos !== false && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo presupuesto
            </button>
          )}
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {plans.length > 3 && (
          <input
            value={planSearch}
            onChange={(e) => setPlanSearch(e.target.value)}
            placeholder="Buscar por N°, nombre o procedimiento..."
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        )}

        {!isLoading && plans.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            Este paciente aún no tiene presupuestos registrados.
          </p>
        )}
        {!isLoading && plans.length > 0 && filteredPlans.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">Ningún presupuesto coincide con "{planSearch}".</p>
        )}

        <div className="flex flex-col gap-3">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onError={setError}
              onEvolucionar={onEvolucionar}
              onEdit={setEditingPlan}
            />
          ))}
        </div>
      </div>

      {showPlanHistory && <PlanHistoryModal plans={plans} onClose={() => setShowPlanHistory(false)} />}

      {(showForm || editingPlan) && (
        <TreatmentPlanFormModal
          patient={patient}
          editingPlan={editingPlan}
          onClose={() => {
            setShowForm(false);
            setEditingPlan(null);
          }}
          onSaved={(plan) => {
            setPlans((prev) => (editingPlan ? prev.map((p) => (p.id === plan.id ? plan : p)) : [plan, ...prev]));
            setShowForm(false);
            setEditingPlan(null);
          }}
        />
      )}
    </div>
  );
}
