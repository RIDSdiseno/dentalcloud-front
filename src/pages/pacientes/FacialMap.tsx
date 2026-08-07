import { useEffect, useRef, useState, type ComponentType, type RefObject, type SVGProps } from 'react';
import type { OdontogramMark, OdontogramMode, ToothSelection } from './Odontogram';
import {
  FACIAL_ZONES,
  FACIAL_ZONE_LABELS,
  EMPTY_FACIAL_ANNOTATIONS,
  type FacialZoneKey,
  type FacialAnnotations,
  type FacialPoint,
  type FacialStroke,
} from './facialZoneConfig';
import { CircleToolIcon, EraserIcon, LineToolIcon, PenIcon, PointerIcon, RedoIcon, UndoIcon } from '../../components/icons';

// ---------------------------------------------------------------------------
// Vista frontal: un par de fotos (piel/músculos) por género, mismo ángulo y
// encuadre dentro de cada par — provistas directamente para este componente,
// ya recortadas a una plantilla cuadrada y centrada. Al compartir encuadre
// dentro de un mismo género, piel y músculos usan la MISMA tabla de zonas;
// entre géneros la tabla cambia porque el recorte/proporciones no son iguales.
// ---------------------------------------------------------------------------
export type FacialGender = 'hombre' | 'mujer';

const FRONT_PHOTOS: Record<
  FacialGender,
  { muscleSrc: string; skinSrc: string; zones: Record<FacialZoneKey, { x: number; y: number }> }
> = {
  hombre: {
    muscleSrc: '/facial-map/man-muscle-layer-source.jpg',
    skinSrc: '/facial-map/man-skin-layer-source.jpg',
    zones: {
      frente: { x: 50.0, y: 19.2 },
      sienes: { x: 22.5, y: 27.5 },
      entrecejo: { x: 50.0, y: 33.5 },
      parpados: { x: 62.5, y: 38.3 },
      patas_gallo: { x: 77.0, y: 37.5 },
      ojeras: { x: 35.8, y: 41.7 },
      pomulos: { x: 70.8, y: 47.5 },
      nariz: { x: 50.0, y: 50.5 },
      nasogenianos: { x: 35.8, y: 60.8 },
      codigo_barras: { x: 50.0, y: 59.3 },
      labios: { x: 50.0, y: 67.2 },
      menton: { x: 50.0, y: 77.5 },
      mandibula: { x: 65.0, y: 71.0 },
      cuello: { x: 50.0, y: 91.0 },
    },
  },
  mujer: {
    muscleSrc: '/facial-map/woman-muscle-layer-source.jpg',
    skinSrc: '/facial-map/woman-skin-layer-source.jpg',
    zones: {
      frente: { x: 50.0, y: 11.7 },
      sienes: { x: 24.2, y: 21.7 },
      entrecejo: { x: 50.0, y: 28.5 },
      parpados: { x: 65.0, y: 32.5 },
      patas_gallo: { x: 75.5, y: 32.5 },
      ojeras: { x: 36.7, y: 35.8 },
      pomulos: { x: 72.5, y: 40.8 },
      nariz: { x: 50.0, y: 45.5 },
      nasogenianos: { x: 35.8, y: 56.7 },
      codigo_barras: { x: 50.0, y: 54.3 },
      labios: { x: 50.0, y: 62.2 },
      menton: { x: 50.0, y: 73.3 },
      mandibula: { x: 65.5, y: 66.5 },
      cuello: { x: 50.0, y: 89.5 },
    },
  },
};

// Tamaño aproximado (ancho/alto, en % del contenedor) de cada zona — se marca
// el área completa con una elipse punteada en vez de un punto, para que se
// entienda mejor qué región cubre cada zona (igual que las guías punteadas
// que usan los médicos para marcar antes de un procedimiento).
const ZONE_SHAPE: Record<FacialZoneKey, { w: number; h: number }> = {
  frente: { w: 36, h: 12 },
  sienes: { w: 10, h: 12 },
  entrecejo: { w: 8, h: 8 },
  parpados: { w: 9, h: 6 },
  patas_gallo: { w: 7, h: 7 },
  ojeras: { w: 11, h: 7 },
  pomulos: { w: 13, h: 9 },
  nariz: { w: 8, h: 12 },
  nasogenianos: { w: 7, h: 9 },
  codigo_barras: { w: 10, h: 6 },
  labios: { w: 14, h: 7 },
  menton: { w: 15, h: 11 },
  mandibula: { w: 15, h: 11 },
  cuello: { w: 26, h: 10 },
};

// ---------------------------------------------------------------------------
// Vista de perfil con foto real (solo "hombre" por ahora — dos fotos, una
// por lado, cada una con su propio par piel/músculo ya alineado entre sí).
// Para géneros sin fotos todavía (ver PROFILE_PHOTOS) se usa el cráneo
// esquemático (ProfilePanel, más abajo) como respaldo.
// ---------------------------------------------------------------------------
type ProfileSide = 'derecho' | 'izquierdo';
const PROFILE_ZONE_KEYS = [
  'frente',
  'sienes',
  'patas_gallo',
  'nariz',
  'pomulos',
  'nasogenianos',
  'codigo_barras',
  'labios',
  'menton',
  'mandibula',
  'cuello',
] as const satisfies readonly FacialZoneKey[];
type ProfileZoneKey = (typeof PROFILE_ZONE_KEYS)[number];

const PROFILE_ZONE_SHAPE: Record<ProfileZoneKey, { w: number; h: number }> = {
  frente: { w: 9, h: 7.5 },
  sienes: { w: 9, h: 7.5 },
  patas_gallo: { w: 8, h: 7 },
  nariz: { w: 8, h: 7 },
  pomulos: { w: 9, h: 7.5 },
  nasogenianos: { w: 8, h: 7 },
  codigo_barras: { w: 8, h: 7 },
  labios: { w: 9, h: 7.5 },
  menton: { w: 9, h: 7.5 },
  mandibula: { w: 9, h: 7.5 },
  cuello: { w: 16, h: 12 },
};

const PROFILE_PHOTOS: Partial<
  Record<
    FacialGender,
    Record<ProfileSide, { muscleSrc: string; skinSrc: string; zones: Record<ProfileZoneKey, { x: number; y: number }> }>
  >
