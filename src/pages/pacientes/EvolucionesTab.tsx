import { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import {
  fetchEvolutions,
  createEvolution,
  updateEvolution,
  uploadEvolutionPhoto,
  deleteEvolutionPhoto,
  deleteEvolution,
  type Evolution,
  type EnabledFilter,
} from '../../api/evolutions';
import { fetchEvolutionTemplates } from '../../api/catalogs';
import type { EvolutionTemplate } from '../../api/catalogs';
import { fetchUsers, type StaffUser } from '../../api/users';
import { fetchPatientAppointments, type Appointment } from '../../api/appointments';
import { fetchTreatmentPlans } from '../../api/treatmentPlans';
import type { Patient } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { formatLongDate, formatTime } from '../agenda/dateUtils';
import { NewAppointmentModal } from '../agenda/NewAppointmentModal';
import { Modal } from '../../components/Modal';
import { ReasonModal } from '../../components/ReasonModal';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ActivityIcon, CalendarIcon, EyeIcon, EyeOffIcon, PrinterIcon, TrashIcon, UploadIcon } from '../../components/icons';
import { PHOTO_LABELS, missingRequiredProductFields, type PhotoLabel } from './photoLabels';

const STATUS_TABS: { key: EnabledFilter; label: string }[] = [
  { key: 'true', label: 'Habilitadas' },
  { key: 'false', label: 'Deshabilitadas' },
  { key: 'all', label: 'Todas' },
];

function isContentEmpty(html: string) {
  return !html || html.replace(/<[^>]*>/g, '').trim() === '';
}

