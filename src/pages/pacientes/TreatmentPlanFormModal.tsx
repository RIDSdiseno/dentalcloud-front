import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import {
  createTreatmentPlan,
  addTreatmentItem,
  uploadTreatmentPlanPhoto,
  type TreatmentPlan,
  type TreatmentItem,
  type TreatmentItemInput,
} from '../../api/treatmentPlans';
import { fetchUsers, type StaffUser } from '../../api/users';
import { fetchSucursales, fetchPrevisiones, fetchConvenios, fetchPrestaciones } from '../../api/catalogs';
import type { Sucursal, Prevision, Convenio, Prestacion } from '../../api/catalogs';
import type { Patient } from '../../api/patients';
import { ALLERGY_LABEL, type AllergyKey } from '../../data/allergies';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { formatCLP } from '../../utils/treatmentStatus';
import { AlertTriangleIcon, CheckIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/icons';
import { Odontogram, type OdontogramMark, type OdontogramMode, type ToothSelection, type ToothSurface } from './Odontogram';
import {
  areaLabel,
  formatOdontogramSelection,
  getOdontogramConfig,
  selectionFromDefaults,
  splitSelectionByTooth,
  toothNumberForBackend,
} from './odontogramConfig';
import { FacialMap, type FacialGender } from './FacialMap';
import { PhotoEditorModal } from './PhotoEditorModal';
import {
  EMPTY_FACIAL_ANNOTATIONS,
  FACIAL_ZONES,
  FACIAL_ZONE_LABELS,
  formatFacialSelection,
  getFacialConfig,
  parseTreatedZones,
  zoneAreaLabel,
  zoneNumberForBackend,
  type FacialAnnotations,
  type FacialZoneKey,
} from './facialZoneConfig';
import { detectAllergensInPrestacion } from './allergenDetection';

// A partir de aquí, "tooth"/"pieza" siempre puede ser una zona facial cuando la
// clínica es de tipo "estetica" — ver TreatmentPlanFormModal({ isEstetica }).
function pickConfig(isEstetica: boolean, prestacion: Prestacion) {
  if (isEstetica) {
    const config = getFacialConfig(prestacion);
    return {
      mode: config.mode,
      markColor: undefined as string | undefined,
      defaultTeeth: config.defaultZones as string[] | undefined,
      // Las zonas faciales siempre usan una única "cara" fija ('center', ver
      // FacialMap.tsx) — a diferencia del odontograma, no hay caras reales
      // que elegir.
      defaultSurfaces: config.defaultZones ? (['center'] as ToothSurface[]) : undefined,
    };
  }
  const config = getOdontogramConfig(prestacion);
  return {
    mode: config.mode,
    markColor: config.markColor,
    defaultTeeth: config.defaultTeeth,
    defaultSurfaces: config.defaultSurfaces,
  };
}

function selectionLabel(isEstetica: boolean, mode: OdontogramMode, selection: ToothSelection[]): string {
  return isEstetica ? formatFacialSelection(mode, selection) : formatOdontogramSelection(mode, selection);
}

function areaLabelFor(isEstetica: boolean, mode: OdontogramMode): string {
  return isEstetica ? zoneAreaLabel(mode) : areaLabel(mode);
}

function locationForBackend(isEstetica: boolean, mode: OdontogramMode, selection: ToothSelection[]): string | null {
  return isEstetica ? zoneNumberForBackend(mode, selection) : toothNumberForBackend(mode, selection);
}

const MODE_INSTRUCTIONS_ESTETICA: Partial<Record<OdontogramMode, string>> = {
  session: 'Esta prestación aplica a todo el rostro. Presiona "Agregar prestación" para confirmarla.',
  tooth: 'Selecciona una o más zonas del rostro donde se aplicará el procedimiento.',
};

type ItemRow = {
  key: string;
  prestacionId?: string;
  description: string;
  toothNumber: string | null;
  listPrice: number;
  convenioDiscountPercent: number;
  cost: number;
  odontogramMode: OdontogramMode;
  odontogramSelection: ToothSelection[];
  odontogramColor?: string;
  notes?: string;
  productName?: string;
  productLot?: string;
  productExpiresAt?: string;
  productQuantity?: string;
  // Ya existía en el presupuesto que se está modificando (ver `editingPlan`)
  // — se muestra sin poder editarla/quitarla y no se reenvía al grabar, solo
  // las prestaciones nuevas agregadas en esta sesión.
  existing?: boolean;
};

const MODE_INSTRUCTIONS: Record<OdontogramMode, string> = {
  session: 'Esta prestación aplica a toda la boca. Presiona "Agregar prestación" para confirmarla.',
  tooth: 'Selecciona las caras de cada pieza (el número selecciona las 5 caras).',
  surface: 'Selecciona las caras afectadas de cada pieza (el número selecciona las 5 caras).',
  extraction: 'Selecciona una o varias piezas a extraer.',
  cuadrante: 'Haz clic en cualquier pieza del cuadrante para marcarlo completo.',
  sextante: 'Haz clic en cualquier pieza del sextante para marcarlo completo.',
  arcada: 'Haz clic en cualquier pieza de la arcada para marcarla completa.',
};

function createMarksFromItem(item: ItemRow): OdontogramMark[] {
  if (item.odontogramMode === 'session') return [];
  const byTooth = new Map<string, ToothSelection['surface'][]>();
  for (const sel of item.odontogramSelection) {
    if (!byTooth.has(sel.tooth)) byTooth.set(sel.tooth, []);
    byTooth.get(sel.tooth)!.push(sel.surface);
  }
  return Array.from(byTooth.entries()).map(([tooth, surfaces]) => ({
    tooth,
    mode: item.odontogramMode as Exclude<OdontogramMode, 'session'>,
    surfaces,
    color: item.odontogramColor,
  }));
}

function detailLabel(item: ItemRow, isEstetica: boolean): string {
  if (item.odontogramMode === 'session') return isEstetica ? 'Aplicación: todo el rostro' : 'Aplicación: toda la boca';
  return selectionLabel(isEstetica, item.odontogramMode, item.odontogramSelection);
}

type TreatmentPlanFormModalProps = {
  patient: Patient;
  onClose: () => void;
  onSaved: (plan: TreatmentPlan) => void;
  // Si se pasa, el modal abre directo en "Prestaciones" para agregar
  // prestaciones NUEVAS a este presupuesto ya existente — no permite tocar
  // sucursal/convenio/previsión ni modificar/quitar lo ya agregado (pedido
  // explícito: un presupuesto "en tratamiento" solo se amplía, no se reescribe).
  editingPlan?: TreatmentPlan | null;
};

// Reconstruye la fila de "Prestaciones agregadas" para un ítem que YA existe
// en el presupuesto que se está modificando — solo para mostrarlo (marcado
// `existing`, sin poder editarlo/quitarlo) y que sus zonas sigan apareciendo
// en el mapa facial/odontograma al agregar prestaciones nuevas encima.
function existingItemToRow(item: TreatmentItem, isEstetica: boolean): ItemRow {
  const zones = isEstetica ? parseTreatedZones(item.toothNumber) : [];
  const odontogramSelection: ToothSelection[] = zones.map((zone) => ({ tooth: zone, surface: 'center' }));
  return {
    key: item.id,
    prestacionId: item.prestacionId ?? undefined,
    description: item.description,
    toothNumber: item.toothNumber,
    listPrice: item.listPrice,
    convenioDiscountPercent: item.convenioDiscountPercent,
    cost: item.cost,
    // Sin reconstrucción de zonas para odontograma dental (no hay parser de
    // vuelta desde `toothNumber` para ese caso) — el ítem se sigue mostrando
    // en la lista, solo no marca sus piezas en el odontograma.
    odontogramMode: odontogramSelection.length > 0 ? 'tooth' : 'session',
    odontogramSelection,
    notes: item.notes ?? undefined,
    productName: item.productName ?? undefined,
    productLot: item.productLot ?? undefined,
    productExpiresAt: item.productExpiresAt ?? undefined,
    productQuantity: item.productQuantity ?? undefined,
    existing: true,
  };
}

const STEPS = [
  { key: 1, label: 'Datos administrativos' },
  { key: 2, label: 'Prestaciones' },
  { key: 3, label: 'Totales y forma de pago' },
] as const;

const PAYMENT_METHODS = ['Contado', 'Cuotas'];

function convenioPrice(listPrice: number, discountPercent: number) {
  return Math.round(listPrice * (1 - discountPercent / 100));
}

// Si la prestación tiene precio distinto por zona (ej. Botox: Cuello $X,
// Frente $Y — ver Catálogo), el precio de lista es la suma de las zonas
// elegidas; si no, es el precio único de siempre sin importar cuántas zonas
// se marquen (pensado para "un mismo implemento cubre varias zonas").
function listPriceForPrestacion(prestacion: Prestacion, selection: ToothSelection[]): number {
  if (!prestacion.zonePrices) return prestacion.basePrice;
  const zones = Array.from(new Set(selection.map((s) => s.tooth)));
  if (zones.length === 0) return prestacion.basePrice;
  return zones.reduce((sum, zone) => sum + (prestacion.zonePrices![zone] ?? prestacion.basePrice), 0);
}

// Compartido entre el alta manual (handleConfirmActive) y el alta automática
// (handlePickPrestacion, cuando la zona ya es inequívoca) para no duplicar el
// cálculo de precio/descuento al construir la fila de "Prestaciones Agregadas".
function buildCatalogRow(
  isEstetica: boolean,
  prestacion: Prestacion,
  mode: OdontogramMode,
  selection: ToothSelection[],
  color: string | undefined,
  discount: number,
  extras?: { notes?: string; productName?: string; productLot?: string; productExpiresAt?: string; productQuantity?: string }
): ItemRow {
  const listPrice = listPriceForPrestacion(prestacion, selection);
  const cost = convenioPrice(listPrice, discount);
  return {
    key: `${prestacion.id}-${Date.now()}`,
    prestacionId: prestacion.id,
    description: prestacion.name,
    toothNumber: locationForBackend(isEstetica, mode, selection),
    listPrice,
    convenioDiscountPercent: discount,
    cost,
    odontogramMode: mode,
    odontogramSelection: selection,
    odontogramColor: color,
    notes: extras?.notes,
    productName: extras?.productName,
    productLot: extras?.productLot,
    productExpiresAt: extras?.productExpiresAt,
    productQuantity: extras?.productQuantity,
  };
}

export function TreatmentPlanFormModal({ patient, onClose, onSaved, editingPlan = null }: TreatmentPlanFormModalProps) {
  const patientId = patient.id;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const clinicaTipo = user?.clinicaTipo;
  const clinicaOfreceAmbas = clinicaTipo === 'ambas';
  const [diagramType, setDiagramType] = useState<'dental' | 'estetica'>(
    editingPlan?.diagramType ?? (clinicaTipo === 'estetica' ? 'estetica' : 'dental')
  );
  const isEstetica = clinicaOfreceAmbas ? diagramType === 'estetica' : clinicaTipo === 'estetica';

  // Modificando un presupuesto existente: se salta directo a "Prestaciones"
  // (sucursal/convenio/previsión/pago quedan fijos, no son editables aquí).
  const [step, setStep] = useState<1 | 2 | 3>(editingPlan ? 2 : 1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [professionals, setProfessionals] = useState<StaffUser[]>([]);
  const [professionalId, setProfessionalId] = useState(editingPlan?.professionalId ?? '');
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState(editingPlan?.sucursalId ?? '');
  const [previsiones, setPrevisiones] = useState<Prevision[]>([]);
  const [previsionId, setPrevisionId] = useState(editingPlan?.previsionId ?? '');
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [convenioId, setConvenioId] = useState(editingPlan?.convenioId ?? '');

  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [prestacionSearch, setPrestacionSearch] = useState('');

  // Prestación (o item personalizado) que se está configurando ahora mismo en
  // el odontograma — separado de `items`, que son las prestaciones ya agregadas.
  const [activePrestacion, setActivePrestacion] = useState<Prestacion | null>(null);
  const [isCustomActive, setIsCustomActive] = useState(false);
  const [activeMode, setActiveMode] = useState<OdontogramMode | null>(null);
  const [draftSelection, setDraftSelection] = useState<ToothSelection[]>([]);
  const [activeColor, setActiveColor] = useState<string | undefined>(undefined);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftProductName, setDraftProductName] = useState('');
  const [draftProductLot, setDraftProductLot] = useState('');
  const [draftProductExpiresAt, setDraftProductExpiresAt] = useState('');
  const [draftProductQuantity, setDraftProductQuantity] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [conflictingAllergies, setConflictingAllergies] = useState<AllergyKey[]>([]);
  const [facialAnnotations, setFacialAnnotations] = useState<FacialAnnotations>(
    editingPlan?.facialAnnotations ?? EMPTY_FACIAL_ANNOTATIONS
  );
  const [facialGender, setFacialGender] = useState<FacialGender>(editingPlan?.facialGender ?? 'mujer');
  // Se incrementa cada vez que se empieza a configurar una prestación nueva —
  // le dice a FacialMap que vuelva la herramienta de dibujo a "puntero", para
  // que un círculo/lápiz que quedó seleccionado no tape el clic con el que se
  // elige la zona (ver FacialMap.tsx, useDrawing).
  const [toolResetTrigger, setToolResetTrigger] = useState(0);

  const [prestacionesTab, setPrestacionesTab] = useState<'prestaciones' | 'plantilla'>('prestaciones');
  const [pendingPhotos, setPendingPhotos] = useState<{ key: string; blob: Blob; previewUrl: string; label: string }[]>([]);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPhotoZone, setPendingPhotoZone] = useState<FacialZoneKey>(FACIAL_ZONES[0]);
  const [pendingPhotoMoment, setPendingPhotoMoment] = useState<'Antes' | 'Después'>('Antes');
  const pendingPhotosRef = useRef(pendingPhotos);
  pendingPhotosRef.current = pendingPhotos;

  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const [items, setItems] = useState<ItemRow[]>(
    () => editingPlan?.items.map((i) => existingItemToRow(i, editingPlan.diagramType === 'estetica')) ?? []
  );
  const [lastAddedKeys, setLastAddedKeys] = useState<string[]>([]);
  const [, setShowCustomItem] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [customCost, setCustomCost] = useState('');
  const [, setCustomMode] = useState<OdontogramMode>('tooth');

  const [name, setName] = useState(editingPlan?.name ?? '');
  const [paymentMethod, setPaymentMethod] = useState(editingPlan?.paymentMethod ?? PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState(editingPlan?.notes ?? '');

  useEffect(() => {
    if (isAdmin) fetchUsers().then(setProfessionals).catch(() => undefined);
    fetchSucursales().then(setSucursales).catch(() => undefined);
    fetchPrevisiones().then(setPrevisiones).catch(() => undefined);
    fetchConvenios().then(setConvenios).catch(() => undefined);
    fetchPrestaciones().then(setPrestaciones).catch(() => undefined);
  }, [isAdmin]);

  const selectedConvenio = convenios.find((c) => c.id === convenioId) ?? null;

  const filteredPrestaciones = useMemo(() => {
    const q = prestacionSearch.trim().toLowerCase();
    if (!q) return [];
    return prestaciones.filter((p) => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)).slice(0, 8);
  }, [prestacionSearch, prestaciones]);

  const total = items.reduce((sum, i) => sum + i.cost, 0);

  // Las marcas persistentes del odontograma se derivan de las prestaciones ya
  // agregadas: al eliminar una fila, sus marcas desaparecen automáticamente
  // sin necesidad de un estado de marcas separado que mantener sincronizado.
  const odontogramMarks = useMemo(() => items.flatMap(createMarksFromItem), [items]);

  function resetActive() {
    setActivePrestacion(null);
    setIsCustomActive(false);
    setActiveMode(null);
    setDraftSelection([]);
    setActiveColor(undefined);
    setDraftNotes('');
    setDraftProductName('');
    setDraftProductLot('');
    setDraftProductExpiresAt('');
    setDraftProductQuantity('');
    setDraftError(null);
    setConflictingAllergies([]);
    setToolResetTrigger((t) => t + 1);
  }

  function handlePickPrestacion(prestacion: Prestacion) {
    setPrestacionSearch('');
    const config = pickConfig(isEstetica, prestacion);
    const selection = selectionFromDefaults(config.defaultTeeth, config.defaultSurfaces);
    const detected = detectAllergensInPrestacion(prestacion.name);
    const allergyConflicts = detected.filter((a) => patient.allergies.includes(a));

    // Si la zona a aplicar ya es inequívoca (única zona permitida, varias que
    // siempre se aplican juntas, o toda la boca/rostro — `getFacialConfig`/
    // `getOdontogramConfig` la devuelven como `defaultTeeth` o `mode:'session'`),
    // se agrega directo a "Prestaciones Agregadas" sin pedir el clic manual en
    // "Agregar prestación". Alergia en conflicto o falta de trazabilidad de
    // producto sí requieren revisión manual (ver handleConfirmActive).
    const isUnambiguous = config.mode === 'session' || config.defaultTeeth !== undefined;
    if (isUnambiguous && allergyConflicts.length === 0 && !prestacion.requiresProductTracking) {
      const discount = selectedConvenio?.discountPercent ?? 0;
      const row = buildCatalogRow(isEstetica, prestacion, config.mode, selection, config.markColor, discount);
      setItems((prev) => [...prev, row]);
      setLastAddedKeys([row.key]);
      resetActive();
      return;
    }

    setActivePrestacion(prestacion);
    setIsCustomActive(false);
    setActiveMode(config.mode);
    setDraftSelection(selection);
    setActiveColor(config.markColor);
    setDraftNotes('');
    setDraftProductName('');
    setDraftProductLot('');
    setDraftProductExpiresAt('');
    setDraftProductQuantity('');
    setDraftError(null);
    setConflictingAllergies(allergyConflicts);
    setToolResetTrigger((t) => t + 1);
  }


  function handleCustomModeChange(mode: OdontogramMode) {
    setCustomMode(mode);
    setActiveMode(mode);
    setDraftSelection([]);
    setDraftError(null);
  }

  function handleConfirmActive() {
    if (!activeMode) return;
    if (activeMode !== 'session' && draftSelection.length === 0) {
      setDraftError(
        activeMode === 'surface'
          ? 'Selecciona al menos una cara antes de agregar la prestación.'
          : isEstetica
            ? 'Selecciona al menos una zona antes de agregar la prestación.'
            : 'Selecciona al menos una pieza antes de agregar la prestación.'
      );
      return;
    }

    if (!isCustomActive && activePrestacion?.requiresProductTracking && !draftProductName.trim()) {
      setDraftError('Esta prestación requiere registrar el producto y su lote antes de agregarla.');
      return;
    }

    const discount = selectedConvenio?.discountPercent ?? 0;

    if (isCustomActive) {
      if (!customDescription.trim()) {
        setDraftError('Escribe una descripción para la prestación.');
        return;
      }
      const cost = Number(customCost) || 0;
      const row: ItemRow = {
        key: `custom-${Date.now()}`,
        description: customDescription.trim(),
        toothNumber: locationForBackend(isEstetica, activeMode, draftSelection),
        listPrice: cost,
        convenioDiscountPercent: 0,
        cost,
        odontogramMode: activeMode,
        odontogramSelection: draftSelection,
        notes: draftNotes.trim() || undefined,
        productName: draftProductName.trim() || undefined,
        productLot: draftProductLot.trim() || undefined,
        productExpiresAt: draftProductExpiresAt || undefined,
        productQuantity: draftProductQuantity.trim() || undefined,
      };
      setItems((prev) => [...prev, row]);
      setLastAddedKeys([row.key]);
      setCustomDescription('');
      setCustomCost('');
      setShowCustomItem(false);
      resetActive();
      return;
    }

    if (!activePrestacion) return;
    // El precio de catálogo es por pieza/zona, no por presupuesto completo:
    // si se marcaron varias piezas en un modo que se cobra por pieza (pieza
    // completa/cara/extracción), se agrega una línea por cada una en vez de
    // una sola con todas adentro. Los modos de grupo (cuadrante/sextante/
    // arcada/sesión) siguen siendo una sola línea, porque ahí el precio ya
    // es por el grupo completo. El mapa facial no se separa así: cuando hay
    // varias zonas con precio propio (`zonePrices`), van en una sola línea
    // cuyo total es la suma de esas zonas (ver listPriceForPrestacion).
    const extras = {
      notes: draftNotes.trim() || undefined,
      productName: draftProductName.trim() || undefined,
      productLot: draftProductLot.trim() || undefined,
      productExpiresAt: draftProductExpiresAt || undefined,
      productQuantity: draftProductQuantity.trim() || undefined,
    };
    if (isEstetica) {
      const row = buildCatalogRow(isEstetica, activePrestacion, activeMode, draftSelection, activeColor, discount, extras);
      setItems((prev) => [...prev, row]);
      setLastAddedKeys([row.key]);
      resetActive();
      return;
    }
    const perUnitModes: OdontogramMode[] = ['tooth', 'extraction', 'surface'];
    const groups = perUnitModes.includes(activeMode) ? splitSelectionByTooth(draftSelection) : [draftSelection];
    const newRows: ItemRow[] = groups.map((group, index) => ({
      ...buildCatalogRow(isEstetica, activePrestacion, activeMode, group, activeColor, discount, extras),
      key: `${activePrestacion.id}-${Date.now()}-${index}`,
    }));
    setItems((prev) => [...prev, ...newRows]);
    setLastAddedKeys(newRows.map((r) => r.key));
    resetActive();
  }

  function handleCancelActive() {
    resetActive();
  }

  function updateItemCost(key: string, value: string) {
    const cost = Number(value) || 0;
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, cost } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
    setLastAddedKeys((prev) => prev.filter((k) => k !== key));
  }

  function goToStep2() {
    if (!sucursalId) {
      setError('Selecciona una clínica');
      return;
    }
    if (!convenioId) {
      setError('Selecciona un convenio');
      return;
    }
    setError(null);
    setStep(2);
  }

  function goToStep3() {
    if (items.length === 0) {
      setError('Agrega al menos una prestación');
      return;
    }
    setError(null);
    setStep(3);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const itemInputs: TreatmentItemInput[] = items.map((i) => ({
        description: i.description,
        cost: i.cost,
        prestacionId: i.prestacionId,
        toothNumber: i.toothNumber ?? undefined,
        listPrice: i.listPrice,
        convenioDiscountPercent: i.convenioDiscountPercent,
        notes: i.notes,
        productName: i.productName,
        productLot: i.productLot,
        productExpiresAt: i.productExpiresAt,
        productQuantity: i.productQuantity,
      }));

      let plan = await createTreatmentPlan({
        patientId,
        professionalId: isAdmin && professionalId ? professionalId : undefined,
        sucursalId,
        previsionId: previsionId || undefined,
        convenioId,
        name: name || undefined,
        paymentMethod,
        notes: notes || undefined,
        diagramType: clinicaOfreceAmbas ? diagramType : undefined,
        items: itemInputs,
        facialAnnotations: isEstetica ? facialAnnotations : undefined,
        facialGender: isEstetica ? facialGender : undefined,
      });

      // Las fotos de la plantilla se editan localmente (sin id de plan aún)
      // y se suben recién ahora que el presupuesto ya existe.
      for (const photo of pendingPhotos) {
        plan = await uploadTreatmentPlanPhoto(plan.id, photo.blob, photo.label);
      }

      onSaved(plan);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el presupuesto'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Modificar un presupuesto existente solo agrega prestaciones nuevas — las
  // que ya estaban (`existing`) no se reenvían, cada una nueva se agrega con
  // su propia llamada (mismo endpoint que "Agregar procedimiento" del detalle).
  async function handleSaveEdits() {
    if (!editingPlan) return;
    const newItems = items.filter((i) => !i.existing);
    if (newItems.length === 0) {
      setError('Agrega al menos una prestación nueva');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      let plan = editingPlan;
      for (const i of newItems) {
        plan = await addTreatmentItem(editingPlan.id, {
          description: i.description,
          cost: i.cost,
          prestacionId: i.prestacionId,
          toothNumber: i.toothNumber ?? undefined,
          listPrice: i.listPrice,
          convenioDiscountPercent: i.convenioDiscountPercent,
          notes: i.notes,
          productName: i.productName,
          productLot: i.productLot,
          productExpiresAt: i.productExpiresAt,
          productQuantity: i.productQuantity,
        });
      }
      onSaved(plan);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron agregar las prestaciones nuevas'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const showActiveBanner = !isCustomActive && activePrestacion !== null && activeMode !== null;

  return (
    <Modal
      title={editingPlan ? `Modificar presupuesto Nº${editingPlan.number}` : 'Nuevo presupuesto'}
      onClose={onClose}
      maxWidth="max-w-[1700px]"
    >
      <div className="flex flex-col gap-5">
        {editingPlan ? (
          <p className="text-xs text-slate-500">
            Sucursal, convenio, previsión y forma de pago quedan fijos — acá solo se agregan prestaciones nuevas.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            {STEPS.map((s, idx) => (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      step === s.key
                        ? 'bg-brand-600 text-white'
                        : step > s.key
                          ? 'bg-brand-100 text-brand-600'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step > s.key ? <CheckIcon className="h-3.5 w-3.5" /> : s.key}
                  </span>
                  <span className={`text-xs font-medium ${step === s.key ? 'text-slate-800' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && <div className="h-px flex-1 bg-slate-200" />}
              </div>
            ))}
          </div>
        )}

        {step === 1 && !editingPlan && (
          <div className="flex flex-col gap-4">
            {clinicaOfreceAmbas && (
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Tipo de diagrama <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 inline-flex rounded-lg border border-slate-300 p-1">
                  {(
                    [
                      { value: 'dental' as const, label: 'Odontograma' },
                      { value: 'estetica' as const, label: 'Mapa facial' },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={items.length > 0}
                      onClick={() => setDiagramType(opt.value)}
                      title={items.length > 0 ? 'No se puede cambiar con prestaciones ya agregadas' : undefined}
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        diagramType === opt.value ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Este holding ofrece ambos tipos de atención — elige qué diagrama usará este presupuesto.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Clínica <span className="text-red-500">*</span>
                </label>
                <select
                  value={sucursalId}
                  onChange={(e) => setSucursalId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                >
                  <option value="">Selecciona...</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Previsión</label>
                <select
                  value={previsionId}
                  onChange={(e) => setPrevisionId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                >
                  <option value="">Sin especificar</option>
                  {previsiones.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Convenio <span className="text-red-500">*</span>
                </label>
                <select
                  value={convenioId}
                  onChange={(e) => setConvenioId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                >
                  <option value="">Selecciona...</option>
                  {convenios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.discountPercent > 0 ? `(-${c.discountPercent}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>

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
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
            <div className="flex flex-col gap-4 lg:col-span-3">
              {isEstetica && (
                <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setPrestacionesTab('prestaciones')}
                    className={`rounded-md px-3 py-1.5 transition-colors ${
                      prestacionesTab === 'prestaciones' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Tratamiento
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrestacionesTab('plantilla')}
                    className={`rounded-md px-3 py-1.5 transition-colors ${
                      prestacionesTab === 'plantilla' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Plantilla fotográfica
                  </button>
                </div>
              )}

              {isEstetica && prestacionesTab === 'plantilla' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      Estas fotos se subirán junto con el presupuesto al presionar "Crear presupuesto".
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={pendingPhotoZone}
                        onChange={(e) => setPendingPhotoZone(e.target.value as FacialZoneKey)}
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
                            onClick={() => setPendingPhotoMoment(l)}
                            className={`rounded-md px-2 py-0.5 transition-colors ${
                              pendingPhotoMoment === l ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {pendingPhotos.map((photo) => (
                      <div key={photo.key} className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-slate-200">
                        <img src={photo.previewUrl} alt={photo.label} className="h-full w-full object-cover" />
                        <span className="absolute bottom-1 left-1 rounded bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {photo.label}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingPhotos((prev) => {
                              const removed = prev.find((p) => p.key === photo.key);
                              if (removed) URL.revokeObjectURL(removed.previewUrl);
                              return prev.filter((p) => p.key !== photo.key);
                            })
                          }
                          aria-label="Eliminar foto"
                          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <input
                      id="plantilla-photo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPendingPhotoFile(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('plantilla-photo-input')?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600"
                    >
                      <PlusIcon className="h-5 w-5" />
                      <span className="text-[11px] font-medium">Agregar ({FACIAL_ZONE_LABELS[pendingPhotoZone]})</span>
                    </button>
                  </div>
                  {pendingPhotoFile && (
                    <PhotoEditorModal
                      file={pendingPhotoFile}
                      onClose={() => setPendingPhotoFile(null)}
                      onConfirm={(blob) => {
                        const label = `${FACIAL_ZONE_LABELS[pendingPhotoZone]} — ${pendingPhotoMoment}`;
                        setPendingPhotos((prev) => [
                          ...prev,
                          { key: `photo-${Date.now()}`, blob, previewUrl: URL.createObjectURL(blob), label },
                        ]);
                        setPendingPhotoFile(null);
                      }}
                    />
                  )}
                </div>
              ) : (
                <>
              <div className="relative">
                <label className="text-sm font-medium text-slate-700">Buscar prestación</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={prestacionSearch}
                      onChange={(e) => setPrestacionSearch(e.target.value)}
                      placeholder={
                        isEstetica ? 'Ej: botox, ácido hialurónico, rinomodelación...' : 'Ej: destartraje, resina, corona...'
                      }
                      className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                    />
                  </div>
                  <button
                    type="button"
                    disabled
                    title="Próximamente"
                    className="shrink-0 cursor-not-allowed rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
                  >
                    Avanzada
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Próximamente"
                    className="shrink-0 cursor-not-allowed rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
                  >
                    Plantillas
                  </button>
                </div>
                {filteredPrestaciones.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredPrestaciones.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePickPrestacion(p)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                      >
                        <span className="text-slate-700">{p.name}</span>
                        <span className="text-slate-500">{p.zonePrices ? 'Precio según zona' : formatCLP(p.basePrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {conflictingAllergies.length > 0 && (
                <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700 ring-1 ring-red-200">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                    Este paciente es alérgico a: {conflictingAllergies.map((a) => ALLERGY_LABEL[a]).join(', ')}. Verifica antes de continuar.
                  </p>
                  {patient.allergyNotes && <p className="mt-1">{patient.allergyNotes}</p>}
                </div>
              )}

              {showActiveBanner && activePrestacion && activeMode && (
                <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  <p className="font-semibold">Prestación seleccionada: {activePrestacion.name}</p>
                  <p className="mt-0.5">
                    {isEstetica ? MODE_INSTRUCTIONS_ESTETICA[activeMode] : MODE_INSTRUCTIONS[activeMode]}
                  </p>
                  {draftSelection.length > 0 && (
                    <p className="mt-1 font-medium">{selectionLabel(isEstetica, activeMode, draftSelection)}</p>
                  )}
                  {draftError && <p className="mt-1 font-medium text-red-600">{draftError}</p>}
                  {activePrestacion.requiresProductTracking && !draftProductName.trim() && (
                    <p className="mt-1 flex items-center gap-1 font-semibold text-red-600">
                      <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                      Esta prestación requiere registrar el producto y su lote (trazabilidad).
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    <input
                      value={draftProductName}
                      onChange={(e) => setDraftProductName(e.target.value)}
                      placeholder="Producto (ej. Ácido Hialurónico)"
                      className={`rounded-md border bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 ${
                        activePrestacion.requiresProductTracking && !draftProductName.trim() ? 'border-red-300' : 'border-amber-200'
                      }`}
                    />
                    <input
                      value={draftProductLot}
                      onChange={(e) => setDraftProductLot(e.target.value)}
                      placeholder="N° de lote"
                      className="rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                    />
                    <input
                      type="date"
                      value={draftProductExpiresAt}
                      onChange={(e) => setDraftProductExpiresAt(e.target.value)}
                      title="Fecha de vencimiento"
                      className="rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                    />
                    <input
                      value={draftProductQuantity}
                      onChange={(e) => setDraftProductQuantity(e.target.value)}
                      placeholder="Cantidad (ej. 1 jeringa 1ml)"
                      className="rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                    />
                  </div>
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Notas clínicas (ej. reacción del paciente)..."
                    rows={2}
                    className="mt-2 w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCancelActive}
                      className="rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmActive}
                      className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      Agregar prestación
                    </button>
                  </div>
                </div>
              )}

              {isEstetica ? (
                <FacialMap
                  mode={activeMode ?? 'session'}
                  selection={draftSelection}
                  onSelectionChange={setDraftSelection}
                  marks={odontogramMarks}
                  onModeChange={isCustomActive ? handleCustomModeChange : undefined}
                  allowedModes={isCustomActive || !activeMode ? undefined : [activeMode]}
                  allowedZones={!isCustomActive ? activePrestacion?.allowedZones : undefined}
                  showZones={activeMode !== null}
                  annotations={facialAnnotations}
                  onAnnotationsChange={setFacialAnnotations}
                  gender={facialGender}
                  onGenderChange={setFacialGender}
                  resetToolTrigger={toolResetTrigger}
                />
              ) : (
                <Odontogram
                  mode={activeMode ?? 'session'}
                  selection={draftSelection}
                  onSelectionChange={setDraftSelection}
                  marks={odontogramMarks}
                  onModeChange={isCustomActive ? handleCustomModeChange : undefined}
                  allowedModes={isCustomActive || !activeMode ? undefined : [activeMode]}
                />
              )}

                </>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:col-span-1">
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Convenio actual</p>
                <p className="text-sm font-semibold text-slate-700">
                  {selectedConvenio ? selectedConvenio.name : 'Sin convenio'}
                  {selectedConvenio && selectedConvenio.discountPercent > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-brand-600">-{selectedConvenio.discountPercent}%</span>
                  )}
                </p>
              </div>

              <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                <p className="bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Prestaciones agregadas
                </p>

                <div className="divide-y divide-slate-100">
                  {items.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-slate-400">Aún no hay prestaciones agregadas.</p>
                  )}
                  {items.map((item) => (
                    <div
                      key={item.key}
                      onClick={() => setLastAddedKeys([item.key])}
                      className={`flex cursor-pointer flex-col gap-2 px-3 py-2.5 transition-colors ${
                        lastAddedKeys.includes(item.key) ? 'bg-amber-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {areaLabelFor(isEstetica, item.odontogramMode)}
                            {item.existing && (
                              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-500">
                                Ya en el presupuesto
                              </span>
                            )}
                          </p>
                          <p className="break-words text-sm font-medium text-slate-700">
                            {item.description}
                            {item.convenioDiscountPercent > 0 && (
                              <span className="ml-1 text-xs text-brand-600">-{item.convenioDiscountPercent}%</span>
                            )}
                          </p>
                          <p className="mt-0.5 break-words text-xs text-slate-400">{detailLabel(item, isEstetica)}</p>
                        </div>
                        {!item.existing && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(item.key);
                            }}
                            aria-label="Quitar"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={item.cost}
                        disabled={item.existing}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateItemCost(item.key, e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>
                  ))}
                </div>

                {items.length > 0 && (
                  <div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-600">Total</span>
                    <span className="text-sm font-bold text-brand-600">{formatCLP(total)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && !editingPlan && (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Prestación</th>
                    <th className="px-3 py-2 text-left">Área</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-right">Dcto convenio</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.key}>
                      <td className="px-3 py-2 text-slate-700">{item.description}</td>
                      <td className="px-3 py-2 text-slate-500">
                        {areaLabelFor(isEstetica, item.odontogramMode)}
                        <div className="text-xs text-slate-400">{detailLabel(item, isEstetica)}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">{formatCLP(item.listPrice)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">
                        {item.convenioDiscountPercent > 0 ? `-${item.convenioDiscountPercent}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatCLP(item.cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold text-slate-600">
                      Total presupuesto
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-brand-600">{formatCLP(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="plan-name" className="text-sm font-medium text-slate-700">
                  Nombre del presupuesto
                </label>
                <input
                  id="plan-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Plan rehabilitación oral"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                />
              </div>
              <div>
                <label htmlFor="plan-payment" className="text-sm font-medium text-slate-700">
                  Forma de pago
                </label>
                <select
                  id="plan-payment"
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
              <div className="sm:col-span-2 lg:col-span-1">
                <label htmlFor="plan-notes" className="text-sm font-medium text-slate-700">
                  Observaciones generales
                </label>
                <textarea
                  id="plan-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={1}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                />
              </div>
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => (step === 1 || editingPlan ? onClose() : setStep((s) => ((s - 1) as 1 | 2 | 3)))}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {step === 1 || editingPlan ? 'Cancelar' : 'Prev'}
          </button>

          {editingPlan ? (
            <button
              type="button"
              onClick={handleSaveEdits}
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          ) : (
            <>
              {step === 1 && (
                <button
                  type="button"
                  onClick={goToStep2}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Siguiente
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  onClick={goToStep3}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Siguiente
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Creando...' : 'Crear presupuesto'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
