import { useState } from 'react';
import type { OdontogramMark, OdontogramMode, ToothSelection } from './Odontogram';
import { FACIAL_ZONE_LABELS, type FacialZoneKey } from './facialZoneConfig';

// ---------------------------------------------------------------------------
// Vista frontal: silueta ovalada con un punto por zona conectado a su
// etiqueta mediante una línea guía. El lado derecho se genera reflejando las
// coordenadas del izquierdo con mirrorX() (no se tipean los mismos números
// dos veces), así la simetría queda garantizada por construcción.
// ---------------------------------------------------------------------------
const CX = 230;
const mirrorX = (x: number) => 2 * CX - x;

const FRONT_ZONE_LAYOUT: Record<FacialZoneKey, { x: number; y: number; side: 'left' | 'right'; labelY: number }> = {
  sienes: { x: 184, y: 135, side: 'left', labelY: 89 },
  patas_gallo: { x: 180, y: 193, side: 'left', labelY: 154 },
  ojeras: { x: 192, y: 228, side: 'left', labelY: 219 },
  codigo_barras: { x: 224, y: 274, side: 'left', labelY: 283 },
  nasogenianos: { x: 192, y: 280, side: 'left', labelY: 348 },
  labios: { x: 230, y: 322, side: 'left', labelY: 412 },
  frente: { x: 272, y: 130, side: 'right', labelY: 89 },
  entrecejo: { x: 236, y: 182, side: 'right', labelY: 144 },
  parpados: { x: 272, y: 187, side: 'right', labelY: 197 },
  nariz: { x: 236, y: 234, side: 'right', labelY: 251 },
  pomulos: { x: 284, y: 239, side: 'right', labelY: 305 },
  mandibula: { x: 284, y: 291, side: 'right', labelY: 358 },
  menton: { x: 230, y: 360, side: 'right', labelY: 412 },
};

const FRONT_ZONE_ORDER = Object.keys(FRONT_ZONE_LAYOUT) as FacialZoneKey[];

const FRONT_LEFT_LABEL_X = 108;
const FRONT_RIGHT_LABEL_X = 370;

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
}: {
  flip: boolean;
  selectedZones: Set<string>;
  markedZones: Set<string>;
  disabled: boolean;
  restrictedZones: Set<string> | null;
  readOnly?: boolean;
  onToggle: (zone: string) => void;
}) {
  const labelX = flip ? flipProfileX(PROFILE_LABEL_X) : PROFILE_LABEL_X;
  const textAnchor: 'start' | 'end' = flip ? 'end' : 'start';

  return (
    <svg
      viewBox={`0 0 ${PROFILE_W} ${PROFILE_H}`}
      className="block h-auto w-full max-w-[260px]"
      role="img"
      aria-label={flip ? 'Perfil izquierdo del rostro' : 'Perfil derecho del rostro'}
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
    </svg>
  );
}

export function FacialMap({ mode, selection, onSelectionChange, marks = [], allowedZones, readOnly = false }: FacialMapProps) {
  const [view, setView] = useState<'frontal' | 'perfil'>('frontal');
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
        <svg viewBox="0 0 500 520" className="mx-auto block w-full max-w-[480px]" role="img" aria-label="Mapa de zonas faciales, vista frontal">
          {/* cuello */}
          <path d="M195,390 C188,420 182,450 178,480" fill="none" stroke="currentColor" strokeWidth={2} className="text-slate-300" />
          <path d={`M${mirrorX(195)},390 C${mirrorX(188)},420 ${mirrorX(182)},450 ${mirrorX(178)},480`} fill="none" stroke="currentColor" strokeWidth={2} className="text-slate-300" />

          {/* orejas */}
          <path d="M105,205 C95,200 90,220 95,240 C98,253 108,257 115,247" fill="#fffaf7" stroke="currentColor" strokeWidth={1.8} className="text-slate-300" />
          <path
            d={`M${mirrorX(105)},205 C${mirrorX(95)},200 ${mirrorX(90)},220 ${mirrorX(95)},240 C${mirrorX(98)},253 ${mirrorX(108)},257 ${mirrorX(115)},247`}
            fill="#fffaf7"
            stroke="currentColor"
            strokeWidth={1.8}
            className="text-slate-300"
          />

          {/* óvalo del rostro */}
          <ellipse cx={CX} cy="245" rx="115" ry="150" fill="#fffaf7" stroke="currentColor" strokeWidth={2.5} className="text-slate-400" />

          {/* nacimiento del pelo (decorativo) */}
          <path d="M230,100 Q228,130 230,155" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="text-slate-200" />
          <path d="M200,105 Q195,135 185,160" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="text-slate-200" />
          <path d={`M${mirrorX(200)},105 Q${mirrorX(195)},135 ${mirrorX(185)},160`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="text-slate-200" />
          <path d="M170,120 Q160,145 152,168" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="text-slate-200" />
          <path d={`M${mirrorX(170)},120 Q${mirrorX(160)},145 ${mirrorX(152)},168`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="text-slate-200" />

          {/* cejas */}
          <path d="M185,205 Q202,193 220,203" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-slate-300" />
          <path d={`M${mirrorX(185)},205 Q${mirrorX(202)},193 ${mirrorX(220)},203`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-slate-300" />

          {/* ojos */}
          <path d="M180,224 Q202,212 224,222 Q202,234 180,224 Z" fill="white" stroke="currentColor" strokeWidth={1.5} className="text-slate-400" />
          <circle cx="205" cy="223" r="7" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-slate-400" />
          <circle cx="205" cy="223" r="3" className="fill-slate-400" />
          <path d={`M${mirrorX(180)},224 Q${mirrorX(202)},212 ${mirrorX(224)},222 Q${mirrorX(202)},234 ${mirrorX(180)},224 Z`} fill="white" stroke="currentColor" strokeWidth={1.5} className="text-slate-400" />
          <circle cx={mirrorX(205)} cy="223" r="7" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-slate-400" />
          <circle cx={mirrorX(205)} cy="223" r="3" className="fill-slate-400" />

          {/* nariz */}
          <path d="M230,235 L224,275 Q230,282 236,275" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="text-slate-300" />

          {/* labios */}
          <path d="M192,310 Q211,304 230,308 Q249,304 268,310 Q230,332 192,310 Z" fill="none" stroke="currentColor" strokeWidth={1.8} className="text-slate-400" />

          {FRONT_ZONE_ORDER.map((zone) => {
            const layout = FRONT_ZONE_LAYOUT[zone];
            const labelX = layout.side === 'left' ? FRONT_LEFT_LABEL_X : FRONT_RIGHT_LABEL_X;
            const zoneDisabled = disabled || (restrictedZones !== null && !restrictedZones.has(zone));
            return (
              <ZoneDot
                key={zone}
                x={layout.x}
                y={layout.y}
                labelX={labelX}
                labelY={layout.labelY}
                textAnchor={layout.side === 'left' ? 'end' : 'start'}
                label={FACIAL_ZONE_LABELS[zone]}
                isSelected={selectedZones.has(zone)}
                isMarked={markedZones.has(zone)}
                disabled={zoneDisabled}
                readOnly={readOnly}
                onToggle={() => toggleZone(zone)}
              />
            );
          })}
        </svg>
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
            />
            <span className="text-[11px] font-medium text-slate-400">Perfil izquierdo</span>
          </div>
        </div>
      )}
    </div>
  );
}