> = {
  hombre: {
    derecho: {
      muscleSrc: '/facial-map/man-profile-derecho-muscle.jpg',
      skinSrc: '/facial-map/man-profile-derecho-skin.jpg',
      zones: {
        frente: { x: 73, y: 19 },
        sienes: { x: 65, y: 32 },
        patas_gallo: { x: 85, y: 41 },
        nariz: { x: 88, y: 53 },
        pomulos: { x: 76, y: 56 },
        nasogenianos: { x: 78, y: 61 },
        codigo_barras: { x: 87, y: 65 },
        labios: { x: 84, y: 70 },
        menton: { x: 77, y: 77 },
        mandibula: { x: 66, y: 70 },
        cuello: { x: 60, y: 86 },
      },
    },
    izquierdo: {
      muscleSrc: '/facial-map/man-profile-izquierdo-muscle.jpg',
      skinSrc: '/facial-map/man-profile-izquierdo-skin.jpg',
      zones: {
        frente: { x: 31, y: 20 },
        sienes: { x: 39, y: 33 },
        patas_gallo: { x: 15, y: 41 },
        nariz: { x: 12, y: 53 },
        pomulos: { x: 24, y: 56 },
        nasogenianos: { x: 22, y: 61 },
        codigo_barras: { x: 13, y: 65 },
        labios: { x: 16, y: 70 },
        menton: { x: 23, y: 77 },
        mandibula: { x: 34, y: 70 },
        cuello: { x: 40, y: 87 },
      },
    },
  },
  mujer: {
    derecho: {
      muscleSrc: '/facial-map/woman-profile-derecho-muscle.jpg',
      skinSrc: '/facial-map/woman-profile-derecho-skin.jpg',
      zones: {
        frente: { x: 68, y: 19 },
        sienes: { x: 60, y: 32 },
        patas_gallo: { x: 79, y: 42 },
        nariz: { x: 84, y: 53 },
        pomulos: { x: 72, y: 55 },
        nasogenianos: { x: 74, y: 61 },
        codigo_barras: { x: 82, y: 65 },
        labios: { x: 79, y: 70 },
        menton: { x: 73, y: 75 },
        mandibula: { x: 65, y: 67 },
        cuello: { x: 64, y: 84 },
      },
    },
    izquierdo: {
      muscleSrc: '/facial-map/woman-profile-izquierdo-muscle.jpg',
      skinSrc: '/facial-map/woman-profile-izquierdo-skin.jpg',
      zones: {
        frente: { x: 23, y: 25 },
        sienes: { x: 29, y: 33 },
        patas_gallo: { x: 18, y: 42 },
        nariz: { x: 12, y: 54 },
        pomulos: { x: 24, y: 54 },
        nasogenianos: { x: 22, y: 60 },
        codigo_barras: { x: 16, y: 64 },
        labios: { x: 19, y: 68 },
        menton: { x: 24, y: 75 },
        mandibula: { x: 30, y: 66 },
        cuello: { x: 32, y: 85 },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Dibujo libre sobre el mapa facial (frontal Y perfil): marcado tipo "lápiz
// de médico" (líneas guía punteadas). Cada superficie (frontal, perfil
// derecho, perfil izquierdo) mantiene SU PROPIO arreglo de trazos —
// FacialMap es quien los guarda (ver `annotations`) y se los pasa a cada
// vista, así dibujar en una no afecta a las otras y el resultado se puede
// incluir al guardar el presupuesto. Cada superficie usa su propio espacio
// de coordenadas (0-100 en la vista frontal, 0-PROFILE_W/H en perfil), por
// lo que el umbral del borrador se calcula proporcional al viewBox, no fijo.
// ---------------------------------------------------------------------------
type DrawTool = 'puntero' | 'lapiz' | 'linea' | 'circulo' | 'borrador';

function distance(a: FacialPoint, b: FacialPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(p: FacialPoint, a: FacialPoint, b: FacialPoint): number {
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (lenSq === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / lenSq));
  return distance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

function strokeHit(stroke: FacialStroke, p: FacialPoint, threshold: number): boolean {
  if (stroke.tool === 'lapiz') return stroke.points.some((pt) => distance(pt, p) < threshold);
  if (stroke.tool === 'linea') return distanceToSegment(p, stroke.from, stroke.to) < threshold;
  return Math.abs(distance(p, stroke.center) - stroke.radius) < threshold;
}

function StrokeShape({ stroke }: { stroke: FacialStroke }) {
  const common = {
    stroke: '#db2777',
    strokeWidth: 0.6,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeDasharray: '1.6 1.1',
  };
  if (stroke.tool === 'lapiz') {
    const d = stroke.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    return <path {...common} d={d} />;
  }
  if (stroke.tool === 'linea') {
    return <line {...common} x1={stroke.from.x} y1={stroke.from.y} x2={stroke.to.x} y2={stroke.to.y} />;
  }
  return <circle {...common} cx={stroke.center.x} cy={stroke.center.y} r={stroke.radius} />;
}

const DRAW_TOOLS: { key: DrawTool; icon: ComponentType<SVGProps<SVGSVGElement>>; label: string }[] = [
  { key: 'puntero', icon: PointerIcon, label: 'Puntero (marcar zonas)' },
  { key: 'lapiz', icon: PenIcon, label: 'Lápiz (trazo libre)' },
  { key: 'linea', icon: LineToolIcon, label: 'Línea recta' },
  { key: 'circulo', icon: CircleToolIcon, label: 'Círculo' },
  { key: 'borrador', icon: EraserIcon, label: 'Borrador' },
];

function DrawToolbar({
  tool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tool: DrawTool;
  onToolChange: (tool: DrawTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="flex w-full max-w-[420px] items-center justify-between gap-2">
      <div className="flex shrink-0 gap-0.5 rounded-lg bg-slate-200/70 p-0.5">
        {DRAW_TOOLS.map(({ key: t, icon: Icon, label }) => (
          <button
            key={t}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={tool === t}
            onClick={() => onToolChange(t)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              tool === t ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="flex shrink-0 gap-0.5 rounded-lg bg-slate-200/70 p-0.5">
        <button
          type="button"
          title="Deshacer"
          aria-label="Deshacer"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UndoIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Rehacer"
          aria-label="Rehacer"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RedoIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Maneja el estado de dibujo (herramienta activa, trazo en curso, deshacer/
// rehacer) para UNA superficie dada. `strokes`/`onStrokesChange` viven en el
// llamador (FacialMap) — este hook no los posee, solo los edita, que es lo
// que permite que cada superficie tenga su propio arreglo independiente.
function useDrawing(
  containerRef: RefObject<Element | null>,
  viewBoxW: number,
  viewBoxH: number,
  strokes: FacialStroke[],
  onStrokesChange: (strokes: FacialStroke[]) => void,
  // Cambia (ej. incrementa) cada vez que el padre empieza a configurar una
  // prestación nueva — vuelve la herramienta a "puntero" para que un círculo/
  // lápiz que quedó seleccionado no tape el clic con el que se elige la zona
  // (el overlay de dibujo intercepta todo el click salvo con "puntero").
  resetSignal?: number
) {
  const [tool, setTool] = useState<DrawTool>('puntero');
  const [draft, setDraft] = useState<FacialStroke | null>(null);
  const [redoStack, setRedoStack] = useState<FacialStroke[]>([]);
  const eraserThreshold = Math.max(viewBoxW, viewBoxH) * 0.025;

  useEffect(() => {
    if (resetSignal !== undefined) setTool('puntero');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  function toPoint(e: React.PointerEvent): FacialPoint {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * viewBoxW,
      y: ((e.clientY - rect.top) / rect.height) * viewBoxH,
    };
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (tool === 'puntero') return;
    const p = toPoint(e);
    if (tool === 'borrador') {
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (strokeHit(strokes[i], p, eraserThreshold)) {
          onStrokesChange(strokes.slice(0, i).concat(strokes.slice(i + 1)));
          setRedoStack([]);
          return;
        }
      }
      return;
    }
    const id = `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (tool === 'lapiz') setDraft({ id, tool: 'lapiz', points: [p] });
    else if (tool === 'linea') setDraft({ id, tool: 'linea', from: p, to: p });
    else setDraft({ id, tool: 'circulo', center: p, radius: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!draft) return;
    const p = toPoint(e);
    setDraft((prev) => {
      if (!prev) return prev;
      if (prev.tool === 'lapiz') return { ...prev, points: [...prev.points, p] };
      if (prev.tool === 'linea') return { ...prev, to: p };
      return { ...prev, radius: distance(prev.center, p) };
    });
  }

  function handlePointerUp() {
    if (!draft) return;
    onStrokesChange([...strokes, draft]);
    setRedoStack([]);
    setDraft(null);
  }

  function handleUndo() {
    if (strokes.length === 0) return;
    setRedoStack((r) => [...r, strokes[strokes.length - 1]]);
    onStrokesChange(strokes.slice(0, -1));
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    onStrokesChange([...strokes, redoStack[redoStack.length - 1]]);
    setRedoStack((r) => r.slice(0, -1));
  }

  return {
    tool,
    setTool,
    draft,
    canUndo: strokes.length > 0,
    canRedo: redoStack.length > 0,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleUndo,
    handleRedo,
  };
}

// ---------------------------------------------------------------------------
// Vistas de perfil: se define UNA silueta (perfil derecho, nariz apuntando
// hacia la derecha) como lista de puntos, y el perfil izquierdo se obtiene
// reflejando esos mismos puntos con flipProfileX() — igual que en la vista
// frontal, la simetría la calcula el código, no se redibuja a mano.
// ---------------------------------------------------------------------------
const PROFILE_W = 350;
const PROFILE_H = 360;
const flipProfileX = (x: number) => PROFILE_W - x;

// El cráneo se genera muestreando puntos sobre una elipse real (garantiza un
// contorno suave y sin bultos) en vez de adivinar puntos de control Bézier a
// mano — que es lo que producía siluetas asimétricas/deformes en los
// intentos anteriores. Solo la nariz/labios/mentón (una porción pequeña y
// acotada) se dibuja a mano, porque ahí es donde SÍ hace falta una
// protuberancia que una elipse simple no puede representar.
const SKULL = { cx: 100, cy: 150, rx: 70, ry: 110 };

function skullPoint(angleDeg: number): [number, number] {
  const t = (angleDeg * Math.PI) / 180;
  return [SKULL.cx + SKULL.rx * Math.cos(t), SKULL.cy + SKULL.ry * Math.sin(t)];
}

function sampleSkullArc(fromDeg: number, toDeg: number, steps: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(skullPoint(fromDeg + ((toDeg - fromDeg) * i) / steps));
  }
  return pts;
}

// De la coronilla (270°) a la glabela (333°, donde empieza la nariz): arco
// corto sobre la frente.
const FOREHEAD_ARC = sampleSkullArc(270, 333, 10);
// De la barbilla (39.5°) a la coronilla (270°) dando la vuelta larga por la
// nuca: el resto del cráneo.
const SKULL_BACK_ARC = sampleSkullArc(39.5, 270, 20);

const [GLABELLA_X, GLABELLA_Y] = FOREHEAD_ARC[FOREHEAD_ARC.length - 1];
const [CHIN_X, CHIN_Y] = SKULL_BACK_ARC[0];

const fmt = (n: number) => n.toFixed(1);

// Todo se construye primero en espacio canónico (perfil derecho, sin flip) y
// el reflejo se aplica una sola vez, al final, sobre cada punto — así no hay
// riesgo de aplicar flipProfileX() dos veces sobre el mismo valor (ese doble
// reflejo fue justamente el bug de la primera versión de este archivo).
type Segment =
  | { cmd: 'M' | 'L'; pt: [number, number] }
  | { cmd: 'C'; pts: [[number, number], [number, number], [number, number]] };

// Empalme nariz (protuberancia) → base cóncava → labio superior → labio
// inferior → aterriza exactamente en CHIN_X/CHIN_Y (calculado desde la
// elipse, no adivinado). Cada curva C lleva sus 3 puntos juntos — SVG
// requiere exactamente 3 pares de coordenadas por comando C.
const NOSE_LIPS_SPLICE: Segment[] = [
  { cmd: 'C', pts: [[GLABELLA_X + 13, GLABELLA_Y + 15], [GLABELLA_X + 25, GLABELLA_Y + 30], [195, 145]] },
  { cmd: 'C', pts: [[188, 158], [178, 162], [172, 168]] },
  { cmd: 'C', pts: [[175, 178], [172, 185], [170, 195]] },
  { cmd: 'C', pts: [[168, 200], [165, 205], [160, 210]] },
  { cmd: 'C', pts: [[CHIN_X + 8, CHIN_Y - 8], [CHIN_X + 3, CHIN_Y - 3], [CHIN_X, CHIN_Y]] },
];

const HEAD_SEGMENTS: Segment[] = [
  ...FOREHEAD_ARC.map((pt, i): Segment => ({ cmd: i === 0 ? 'M' : 'L', pt })),
  ...NOSE_LIPS_SPLICE,
  ...SKULL_BACK_ARC.slice(1).map((pt): Segment => ({ cmd: 'L', pt })),
];

function buildHeadPath(flip: boolean): string {
  const f = (x: number) => (flip ? flipProfileX(x) : x);
  const parts = HEAD_SEGMENTS.map((seg) =>
    seg.cmd === 'C'
      ? `C${seg.pts.map(([x, y]) => `${fmt(f(x))},${fmt(y)}`).join(' ')}`
      : `${seg.cmd}${fmt(f(seg.pt[0]))},${fmt(seg.pt[1])}`
  );
  return parts.join(' ') + ' Z';
}

function buildNeckPath(flip: boolean): string {
  const f = (x: number) => (flip ? flipProfileX(x) : x);
  return `M${fmt(f(100))},258 C${fmt(f(95))},285 ${fmt(f(88))},315 ${fmt(f(82))},345`;
}

const PROFILE_ZONES: { key: FacialZoneKey; x: number; y: number; labelY: number }[] = [
  { key: 'frente', x: 140, y: 65, labelY: 40 },
  { key: 'sienes', x: 128, y: 95, labelY: 72 },
  { key: 'patas_gallo', x: 148, y: 118, labelY: 104 },
  { key: 'nariz', x: 185, y: 145, labelY: 137 },
  { key: 'pomulos', x: 155, y: 148, labelY: 169 },
  { key: 'nasogenianos', x: 150, y: 170, labelY: 201 },
  { key: 'codigo_barras', x: 168, y: 188, labelY: 233 },
  { key: 'labios', x: 155, y: 205, labelY: 266 },
  { key: 'menton', x: 140, y: 220, labelY: 298 },
  { key: 'mandibula', x: 95, y: 222, labelY: 330 },
];

const EAR = { cx: 35, cy: 180, rx: 16, ry: 24 };
const PROFILE_LABEL_X = 235;

interface FacialMapProps {
  mode: OdontogramMode;
  selection: ToothSelection[];
  onSelectionChange: (selection: ToothSelection[]) => void;
  marks?: OdontogramMark[];
  onModeChange?: (mode: OdontogramMode) => void;
  allowedModes?: OdontogramMode[];
  // Zonas a las que está restringida la prestación activa (ver Prestacion.
  // allowedZones en el catálogo). Array vacío o undefined = sin restricción.
  allowedZones?: string[];
  // Vista de solo consulta (ej. historial de zonas tratadas): sin selección,
  // sin instrucciones de uso, los puntos no son clickeables.
  readOnly?: boolean;
  // Oculta los puntos/chips de zona de la vista Frontal hasta que haya una
  // prestación activa que configurar — evita el ruido visual de puntos
  // deshabilitados antes de seleccionar nada. Por defecto siempre visibles.
  showZones?: boolean;
  // Trazos dibujados a mano (uno por superficie: frontal/perfil derecho/
  // perfil izquierdo). Controlado por el padre para que sobreviva al cambio
  // de pestaña Frontal/Perfil y se pueda incluir al guardar el presupuesto;
  // si no se pasa, FacialMap mantiene su propio estado interno (ej. vistas
  // de solo lectura, que de todas formas no muestran las herramientas).
  annotations?: FacialAnnotations;
  onAnnotationsChange?: (annotations: FacialAnnotations) => void;
  // Género mostrado en la vista Frontal. Controlado por el padre para que un
  // presupuesto ya guardado pueda mostrar siempre el género con el que se
  // creó — a diferencia de piel/músculos (una capa visual del mismo par de
  // fotos), el género cambia la foto completa, así que una vez guardado el
  // presupuesto queda fijo (ver `lockGender`).
  gender?: FacialGender;
  onGenderChange?: (gender: FacialGender) => void;
  // Impide cambiar el género (los botones Mujer/Hombre quedan deshabilitados)
  // sin afectar el toggle Piel/Músculos, que sigue libre. Pensado para mostrar
  // un presupuesto ya guardado con el género con el que se creó.
  lockGender?: boolean;
  // Cambia (ej. incrementa) cada vez que el padre empieza a configurar una
  // prestación nueva — vuelve la herramienta de dibujo a "puntero" en las 3
  // superficies (frontal/perfil), para que un círculo/lápiz que quedó
  // seleccionado no tape el clic con el que se elige la zona.
  resetToolTrigger?: number;
}

function ZoneDot({
  x,
  y,
  labelX,
  labelY,
  textAnchor,
  label,
  isSelected,
  isMarked,
  disabled,
  readOnly = false,
  onToggle,
}: {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  textAnchor: 'start' | 'end';
  label: string;
  isSelected: boolean;
  isMarked: boolean;
  disabled: boolean;
  readOnly?: boolean;
  onToggle: () => void;
}) {
  const dotColor = isSelected
    ? 'fill-brand-600 stroke-brand-700'
    : isMarked
      ? 'fill-brand-200 stroke-brand-400'
      : 'fill-white stroke-slate-500 group-hover:fill-brand-100 group-hover:stroke-brand-400';
  const textColor = isSelected ? 'fill-brand-700 font-semibold' : isMarked ? 'fill-brand-600 font-medium' : 'fill-slate-500 group-hover:fill-brand-600';
  const lineColor = isSelected ? 'stroke-brand-400' : 'stroke-slate-300';

  return (
    <g
      role={readOnly ? undefined : 'button'}
      aria-label={label}
      aria-pressed={readOnly ? undefined : isSelected}
      tabIndex={readOnly || disabled ? -1 : 0}
      onClick={readOnly ? undefined : onToggle}
      onKeyDown={
        readOnly
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') onToggle();
            }
      }
      className={`group outline-none transition-colors ${
        readOnly ? 'cursor-default' : disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer focus-visible:opacity-80'
      }`}
    >
      <line x1={x} y1={y} x2={labelX} y2={labelY} strokeWidth={1} className={`transition-colors ${lineColor}`} />
      <circle cx={x} cy={y} r={7} strokeWidth={2} className={`transition-colors ${dotColor}`} />
      <text x={labelX} y={labelY} dy={4} textAnchor={textAnchor} className={`text-[11px] transition-colors ${textColor}`}>
        {label}
      </text>
    </g>
  );
}

function ProfilePanel({
  flip,
  selectedZones,
  markedZones,
  disabled,
  restrictedZones,
  readOnly = false,
  onToggle,
  strokes,
  onStrokesChange,
  resetToolTrigger,
}: {
  flip: boolean;
  selectedZones: Set<string>;
  markedZones: Set<string>;
  disabled: boolean;
  restrictedZones: Set<string> | null;
  readOnly?: boolean;
  onToggle: (zone: string) => void;
  strokes: FacialStroke[];
  onStrokesChange: (strokes: FacialStroke[]) => void;
  resetToolTrigger?: number;
}) {
  const labelX = flip ? flipProfileX(PROFILE_LABEL_X) : PROFILE_LABEL_X;
  const textAnchor: 'start' | 'end' = flip ? 'end' : 'start';
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useDrawing(svgRef, PROFILE_W, PROFILE_H, strokes, onStrokesChange, resetToolTrigger);

  return (
    <div className="flex flex-col items-center gap-2">
      {!readOnly && (
        <DrawToolbar
          tool={drawing.tool}
          onToolChange={drawing.setTool}
          canUndo={drawing.canUndo}
          canRedo={drawing.canRedo}
          onUndo={drawing.handleUndo}
          onRedo={drawing.handleRedo}
        />
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PROFILE_W} ${PROFILE_H}`}
        className="block h-auto w-full max-w-[260px]"
        role="img"
        aria-label={flip ? 'Perfil izquierdo del rostro' : 'Perfil derecho del rostro'}
        style={!readOnly ? { touchAction: 'none' } : undefined}
        onPointerDown={readOnly ? undefined : drawing.handlePointerDown}
        onPointerMove={readOnly ? undefined : drawing.handlePointerMove}
        onPointerUp={readOnly ? undefined : drawing.handlePointerUp}
      >
        <path d={buildNeckPath(flip)} fill="none" stroke="currentColor" strokeWidth={2} className="text-slate-300" />
        <ellipse
          cx={flip ? flipProfileX(EAR.cx) : EAR.cx}
          cy={EAR.cy}
          rx={EAR.rx}
          ry={EAR.ry}
          fill="#fffaf7"
          stroke="currentColor"
          strokeWidth={1.8}
          className="text-slate-300"
        />
        <path d={buildHeadPath(flip)} fill="#fffaf7" stroke="currentColor" strokeWidth={2.5} className="text-slate-400" />

        {PROFILE_ZONES.map((zone) => {
          const x = flip ? flipProfileX(zone.x) : zone.x;
          const zoneDisabled = disabled || (restrictedZones !== null && !restrictedZones.has(zone.key));
          return (
            <ZoneDot
              key={zone.key}
              x={x}
              y={zone.y}
              labelX={labelX}
              labelY={zone.labelY}
              textAnchor={textAnchor}
              label={FACIAL_ZONE_LABELS[zone.key]}
              isSelected={selectedZones.has(zone.key)}
              isMarked={markedZones.has(zone.key)}
              disabled={zoneDisabled}
              readOnly={readOnly}
              onToggle={() => onToggle(zone.key)}
            />
          );
        })}

        {strokes.map((s) => (
          <StrokeShape key={s.id} stroke={s} />
        ))}
        {drawing.draft && <StrokeShape stroke={drawing.draft} />}
      </svg>
    </div>
  );
}

function ProfilePhotoPanel({
  gender,
  side,
  selectedZones,
  markedZones,
  disabled,
  restrictedZones,
  readOnly,
  onToggle,
  strokes,
  onStrokesChange,
  resetToolTrigger,
}: {
  gender: FacialGender;
  side: ProfileSide;
  selectedZones: Set<string>;
  markedZones: Set<string>;
  disabled: boolean;
  restrictedZones: Set<string> | null;
  readOnly: boolean;
  onToggle: (zone: string) => void;
  strokes: FacialStroke[];
  onStrokesChange: (strokes: FacialStroke[]) => void;
  resetToolTrigger?: number;
}) {
  const [layer, setLayer] = useState<'piel' | 'musculos'>('piel');
  const containerRef = useRef<HTMLDivElement>(null);
  const photos = PROFILE_PHOTOS[gender]![side];
  const drawing = useDrawing(containerRef, 100, 100, strokes, onStrokesChange, resetToolTrigger);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex shrink-0 gap-1 rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
        {(
          [
            { key: 'piel', label: 'Piel' },
            { key: 'musculos', label: 'Músculos' },
          ] as const
        ).map(({ key: l, label }) => (
          <button
            key={l}
            type="button"
            onClick={() => setLayer(l)}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              layer === l ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!readOnly && (
        <DrawToolbar
          tool={drawing.tool}
          onToolChange={drawing.setTool}
          canUndo={drawing.canUndo}
          canRedo={drawing.canRedo}
          onUndo={drawing.handleUndo}
          onRedo={drawing.handleRedo}
        />
      )}

      <div
        ref={containerRef}
        className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-xl bg-white ring-1 ring-slate-200"
      >
        <img
          src={photos.muscleSrc}
          alt={`Musculatura facial, perfil ${side}`}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${layer === 'musculos' ? 'opacity-100' : 'opacity-0'}`}
        />
        <img
          src={photos.skinSrc}
          alt={`Piel del rostro, perfil ${side}`}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${layer === 'piel' ? 'opacity-100' : 'opacity-0'}`}
        />

        {PROFILE_ZONE_KEYS.map((zone) => {
          const pos = photos.zones[zone];
          const shape = PROFILE_ZONE_SHAPE[zone];
          const zoneDisabled = disabled || (restrictedZones !== null && !restrictedZones.has(zone));
          const isSelected = selectedZones.has(zone);
          const isMarked = markedZones.has(zone);
          const zoneColor = isSelected
            ? 'border-brand-600 bg-brand-500/25'
            : isMarked
              ? 'border-brand-400 bg-brand-300/20'
              : 'border-white/80 bg-white/5 hover:border-brand-300 hover:bg-brand-200/15';
          return (
            <button
              key={zone}
              type="button"
              title={FACIAL_ZONE_LABELS[zone]}
              aria-label={FACIAL_ZONE_LABELS[zone]}
              aria-pressed={readOnly ? undefined : isSelected}
              disabled={readOnly || zoneDisabled}
              onClick={() => onToggle(zone)}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${shape.w}%`, height: `${shape.h}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed shadow-sm transition-colors ${zoneColor} ${
                readOnly ? 'cursor-default' : zoneDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
              }`}
            />
          );
        })}

        {!readOnly && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            style={{ pointerEvents: drawing.tool === 'puntero' ? 'none' : 'auto', touchAction: 'none' }}
            onPointerDown={drawing.handlePointerDown}
            onPointerMove={drawing.handlePointerMove}
            onPointerUp={drawing.handlePointerUp}
          >
            {strokes.map((s) => (
              <StrokeShape key={s.id} stroke={s} />
            ))}
            {drawing.draft && <StrokeShape stroke={drawing.draft} />}
          </svg>
        )}
      </div>

      <div className="flex max-w-[260px] flex-wrap justify-center gap-1.5">
        {PROFILE_ZONE_KEYS.map((zone) => {
          const zoneDisabled = disabled || (restrictedZones !== null && !restrictedZones.has(zone));
          const isSelected = selectedZones.has(zone);
          const isMarked = markedZones.has(zone);
          return (
            <button
              key={zone}
              type="button"
              disabled={readOnly || zoneDisabled}
              onClick={() => onToggle(zone)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : isMarked
                    ? 'bg-brand-50 text-brand-700 ring-brand-200'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-brand-50'
              }`}
            >
              {FACIAL_ZONE_LABELS[zone]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FacialPhotoView({
  gender,
  onGenderChange,
  lockGender,
  selectedZones,
  markedZones,
  disabled,
  restrictedZones,
  readOnly,
  showZones,
  onToggle,
  strokes,
  onStrokesChange,
  resetToolTrigger,
}: {
  gender: FacialGender;
  onGenderChange: (gender: FacialGender) => void;
  lockGender: boolean;
  selectedZones: Set<string>;
  markedZones: Set<string>;
  disabled: boolean;
  restrictedZones: Set<string> | null;
  readOnly: boolean;
  showZones: boolean;
  onToggle: (zone: string) => void;
  strokes: FacialStroke[];
  onStrokesChange: (strokes: FacialStroke[]) => void;
  resetToolTrigger?: number;
}) {
  const [layer, setLayer] = useState<'piel' | 'musculos'>('piel');
  const containerRef = useRef<HTMLDivElement>(null);
  const photos = FRONT_PHOTOS[gender];
  const drawing = useDrawing(containerRef, 100, 100, strokes, onStrokesChange, resetToolTrigger);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[420px] items-center justify-between gap-2">
        <div className="flex shrink-0 gap-1 rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
          {(
            [
              { key: 'piel', label: 'Piel' },
              { key: 'musculos', label: 'Músculos' },
            ] as const
          ).map(({ key: l, label }) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayer(l)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                layer === l ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 gap-1 rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
          {(
            [
              { key: 'mujer', label: 'Mujer' },
              { key: 'hombre', label: 'Hombre' },
            ] as const
          ).map(({ key: g, label }) => (
            <button
              key={g}
              type="button"
              title={lockGender ? 'El género queda fijo una vez guardado el presupuesto' : undefined}
              disabled={lockGender}
              onClick={() => onGenderChange(g)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                gender === g ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              } ${lockGender ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!readOnly && (
        <DrawToolbar
          tool={drawing.tool}
          onToolChange={drawing.setTool}
          canUndo={drawing.canUndo}
          canRedo={drawing.canRedo}
          onUndo={drawing.handleUndo}
          onRedo={drawing.handleRedo}
        />
      )}

      <div
        ref={containerRef}
        className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-xl bg-white ring-1 ring-slate-200"
      >
        <img
          src={photos.muscleSrc}
          alt="Musculatura facial"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${layer === 'musculos' ? 'opacity-100' : 'opacity-0'}`}
        />
        <img
          src={photos.skinSrc}
          alt="Piel del rostro"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${layer === 'piel' ? 'opacity-100' : 'opacity-0'}`}
        />

        {showZones &&
          FACIAL_ZONES.map((zone) => {
            const pos = photos.zones[zone];
            const shape = ZONE_SHAPE[zone];
            const zoneDisabled = disabled || (restrictedZones !== null && !restrictedZones.has(zone));
            const isSelected = selectedZones.has(zone);
            const isMarked = markedZones.has(zone);
            const zoneColor = isSelected
              ? 'border-brand-600 bg-brand-500/25'
              : isMarked
                ? 'border-brand-400 bg-brand-300/20'
                : 'border-white/80 bg-white/5 hover:border-brand-300 hover:bg-brand-200/15';
            return (
              <button
                key={zone}
                type="button"
                title={FACIAL_ZONE_LABELS[zone]}
                aria-label={FACIAL_ZONE_LABELS[zone]}
                aria-pressed={readOnly ? undefined : isSelected}
                disabled={readOnly || zoneDisabled}
                onClick={() => onToggle(zone)}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${shape.w}%`, height: `${shape.h}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed shadow-sm transition-colors ${zoneColor} ${
                  readOnly ? 'cursor-default' : zoneDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                }`}
              />
            );
          })}

        {!readOnly && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            style={{ pointerEvents: drawing.tool === 'puntero' ? 'none' : 'auto', touchAction: 'none' }}
            onPointerDown={drawing.handlePointerDown}
            onPointerMove={drawing.handlePointerMove}
            onPointerUp={drawing.handlePointerUp}
          >
            {strokes.map((s) => (
              <StrokeShape key={s.id} stroke={s} />
            ))}
            {drawing.draft && <StrokeShape stroke={drawing.draft} />}
          </svg>
        )}
      </div>

      {showZones ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {FACIAL_ZONES.map((zone) => {
            const zoneDisabled = disabled || (restrictedZones !== null && !restrictedZones.has(zone));
            const isSelected = selectedZones.has(zone);
            const isMarked = markedZones.has(zone);
            return (
              <button
                key={zone}
                type="button"
                disabled={readOnly || zoneDisabled}
                onClick={() => onToggle(zone)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? 'bg-brand-600 text-white ring-brand-600'
                    : isMarked
                      ? 'bg-brand-50 text-brand-700 ring-brand-200'
                      : 'bg-white text-slate-600 ring-slate-200 hover:bg-brand-50'
                }`}
              >
                {FACIAL_ZONE_LABELS[zone]}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Selecciona una prestación para marcar las zonas a tratar.</p>
      )}

    </div>
  );
}

// Una sola foto (frontal, o un lado del perfil) con las zonas tratadas
// resaltadas — pieza reutilizable de FacialZonesHighlight, de ahí el prop
// `photos`/`zoneKeys` genéricos en vez de resolverlos aquí mismo.
function HighlightPhoto({
  muscleSrc,
  skinSrc,
  layer,
  zonePositions,
  zoneShapes,
  visibleZones,
  strokes,
  className,
}: {
  muscleSrc: string;
  skinSrc: string;
  layer: 'piel' | 'musculos';
  zonePositions: Record<string, { x: number; y: number }>;
  zoneShapes: Record<string, { w: number; h: number }>;
  visibleZones: FacialZoneKey[];
  strokes: FacialStroke[];
  className: string;
}) {
  return (
    <div className={`relative mx-auto aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 ${className}`}>
      <img
        src={muscleSrc}
        alt="Musculatura"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${layer === 'musculos' ? 'opacity-100' : 'opacity-0'}`}
      />
      <img
        src={skinSrc}
        alt="Piel"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${layer === 'piel' ? 'opacity-100' : 'opacity-0'}`}
      />
      {visibleZones.map((zone) => {
        const pos = zonePositions[zone];
        const shape = zoneShapes[zone];
        if (!pos || !shape) return null;
        return (
          <div
            key={zone}
            title={FACIAL_ZONE_LABELS[zone]}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${shape.w}%`, height: `${shape.h}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-brand-600 bg-brand-500/30 shadow-sm"
          />
        );
      })}
      {strokes.length > 0 && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {strokes.map((s) => (
            <StrokeShape key={s.id} stroke={s} />
          ))}
        </svg>
      )}
    </div>
  );
}

// Vista de solo lectura para historiales/detalle de un presupuesto: muestra
// el rostro del género con que se creó y resalta ÚNICAMENTE las zonas que
// tuvieron un procedimiento — sin puntero, sin chips de las demás zonas, sin
// dibujo. Es intencionalmente más simple que <FacialMap readOnly /> (que
// sigue mostrando las 13 zonas disponibles, solo que no clicables). Incluye
// Frontal/Perfil y Piel/Músculos porque son la misma foto con otra capa —
// no cambia qué zonas están tratadas, solo cómo se ven.
export function FacialZonesHighlight({
  gender,
  zones,
  annotations,
  className = 'max-w-[280px]',
}: {
  gender: FacialGender;
  zones: FacialZoneKey[];
  annotations?: FacialAnnotations | null;
  className?: string;
}) {
  const [view, setView] = useState<'frontal' | 'perfil'>('frontal');
  const [layer, setLayer] = useState<'piel' | 'musculos'>('piel');
  const treated = new Set(zones);
  const frontZones = FACIAL_ZONES.filter((zone) => treated.has(zone));
  const profileZones = PROFILE_ZONE_KEYS.filter((zone) => treated.has(zone));
  const frontStrokes = annotations?.frontal ?? [];
  const derechoStrokes = annotations?.perfilDerecho ?? [];
  const izquierdoStrokes = annotations?.perfilIzquierdo ?? [];

  if (frontZones.length === 0 && frontStrokes.length === 0 && derechoStrokes.length === 0 && izquierdoStrokes.length === 0) {
    return null;
  }

  const front = FRONT_PHOTOS[gender];
  const profile = PROFILE_PHOTOS[gender];
  const showPerfilTab = profile !== undefined && (profileZones.length > 0 || derechoStrokes.length > 0 || izquierdoStrokes.length > 0);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex shrink-0 gap-1 rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
          {(
            [
              { key: 'piel', label: 'Piel' },
              { key: 'musculos', label: 'Músculos' },
            ] as const
          ).map(({ key: l, label }) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayer(l)}
              className={`rounded-md px-2 py-0.5 transition-colors ${
                layer === l ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {showPerfilTab && (
          <div className="flex shrink-0 gap-1 rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
            {(['frontal', 'perfil'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-2 py-0.5 capitalize transition-colors ${
                  view === v ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'frontal' || !showPerfilTab ? (
        <HighlightPhoto
          muscleSrc={front.muscleSrc}
          skinSrc={front.skinSrc}
          layer={layer}
          zonePositions={front.zones}
          zoneShapes={ZONE_SHAPE}
          visibleZones={frontZones}
          strokes={frontStrokes}
          className={`w-full ${className}`}
        />
      ) : (
        <div className="flex w-full flex-wrap items-start justify-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <HighlightPhoto
              muscleSrc={profile!.derecho.muscleSrc}
              skinSrc={profile!.derecho.skinSrc}
              layer={layer}
              zonePositions={profile!.derecho.zones}
              zoneShapes={PROFILE_ZONE_SHAPE}
              visibleZones={profileZones}
              strokes={derechoStrokes}
              className="w-44 sm:w-56"
            />
            <span className="text-[11px] font-medium text-slate-400">Perfil derecho</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <HighlightPhoto
              muscleSrc={profile!.izquierdo.muscleSrc}
              skinSrc={profile!.izquierdo.skinSrc}
              layer={layer}
              zonePositions={profile!.izquierdo.zones}
              zoneShapes={PROFILE_ZONE_SHAPE}
              visibleZones={profileZones}
              strokes={izquierdoStrokes}
              className="w-44 sm:w-56"
            />
            <span className="text-[11px] font-medium text-slate-400">Perfil izquierdo</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function FacialMap({
  mode,
  selection,
  onSelectionChange,
  marks = [],
  allowedZones,
  readOnly = false,
  showZones = true,
  annotations,
  onAnnotationsChange,
  gender,
  onGenderChange,
  lockGender = false,
  resetToolTrigger,
}: FacialMapProps) {
  const [view, setView] = useState<'frontal' | 'perfil'>('frontal');
  const [localGender, setLocalGender] = useState<FacialGender>('mujer');
  const currentGender = gender ?? localGender;
  const setGender = onGenderChange ?? setLocalGender;
  const [localAnnotations, setLocalAnnotations] = useState<FacialAnnotations>(EMPTY_FACIAL_ANNOTATIONS);
  const currentAnnotations = annotations ?? localAnnotations;
  const setAnnotations = onAnnotationsChange ?? setLocalAnnotations;
  const selectedZones = new Set(selection.map((s) => s.tooth));
  const markedZones = new Set(marks.map((m) => m.tooth));
  const disabled = !readOnly && mode === 'session';
  const restrictedZones = !readOnly && allowedZones && allowedZones.length > 0 ? new Set(allowedZones) : null;

  function toggleZone(zone: string) {
    if (readOnly || disabled) return;
    if (restrictedZones !== null && !restrictedZones.has(zone)) return;
    if (selectedZones.has(zone)) {
      onSelectionChange(selection.filter((s) => s.tooth !== zone));
    } else {
      onSelectionChange([...selection, { tooth: zone, surface: 'center' }]);
    }
  }

  // Un trazo dibujado a mano tiene sentido solo sobre el rostro en el que se
  // hizo — al cambiar de género la foto frontal completa cambia, así que se
  // limpian solo los trazos frontales (perfil no depende del género).
  function handleGenderChange(next: FacialGender) {
    if (lockGender) return;
    setGender(next);
    setAnnotations({ ...currentAnnotations, frontal: [] });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {readOnly
            ? 'Zonas con procedimientos registrados en el historial del paciente.'
            : disabled
              ? 'Esta prestación aplica a todo el rostro, no requiere seleccionar zonas.'
              : restrictedZones
                ? `Esta prestación solo puede aplicarse en: ${Array.from(restrictedZones).map((z) => FACIAL_ZONE_LABELS[z as FacialZoneKey] ?? z).join(', ')}.`
                : 'Haz clic en un punto o en su nombre para marcar la zona a tratar.'}
        </p>
        <div className="flex shrink-0 gap-1 rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
          {(['frontal', 'perfil'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                view === v ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'frontal' ? (
        <FacialPhotoView
          gender={currentGender}
          onGenderChange={handleGenderChange}
          lockGender={lockGender}
          selectedZones={selectedZones}
          markedZones={markedZones}
          disabled={disabled}
          restrictedZones={restrictedZones}
          readOnly={readOnly}
          showZones={showZones}
          onToggle={toggleZone}
          strokes={currentAnnotations.frontal}
          onStrokesChange={(frontal) => setAnnotations({ ...currentAnnotations, frontal })}
          resetToolTrigger={resetToolTrigger}
        />
      ) : PROFILE_PHOTOS[currentGender] ? (
        <div className="flex flex-wrap items-start justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <ProfilePhotoPanel
              gender={currentGender}
              side="derecho"
              selectedZones={selectedZones}
              markedZones={markedZones}
              disabled={disabled}
              restrictedZones={restrictedZones}
              readOnly={readOnly}
              onToggle={toggleZone}
              strokes={currentAnnotations.perfilDerecho}
              onStrokesChange={(perfilDerecho) => setAnnotations({ ...currentAnnotations, perfilDerecho })}
              resetToolTrigger={resetToolTrigger}
            />
            <span className="text-[11px] font-medium text-slate-400">Perfil derecho</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ProfilePhotoPanel
              gender={currentGender}
              side="izquierdo"
              selectedZones={selectedZones}
              markedZones={markedZones}
              disabled={disabled}
              restrictedZones={restrictedZones}
              readOnly={readOnly}
              onToggle={toggleZone}
              strokes={currentAnnotations.perfilIzquierdo}
              onStrokesChange={(perfilIzquierdo) => setAnnotations({ ...currentAnnotations, perfilIzquierdo })}
              resetToolTrigger={resetToolTrigger}
            />
            <span className="text-[11px] font-medium text-slate-400">Perfil izquierdo</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <ProfilePanel
              flip={false}
              selectedZones={selectedZones}
              markedZones={markedZones}
              disabled={disabled}
              restrictedZones={restrictedZones}
              readOnly={readOnly}
              onToggle={toggleZone}
              strokes={currentAnnotations.perfilDerecho}
              onStrokesChange={(perfilDerecho) => setAnnotations({ ...currentAnnotations, perfilDerecho })}
              resetToolTrigger={resetToolTrigger}
            />
            <span className="text-[11px] font-medium text-slate-400">Perfil derecho</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ProfilePanel
              flip
              selectedZones={selectedZones}
              markedZones={markedZones}
              disabled={disabled}
              restrictedZones={restrictedZones}
              readOnly={readOnly}
              onToggle={toggleZone}
              strokes={currentAnnotations.perfilIzquierdo}
              onStrokesChange={(perfilIzquierdo) => setAnnotations({ ...currentAnnotations, perfilIzquierdo })}
              resetToolTrigger={resetToolTrigger}
            />
            <span className="text-[11px] font-medium text-slate-400">Perfil izquierdo</span>
          </div>
        </div>
      )}
    </div>
  );
}