function EvolutionCard({
  evolution,
  onToggle,
  onDeletePhoto,
  onRequestDelete,
}: {
  evolution: Evolution;
  onToggle: (evolution: Evolution) => void;
  onDeletePhoto: (photoId: string, label: string | null) => void;
  onRequestDelete: (evolution: Evolution) => void;
}) {
  return (
    <div className={`rounded-xl border p-4 ${evolution.enabled ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{evolution.professional.name}</span>
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            {new Date(evolution.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggle(evolution)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            {evolution.enabled ? (
              <>
                <EyeIcon className="h-3.5 w-3.5" /> Deshabilitar
              </>
            ) : (
              <>
                <EyeOffIcon className="h-3.5 w-3.5" /> Habilitar
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(evolution)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
          >
            <TrashIcon className="h-3.5 w-3.5" /> Eliminar
          </button>
        </div>
      </div>
      {evolution.treatmentItem && (
        <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
          Procedimiento realizado: {evolution.treatmentItem.description}
        </p>
      )}
      {evolution.productName && (
        <p className="mb-2 text-xs text-slate-500">
          Producto: <span className="font-medium text-slate-700">{evolution.productName}</span>
          {evolution.productLot && ` · Lote: ${evolution.productLot}`}
          {evolution.productQuantity && ` · ${evolution.productQuantity}`}
          {evolution.productExpiresAt && ` · Vence: ${new Date(evolution.productExpiresAt).toLocaleDateString('es-CL')}`}
        </p>
      )}
      <div className="prose-sm text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: evolution.content }} />
      {evolution.photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {evolution.photos.map((photo) => (
            <div key={photo.id} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
              <a href={photo.url} target="_blank" rel="noreferrer">
                <img src={photo.url} alt={photo.label ?? 'Foto de la evolución'} className="h-full w-full object-cover" />
              </a>
              {photo.label && (
                <span className="absolute bottom-0.5 left-0.5 rounded bg-slate-900/60 px-1 py-0.5 text-[9px] font-medium text-white">
                  {photo.label}
                </span>
              )}
              <button
                type="button"
                onClick={() => onDeletePhoto(photo.id, photo.label)}
                aria-label="Eliminar foto"
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EvolucionesTab({
  patient,
  preselectTreatmentItemId,
  onPreselectionConsumed,
}: {
  patient: Patient;
  // Al venir del botón "Evolucionar" de un presupuesto (Tratamientos) con un
  // solo procedimiento pendiente, llega ya elegido — evita tener que
  // buscarlo de nuevo en el desplegable.
  preselectTreatmentItemId?: string | null;
  onPreselectionConsumed?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [professionals, setProfessionals] = useState<StaffUser[]>([]);
  const [professionalId, setProfessionalId] = useState('');
  const [templates, setTemplates] = useState<EvolutionTemplate[]>([]);
  const [section, setSection] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [deletingEvolution, setDeletingEvolution] = useState<Evolution | null>(null);
  const [filterProfessionalId, setFilterProfessionalId] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnabledFilter>('true');
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [showNewControl, setShowNewControl] = useState(false);
  const [showUpcomingControls, setShowUpcomingControls] = useState(false);
  const [upcomingControls, setUpcomingControls] = useState<Appointment[]>([]);
  const [isLoadingControls, setIsLoadingControls] = useState(false);

  // Procedimientos de presupuesto aún no marcados como realizados — al elegir
  // uno y grabar, la evolución queda enlazada y el procedimiento se marca
  // solo (ver createEvolution/evolutionsController.ts).
  const [pendingItems, setPendingItems] = useState<{ id: string; label: string; requiresProductTracking: boolean }[]>([]);
  const [treatmentItemId, setTreatmentItemId] = useState(preselectTreatmentItemId ?? '');

  useEffect(() => {
    if (preselectTreatmentItemId) onPreselectionConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trazabilidad del producto usado, documentada acá (al evolucionar) — solo
  // tiene sentido cuando la evolución documenta un procedimiento puntual.
  const [productName, setProductName] = useState('');
  const [productLot, setProductLot] = useState('');
  const [productExpiresAt, setProductExpiresAt] = useState('');
  const [productQuantity, setProductQuantity] = useState('');

  // Fotos elegidas antes de grabar — se suben recién después de crear la
  // evolución (necesitan su id). Mismas etiquetas que en el presupuesto.
  const [pendingPhotos, setPendingPhotos] = useState<{ key: string; file: File; previewUrl: string; label: PhotoLabel }[]>(
    []
  );
  const [pendingLabel, setPendingLabel] = useState<PhotoLabel>('Antes');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotosRef = useRef(pendingPhotos);
  pendingPhotosRef.current = pendingPhotos;

  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  useEffect(() => {
    fetchTreatmentPlans(patient.id)
      .then((plans) => {
        const items = plans.flatMap((plan) =>
          plan.items
            .filter((item) => !item.completed)
            .map((item) => ({
              id: item.id,
              label: `N° ${plan.number}${plan.name ? ` · ${plan.name}` : ''} — ${item.description}`,
              requiresProductTracking: item.prestacion?.requiresProductTracking ?? false,
            }))
        );
        setPendingItems(items);
      })
      .catch(() => setPendingItems([]));
  }, [patient.id]);

  useEffect(() => {
    if (isAdmin) fetchUsers().then(setProfessionals).catch(() => undefined);
    fetchEvolutionTemplates().then(setTemplates).catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    setIsLoading(true);
    fetchEvolutions(patient.id, { professionalId: filterProfessionalId || undefined, enabled: statusFilter })
      .then(setEvolutions)
      .catch((err) => setListError(getErrorMessage(err, 'No se pudieron cargar las evoluciones')))
      .finally(() => setIsLoading(false));
  }, [patient.id, filterProfessionalId, statusFilter]);

  const sections = useMemo(() => {
    const set = new Set(templates.map((t) => t.section).filter(Boolean) as string[]);
    return Array.from(set);
  }, [templates]);

  const filteredTemplates = useMemo(
    () => templates.filter((t) => !section || t.section === section),
    [templates, section]
  );

  function insertHtml(html: string) {
    setContent((prev) => (isContentEmpty(prev) ? html : `${prev}${html}`));
  }

  function handleGenerarAlta() {
    const altaTemplate =
      templates.find((t) => t.section === 'Alta') ??
      templates.find((t) => t.name.toLowerCase().includes('alta'));
    insertHtml(
      altaTemplate?.content ??
        '<p>Paciente finaliza tratamiento en buenas condiciones clínicas. Se indica control periódico.</p>'
    );
  }

  const requiresProduct = pendingItems.find((i) => i.id === treatmentItemId)?.requiresProductTracking ?? false;

  async function handleSave() {
    if (isContentEmpty(content)) {
      setFormError('Escribe el contenido de la evolución');
      return;
    }
    if (requiresProduct && missingRequiredProductFields({ productName, productLot, productExpiresAt, productQuantity })) {
      setFormError('Este procedimiento requiere registrar producto, lote, vencimiento y cantidad para poder grabar la evolución');
      return;
    }
    setFormError(null);
    setIsSaving(true);
    try {
      let evolution = await createEvolution({
        patientId: patient.id,
        professionalId: isAdmin && professionalId ? professionalId : undefined,
        content,
        treatmentItemId: treatmentItemId || undefined,
        productName: productName.trim() || undefined,
        productLot: productLot.trim() || undefined,
        productExpiresAt: productExpiresAt || undefined,
        productQuantity: productQuantity.trim() || undefined,
      });

      // Las fotos se suben recién ahora que la evolución ya existe (una por
      // una, para que cada una quede asociada a la anterior ya subida).
      for (const photo of pendingPhotos) {
        evolution = await uploadEvolutionPhoto(evolution.id, photo.file, photo.label);
        URL.revokeObjectURL(photo.previewUrl);
      }
      setPendingPhotos([]);

      setContent('');
      setShowPreview(false);
      setProductName('');
      setProductLot('');
      setProductExpiresAt('');
      setProductQuantity('');
      if (statusFilter !== 'false') {
        setEvolutions((prev) => [evolution, ...prev]);
      }
      if (treatmentItemId) {
        setPendingItems((prev) => prev.filter((item) => item.id !== treatmentItemId));
        setTreatmentItemId('');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo guardar la evolución'));
    } finally {
      setIsSaving(false);
    }
  }

  function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPendingPhotos((prev) => [
        ...prev,
        { key: `photo-${prev.length}-${file.name}`, file, previewUrl: URL.createObjectURL(file), label: pendingLabel },
      ]);
    }
    e.target.value = '';
  }

  function removePendingPhoto(key: string) {
    setPendingPhotos((prev) => {
      const removed = prev.find((p) => p.key === key);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  async function handleDeletePhoto(photoId: string, label: string | null) {
    const confirmed = window.confirm(
      label ? `¿Eliminar la foto "${label}"? Esta acción no se puede deshacer.` : '¿Eliminar esta foto? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;
    try {
      const updated = await deleteEvolutionPhoto(photoId);
      setEvolutions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      setListError(getErrorMessage(err, 'No se pudo eliminar la foto'));
    }
  }

  async function handleToggle(evolution: Evolution) {
    try {
      const updated = await updateEvolution(evolution.id, { enabled: !evolution.enabled });
      if (statusFilter === 'all') {
        setEvolutions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      } else {
        setEvolutions((prev) => prev.filter((e) => e.id !== updated.id));
      }
    } catch (err) {
      setListError(getErrorMessage(err, 'No se pudo actualizar la evolución'));
    }
  }

  // Borrar (a diferencia de deshabilitar) exige un motivo — queda guardado
  // para auditoría (ver EvolutionDeletion en el backend).
  async function handleDelete(reason: string) {
    if (!deletingEvolution) return;
    try {
      await deleteEvolution(deletingEvolution.id, reason);
      setEvolutions((prev) => prev.filter((e) => e.id !== deletingEvolution.id));
      setDeletingEvolution(null);
    } catch (err) {
      setListError(getErrorMessage(err, 'No se pudo eliminar la evolución'));
    }
  }

  async function handleOpenUpcomingControls() {
    setShowUpcomingControls(true);
    setIsLoadingControls(true);
    try {
      const appointments = await fetchPatientAppointments(patient.id);
      const now = new Date();
      const upcoming = appointments
        .filter((a) => a.type === 'control' && a.status !== 'cancelada' && new Date(a.startAt) > now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      setUpcomingControls(upcoming);
    } catch {
      setUpcomingControls([]);
    } finally {
      setIsLoadingControls(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowNewControl(true)}
            className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          >
            Crear próximo control
          </button>
          <button
            type="button"
            onClick={handleOpenUpcomingControls}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Próximos controles
          </button>
        </div>

        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ActivityIcon className="h-5 w-5 text-brand-500" />
          Crear nueva evolución
        </h2>

        {pendingItems.length > 0 && (
          <div>
            <label className="text-sm font-medium text-slate-700">¿Documenta un procedimiento del presupuesto?</label>
            <select
              value={treatmentItemId}
              onChange={(e) => setTreatmentItemId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">No, es una nota general</option>
              {pendingItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            {treatmentItemId && (
              <div className="mt-2 rounded-lg bg-amber-50 p-2.5">
                <p className="text-xs text-amber-700">
                  Al grabar, este procedimiento quedará marcado como realizado — no hace falta tildarlo aparte en el
                  presupuesto.
                  {requiresProduct && ' Este procedimiento requiere registrar producto, lote, vencimiento y cantidad para poder grabar.'}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Producto (ej. Ácido Hialurónico)"
                    className={`rounded-md border bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 ${
                      requiresProduct && !productName.trim() ? 'border-red-300' : 'border-amber-200'
                    }`}
                  />
                  <input
                    value={productLot}
                    onChange={(e) => setProductLot(e.target.value)}
                    placeholder="N° de lote"
                    className={`rounded-md border bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 ${
                      requiresProduct && !productLot.trim() ? 'border-red-300' : 'border-amber-200'
                    }`}
                  />
                  <input
                    type="date"
                    value={productExpiresAt}
                    onChange={(e) => setProductExpiresAt(e.target.value)}
                    title="Fecha de vencimiento"
                    className={`rounded-md border bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 ${
                      requiresProduct && !productExpiresAt ? 'border-red-300' : 'border-amber-200'
                    }`}
                  />
                  <input
                    value={productQuantity}
                    onChange={(e) => setProductQuantity(e.target.value)}
                    placeholder="Cantidad (ej. 1 jeringa 1ml)"
                    className={`rounded-md border bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 ${
                      requiresProduct && !productQuantity.trim() ? 'border-red-300' : 'border-amber-200'
                    }`}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-amber-700">Fotos (antes/después, sticker)</span>
                  <div className="flex flex-wrap shrink-0 gap-1 rounded-lg bg-white/70 p-0.5 text-[11px] font-medium">
                    {PHOTO_LABELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setPendingLabel(l)}
                        className={`rounded-md px-2 py-0.5 transition-colors ${
                          pendingLabel === l ? 'bg-white text-brand-700 shadow-sm' : 'text-amber-700 hover:text-amber-900'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {pendingPhotos.map((photo) => (
                    <div key={photo.key} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-amber-200">
                      <img src={photo.previewUrl} alt={photo.label} className="h-full w-full object-cover" />
                      <span className="absolute bottom-0.5 left-0.5 rounded bg-slate-900/60 px-1 py-0.5 text-[9px] font-medium text-white">
                        {photo.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePendingPhoto(photo.key)}
                        aria-label="Quitar foto"
                        className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-amber-300 text-amber-500 hover:border-amber-400 hover:text-amber-700"
                  >
                    <UploadIcon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">Foto</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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

        <div>
          <label className="text-sm font-medium text-slate-700">Contenido de la evolución</label>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">Todas las secciones</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) insertHtml(templates.find((t) => t.id === e.target.value)?.content ?? '');
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">Predefinidas...</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleGenerarAlta}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Generar alta
            </button>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              disabled={isContentEmpty(content)}
              className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showPreview ? 'Volver a editar' : 'Previsualizar'}
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="min-h-[10rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        ) : (
          <RichTextEditor value={content} onChange={setContent} />
        )}

        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
        {saveSuccess && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">Evolución guardada correctamente.</p>}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              isSaving ||
              (requiresProduct && missingRequiredProductFields({ productName, productLot, productExpiresAt, productQuantity }))
            }
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Guardando...' : 'Grabar'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
        <div className="flex items-center gap-2">
          <select
            value={filterProfessionalId}
            onChange={(e) => setFilterProfessionalId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          >
            <option value="">Filtrar por profesional: TODOS</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {!isAdmin && user && <option value={user.id}>{user.name}</option>}
          </select>
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Imprimir"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
          >
            <PrinterIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`flex-1 rounded-full px-2 py-1.5 transition-colors ${
                statusFilter === tab.key ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {listError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{listError}</p>}

        <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto">
          {!isLoading && evolutions.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No hay evoluciones registradas.</p>
          )}
          {evolutions.map((evolution) => (
            <EvolutionCard
              key={evolution.id}
              evolution={evolution}
              onToggle={handleToggle}
              onDeletePhoto={handleDeletePhoto}
              onRequestDelete={setDeletingEvolution}
            />
          ))}
        </div>
      </div>

      {showNewControl && (
        <NewAppointmentModal
          defaultDate={new Date()}
          initialPatient={patient}
          appointmentType="control"
          onClose={() => setShowNewControl(false)}
          onCreated={() => setShowNewControl(false)}
        />
      )}

      {showUpcomingControls && (
        <Modal title="Próximos controles" onClose={() => setShowUpcomingControls(false)}>
          {isLoadingControls ? (
            <p className="py-6 text-center text-sm text-slate-400">Cargando...</p>
          ) : upcomingControls.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Este paciente no tiene controles agendados.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingControls.map((a) => (
                <div key={a.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-slate-700">{formatLongDate(new Date(a.startAt))}</p>
                  <p className="text-slate-500">
                    {formatTime(new Date(a.startAt))} · {a.professional?.name ?? 'Sin profesional'} ·{' '}
                    {a.chair?.name || `Sillón ${a.chair?.number}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {deletingEvolution && (
        <ReasonModal
          title="Eliminar evolución"
          description="Esta acción no se puede deshacer. Indica el motivo por el que la vas a eliminar."
          placeholder="Ej: se creó por error, es una nota duplicada."
          acceptLabel="Eliminar"
          onClose={() => setDeletingEvolution(null)}
          onAccept={handleDelete}
        />
      )}
    </div>
  );
}
