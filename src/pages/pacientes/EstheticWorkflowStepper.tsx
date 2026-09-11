import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import type { DriveStep } from 'driver.js';
import type { Patient } from '../../api/patients';
import { fetchTreatmentPlans } from '../../api/treatmentPlans';
import { fetchConsentTypes, fetchPatientConsents } from '../../api/dataConsents';
import { fetchPrestaciones } from '../../api/catalogs';
import { CheckIcon } from '../../components/icons';
import { TourButton } from '../../components/TourButton';

export type EstheticStepKey =
  | 'datos'
  | 'examen'
  | 'horas'
  | 'tratamiento'
  | 'evoluciones'
  | 'cartola'
  | 'observaciones'
  | 'documentos'
  | 'rx'
  | 'consentimientos';

export type EstheticStepTab = {
  key: EstheticStepKey;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

// Estos 5 son el flujo clínico real que dictó Urbina (reunión 2/9) — avisan
// si no están completos, pero NUNCA bloquean el acceso (ver conversación
// posterior: el usuario pidió que la advertencia sea informativa, no un
// candado). El resto (Horas, Cartola, Observaciones, Documentos clínicos,
// Módulo Rx) son paradas opcionales, sin ningún chequeo de progreso.
const REQUIRED_KEYS = new Set<EstheticStepKey>(['datos', 'examen', 'tratamiento', 'evoluciones', 'consentimientos']);

function missingDetail(key: EstheticStepKey): string {
  switch (key) {
    case 'datos':
      return 'falta el motivo de consulta y/o que el profesional confirme los datos del paciente';
    case 'examen':
      return 'falta completar el examen estético (tipo de piel, fototipo, etc.)';
    case 'tratamiento':
      return 'falta agregar al menos un ítem al plan de tratamiento';
    case 'evoluciones':
      return 'falta marcar alguna evolución del tratamiento como iniciada';
    case 'consentimientos':
      return 'falta al menos un consentimiento firmado';
    default:
      return 'falta completar este paso';
  }
}

const TOUR_STEPS: DriveStep[] = [
  {
    element: '#etapa-stepper',
    popover: {
      title: 'Flujo guiado de Estética',
      description:
        'Este recorrido explica cada sección del sistema, una por una. Los pasos marcados como obligatorios (Datos, Examen, Tratamiento, Evoluciones, Consentimientos) muestran una advertencia si intentas avanzar sin completarlos — pero igual te dejan entrar, no es un candado. Los demás son opcionales y están siempre disponibles.',
      side: 'bottom',
    },
  },
  {
    element: '#datos-corroboracion-card',
    popover: {
      title: '1 · Confirmar datos del paciente (obligatorio)',
      description:
        'Recepción puede cargar nombre, RUT, fecha de nacimiento y contacto — pero el profesional tiene que repasarlos con el paciente presente y presionar este botón antes de avanzar. Si después alguien edita esos datos, la confirmación se borra sola y hay que repetirla.',
      side: 'bottom',
    },
  },
  {
    element: '#motivo-consulta-card',
    popover: {
      title: '1 · Datos y motivo (obligatorio)',
      description:
        'El motivo de consulta se recomienda completarlo el profesional durante la atención — se puede grabar por voz como respaldo (requiere que el paciente haya firmado antes el consentimiento de grabación).',
      side: 'bottom',
    },
  },
  {
    element: '#examen-estetico-card',
    popover: {
      title: '2 · Examen estético (obligatorio)',
      description:
        'Tipo de piel, fototipo de Fitzpatrick, arrugas, flacidez, volumen, asimetrías y otros hallazgos — todo por selección. Fotos clínicas (frontal, perfiles, 45°) y diagnóstico con dictado por voz.',
      side: 'bottom',
    },
  },
  {
    element: '#etapa-step-horas',
    popover: {
      title: 'Horas (opcional)',
      description: 'Horas disponibles agendadas para este paciente. No bloquea nada — se usa cuando haga falta.',
      side: 'bottom',
    },
  },
  {
    element: '#tratamiento-card',
    popover: {
      title: '3 · Tratamiento (obligatorio)',
      description:
        'Arma el presupuesto eligiendo el tercio facial (Superior, Medio o Inferior) con el botón "Elegir por tercio" — no hace falta marcar zona por zona. Después se agrega el producto del catálogo y la cantidad aplicada. Importante: si el Catálogo no tiene prestaciones estéticas cargadas todavía, hay que agregarlas primero en Catálogo → Prestaciones antes de poder armar el presupuesto.',
      side: 'bottom',
    },
  },
  {
    element: '#evoluciones-card',
    popover: {
      title: '4 · Evoluciones (obligatorio)',
      description: 'Documenta la ejecución real de cada sesión del plan — qué se hizo, cuándo, y las observaciones clínicas correspondientes.',
      side: 'bottom',
    },
  },
  {
    element: '#etapa-step-cartola',
    popover: {
      title: 'Cartola (opcional)',
      description: 'Estado de cuenta del paciente: abonos, saldos y movimientos de pago.',
      side: 'bottom',
    },
  },
  {
    element: '#etapa-step-observaciones',
    popover: {
      title: 'Observaciones (opcional)',
      description: 'Notas administrativas generales sobre el paciente, aparte de las clínicas.',
      side: 'bottom',
    },
  },
  {
    element: '#etapa-step-documentos',
    popover: {
      title: 'Documentos clínicos (opcional)',
      description: 'Archivos subidos del paciente: exámenes, recetas y otros documentos.',
      side: 'bottom',
    },
  },
  {
    element: '#etapa-step-rx',
    popover: {
      title: 'Módulo Rx (opcional)',
      description: 'Órdenes de imagenología (radiografías) enviadas al sistema Dimage.',
      side: 'bottom',
    },
  },
  {
    element: '#consentimientos-card',
    popover: {
      title: '5 · Consentimientos (obligatorio)',
      description: 'Último paso obligatorio: acá se gestionan y firman los consentimientos del paciente para el tratamiento.',
      side: 'bottom',
    },
  },
  {
    popover: {
      title: 'Listo',
      description:
        'Eso es todo el sistema. Este flujo completo funciona igual en cualquier clínica Estética o Ambas, sin configurar nada por clínica. Puedes cerrar este recorrido en cualquier momento e ir a hacer lo que necesites — el botón "Instrucciones" te va a esperar donde quedaste la próxima vez que lo abras.',
    },
  },
];

// Mismo orden/largo que TOUR_STEPS — permite saltar el recorrido directo a
// la explicación de UN paso específico (ver botón dentro de la advertencia)
// en vez de obligar al usuario a buscarla a mano con "Siguiente".
const TOUR_STEP_KEYS: (EstheticStepKey | null)[] = [
  null,
  'datos',
  'datos',
  'examen',
  'horas',
  'tratamiento',
  'evoluciones',
  'cartola',
  'observaciones',
  'documentos',
  'rx',
  'consentimientos',
  null,
];

function tourIndexFor(key: EstheticStepKey): number {
  const index = TOUR_STEP_KEYS.indexOf(key);
  return index === -1 ? 0 : index;
}

// Progreso derivado de datos que ya se cargan en otras pestañas — no se guarda
// ninguna columna nueva de "etapa actual" (mismo criterio que
// computeTreatmentStatus para el estado de un presupuesto). Solo se calcula
// para los 5 pasos obligatorios; los opcionales no tienen estado de progreso.
function useEstheticProgress(patient: Patient) {
  const [hasTreatmentItems, setHasTreatmentItems] = useState(false);
  const [hasStartedTreatment, setHasStartedTreatment] = useState(false);
  const [hasSignedConsent, setHasSignedConsent] = useState(false);
  const [prestacionesCount, setPrestacionesCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchTreatmentPlans(patient.id)
      .then((plans) => {
        if (cancelled) return;
        const estheticPlans = plans.filter((p) => p.diagramType === 'estetica');
        setHasTreatmentItems(estheticPlans.some((p) => p.items.length > 0));
        setHasStartedTreatment(estheticPlans.some((p) => p.status === 'en_tratamiento' || p.status === 'terminado'));
      })
      .catch(() => {
        if (!cancelled) {
          setHasTreatmentItems(false);
          setHasStartedTreatment(false);
        }
      });

    Promise.all([fetchConsentTypes(), fetchPatientConsents(patient.id)])
      .then(([, consents]) => {
        if (cancelled) return;
        setHasSignedConsent(consents.some((c) => c.status === 'firmado'));
      })
      .catch(() => {
        if (!cancelled) setHasSignedConsent(false);
      });

    fetchPrestaciones()
      .then((prestaciones) => {
        if (cancelled) return;
        setPrestacionesCount(prestaciones.filter((p) => p.category === 'estetica').length);
      })
      .catch(() => {
        if (!cancelled) setPrestacionesCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [patient.id]);

  // "Datos y motivo" no queda listo solo con el motivo de consulta — Urbina
  // fue explícito en que el médico tiene que corroborar los datos con el
  // paciente presente antes de avanzar (ver DatosCorroboracionCard).
  const datosComplete =
    Boolean(patient.motivoConsulta?.trim() || patient.motivoConsultaAudioUrl) && Boolean(patient.datosCorroboradosAt);
  const examenComplete = Boolean(patient.examFitzpatrick);

  const completed: Partial<Record<EstheticStepKey, boolean>> = {
    datos: datosComplete,
    examen: examenComplete,
    tratamiento: hasTreatmentItems,
    evoluciones: hasStartedTreatment,
    consentimientos: hasSignedConsent,
  };

  return { completed, prestacionesCount };
}

export function EstheticWorkflowStepper({
  patient,
  tabs,
  activeStep,
  onSelectStep,
}: {
  patient: Patient;
  tabs: EstheticStepTab[];
  activeStep: string;
  onSelectStep: (step: EstheticStepKey) => void;
}) {
  const { completed, prestacionesCount } = useEstheticProgress(patient);
  const [warning, setWarning] = useState<{ text: string; jumpKey: EstheticStepKey } | null>(null);
  const tourStorageKey = `etapa-tour:${patient.id}`;

  // El recorrido explica contenido real de cada pestaña (ej. la tarjeta
  // "Motivo de consulta"), no solo el botón de la barra — así que antes de
  // mostrar cada paso hay que cambiar a la pestaña correspondiente para que
  // ese contenido exista en pantalla (ver `waitForElement` en lib/tour.ts).
  function handleTourNavigate(tourIndex: number) {
    const key = TOUR_STEP_KEYS[tourIndex];
    if (key) onSelectStep(key);
  }

  useEffect(() => {
    if (!warning) return;
    const timer = window.setTimeout(() => setWarning(null), 10000);
    return () => window.clearTimeout(timer);
  }, [warning]);

  const activeIndex = tabs.findIndex((tab) => tab.key === activeStep);
  const nextTab = activeIndex >= 0 && activeIndex < tabs.length - 1 ? tabs[activeIndex + 1] : null;

  // Devuelve el detalle de todo lo que falta para llegar sin problemas al
  // paso `targetIndex` (pasos obligatorios anteriores sin completar, más —
  // solo para "tratamiento" — si el catálogo de prestaciones está vacío), y
  // cuál de esos pendientes conviene explicar primero (el más antiguo en el
  // flujo, para que el botón "Ver instrucciones" salte a lo más urgente).
  function issuesFor(targetIndex: number, targetKey: EstheticStepKey): { texts: string[]; firstKey: EstheticStepKey | null } {
    const missingTabs = tabs.slice(0, targetIndex).filter((tab) => REQUIRED_KEYS.has(tab.key) && !completed[tab.key]);
    const texts = missingTabs.map((tab) => `"${tab.label}": ${missingDetail(tab.key)}`);
    let firstKey: EstheticStepKey | null = missingTabs[0]?.key ?? null;

    if (targetKey === 'tratamiento' && prestacionesCount === 0) {
      texts.push('Catálogo: no hay prestaciones estéticas cargadas todavía — agrégalas en Catálogo → Prestaciones antes de armar el presupuesto.');
      firstKey = firstKey ?? 'tratamiento';
    }
    return { texts, firstKey };
  }

  function showIssuesIfAny(targetIndex: number, targetKey: EstheticStepKey) {
    const { texts, firstKey } = issuesFor(targetIndex, targetKey);
    if (texts.length > 0 && firstKey) {
      setWarning({ text: texts.join(' · '), jumpKey: firstKey });
    } else {
      setWarning(null);
    }
  }

  // Se permite entrar a cualquier paso siempre — la advertencia es solo
  // informativa, nunca un bloqueo (pedido explícito: "necesito que sí puedan
  // acceder aunque no estén hechos los datos, pero la advertencia debería
  // aparecer igual, más detallada").
  function handleStepClick(index: number, tab: EstheticStepTab) {
    showIssuesIfAny(index, tab.key);
    onSelectStep(tab.key);
  }

  function handleNextClick() {
    if (!nextTab) return;
    const nextIndex = activeIndex + 1;
    showIssuesIfAny(nextIndex, nextTab.key);
    onSelectStep(nextTab.key);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        id="etapa-stepper"
        className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-white p-3 shadow-sm ring-1 ring-brand-200"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeStep === tab.key;
          const isDone = Boolean(completed[tab.key]);
          const isOptional = !REQUIRED_KEYS.has(tab.key);
          return (
            <div key={tab.key} className="flex shrink-0 items-center">
              {index > 0 && <div className="mx-1 h-px w-6 shrink-0 bg-slate-200" />}
              <button
                type="button"
                id={`etapa-step-${tab.key}`}
                onClick={() => handleStepClick(index, tab)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                    : isDone
                      ? 'text-brand-700 hover:bg-brand-50'
                      : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    isActive ? 'bg-white/25 text-white' : isDone ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isDone ? <CheckIcon className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </span>
                {tab.label}
                {isOptional && <span className="text-[10px] font-normal uppercase tracking-wide text-slate-400">Opcional</span>}
              </button>
            </div>
          );
        })}
        {nextTab && (
          <button
            type="button"
            onClick={handleNextClick}
            className="ml-auto shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition-colors hover:bg-brand-700"
          >
            Siguiente: {nextTab.label} ›
          </button>
        )}
      </div>

      {warning && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
          <span>⚠️</span>
          <span className="flex-1">{warning.text}</span>
          <TourButton
            steps={TOUR_STEPS}
            storageKey={tourStorageKey}
            forceStartAt={tourIndexFor(warning.jumpKey)}
            onNavigate={handleTourNavigate}
            label="Ver instrucciones"
            className="shrink-0 flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          />
        </div>
      )}

      <TourButton steps={TOUR_STEPS} storageKey={tourStorageKey} onNavigate={handleTourNavigate} floating />
    </div>
  );
}
