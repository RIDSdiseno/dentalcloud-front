const UPPER_PERMANENT = [
  '1.8', '1.7', '1.6', '1.5', '1.4', '1.3', '1.2', '1.1',
  '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8',
] as const;

const LOWER_PERMANENT = [
  '4.8', '4.7', '4.6', '4.5', '4.4', '4.3', '4.2', '4.1',
  '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8',
] as const;

const UPPER_DECIDUOUS = [
  '5.5', '5.4', '5.3', '5.2', '5.1',
  '6.1', '6.2', '6.3', '6.4', '6.5',
] as const;

const LOWER_DECIDUOUS = [
  '8.5', '8.4', '8.3', '8.2', '8.1',
  '7.1', '7.2', '7.3', '7.4', '7.5',
] as const;

export const TOOTH_SURFACES = ['top', 'right', 'bottom', 'left', 'center'] as const;
export type ToothSurface = (typeof TOOTH_SURFACES)[number];

export type OdontogramMode = 'session' | 'tooth' | 'surface' | 'extraction' | 'cuadrante' | 'sextante' | 'arcada';

export interface ToothSelection {
  tooth: string;
  surface: ToothSurface;
}

// Marca persistente de una prestación ya agregada al presupuesto (no confundir
// con la selección provisional mientras se está configurando una prestación).
export interface OdontogramMark {
  tooth: string;
  mode: Exclude<OdontogramMode, 'session'>;
  surfaces: ToothSurface[];
  color?: string;
}

// Agrupaciones de piezas permanentes por cuadrante (1-4, notación FDI ya usada
// en este odontograma), sextante (S1-S6, ver @odontogram_cl) y arcada
// (superior/inferior). Solo aplican a dentición permanente: la temporal no se
// carga clínicamente por estas zonas.
export const QUADRANT_TEETH: Record<string, string[]> = {
  '1': ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8'],
  '2': ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8'],
  '3': ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'],
  '4': ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8'],
};

export const SEXTANT_TEETH: Record<string, string[]> = {
  '1': ['1.4', '1.5', '1.6', '1.7', '1.8'],
  '2': ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'],
  '3': ['2.4', '2.5', '2.6', '2.7', '2.8'],
  '4': ['4.4', '4.5', '4.6', '4.7', '4.8'],
  '5': ['4.1', '4.2', '4.3', '3.1', '3.2', '3.3'],
  '6': ['3.4', '3.5', '3.6', '3.7', '3.8'],
};

export const ARCH_TEETH: Record<string, string[]> = {
  superior: [...QUADRANT_TEETH['1'], ...QUADRANT_TEETH['2']],
  inferior: [...QUADRANT_TEETH['3'], ...QUADRANT_TEETH['4']],
};

function zoneKeyForTooth(mode: OdontogramMode, tooth: string): string | null {
  const quadrant = tooth.split('.')[0];
  if (mode === 'cuadrante') return quadrant in QUADRANT_TEETH ? quadrant : null;
  if (mode === 'arcada') return quadrant === '1' || quadrant === '2' ? 'superior' : quadrant === '3' || quadrant === '4' ? 'inferior' : null;
  if (mode === 'sextante') {
    return Object.keys(SEXTANT_TEETH).find((key) => SEXTANT_TEETH[key].includes(tooth)) ?? null;
  }
  return null;
}

// Piezas que se marcan en conjunto al hacer clic en `tooth` bajo `mode`
// (toda la zona a la que pertenece). Para dentición temporal, o si la pieza
// no pertenece a ninguna zona conocida, cae a la pieza sola.
function zoneTeethFor(mode: OdontogramMode, tooth: string): string[] {
  if (mode === 'cuadrante') return QUADRANT_TEETH[zoneKeyForTooth(mode, tooth) ?? ''] ?? [tooth];
  if (mode === 'sextante') return SEXTANT_TEETH[zoneKeyForTooth(mode, tooth) ?? ''] ?? [tooth];
  if (mode === 'arcada') return ARCH_TEETH[zoneKeyForTooth(mode, tooth) ?? ''] ?? [tooth];
  return [tooth];
}

const ZONE_MODES: OdontogramMode[] = ['extraction', 'cuadrante', 'sextante', 'arcada'];

export const SURFACE_LABELS: Record<ToothSurface, string> = {
  top: 'superior',
  right: 'derecha',
  bottom: 'inferior',
  left: 'izquierda',
  center: 'central',
};

const DRAFT_FILL = '#0ea5e9';
const DRAFT_STROKE = '#0369a1';
const DEFAULT_MARK_COLOR = '#16a34a';
const DEFAULT_EXTRACTION_COLOR = '#1e3a8a';

type NumberPosition = 'top' | 'bottom';

function wholeToothSurfaces(selection: ToothSelection[], tooth: string): number {
  return selection.filter((item) => item.tooth === tooth).length;
}

interface ToothIconProps {
  number: string;
  small?: boolean;
  disabled: boolean;
  getFaceFill: (surface: ToothSurface) => { fill: string; stroke: string };
  crossed: boolean;
  crossColor?: string;
  onFaceClick: (surface: ToothSurface) => void;
}

function ToothIcon({ number, small = false, disabled, getFaceFill, crossed, crossColor, onFaceClick }: ToothIconProps) {
  function handleKeyboard(event: React.KeyboardEvent<SVGElement>, surface: ToothSurface) {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onFaceClick(surface);
    }
  }

  function faceProps(surface: ToothSurface) {
    const { fill, stroke } = getFaceFill(surface);
    return {
      fill,
      stroke,
      strokeWidth: '1.7',
      className: disabled ? 'cursor-default' : 'cursor-pointer transition-colors duration-150 outline-none hover:opacity-80 focus:outline-none',
      role: disabled ? undefined : ('button' as const),
      tabIndex: disabled ? undefined : 0,
      'aria-label': `Pieza ${number}, cara ${SURFACE_LABELS[surface]}`,
      onClick: disabled ? undefined : () => onFaceClick(surface),
      onKeyDown: disabled ? undefined : (event: React.KeyboardEvent<SVGElement>) => handleKeyboard(event, surface),
    };
  }

  return (
    <svg viewBox="0 0 44 44" className={small ? 'h-8 w-8' : 'h-10 w-10'} aria-label={`Pieza dental ${number}`}>
      {/* Zona superior */}
      <path
        d="
          M 8.56 8.56
          A 19 19 0 0 1 35.44 8.56
          L 28.36 15.64
          A 9 9 0 0 0 15.64 15.64
          Z
        "
        strokeLinejoin="round"
        {...faceProps('top')}
      />

      {/* Zona derecha */}
      <path
        d="
          M 35.44 8.56
          A 19 19 0 0 1 35.44 35.44
          L 28.36 28.36
          A 9 9 0 0 0 28.36 15.64
          Z
        "
        strokeLinejoin="round"
        {...faceProps('right')}
      />

      {/* Zona inferior */}
      <path
        d="
          M 35.44 35.44
          A 19 19 0 0 1 8.56 35.44
          L 15.64 28.36
          A 9 9 0 0 0 28.36 28.36
          Z
        "
        strokeLinejoin="round"
        {...faceProps('bottom')}
      />

      {/* Zona izquierda */}
      <path
        d="
          M 8.56 35.44
          A 19 19 0 0 1 8.56 8.56
          L 15.64 15.64
          A 9 9 0 0 0 15.64 28.36
          Z
        "
        strokeLinejoin="round"
        {...faceProps('left')}
      />

      {/* Zona central */}
      <circle cx="22" cy="22" r="9" {...faceProps('center')} />

      {crossed && (
        <g className="pointer-events-none" stroke={crossColor ?? '#2563eb'} strokeWidth="4" strokeLinecap="round">
          <line x1="6" y1="6" x2="38" y2="38" />
          <line x1="38" y1="6" x2="6" y2="38" />
        </g>
      )}
    </svg>
  );
}

interface ToothProps {
  number: string;
  small?: boolean;
  quadrantStart: boolean;
  numberPosition: NumberPosition;
  mode: OdontogramMode;
  disabled: boolean;
  highlighted: boolean;
  getFaceFill: (surface: ToothSurface) => { fill: string; stroke: string };
  crossed: boolean;
  crossColor?: string;
  onFaceClick: (surface: ToothSurface) => void;
  onWholeToothClick: () => void;
}

function Tooth({
  number,
  small = false,
  quadrantStart,
  numberPosition,
  mode,
  disabled,
  highlighted,
  getFaceFill,
  crossed,
  crossColor,
  onFaceClick,
  onWholeToothClick,
}: ToothProps) {
  const numberAriaLabel =
    mode === 'extraction' ? `Seleccionar pieza ${number} para extracción` : `Seleccionar pieza completa ${number}`;

  const numberButton = (
    <button
      type="button"
      disabled={disabled}
      onClick={onWholeToothClick}
      title={numberAriaLabel}
      aria-label={numberAriaLabel}
      aria-pressed={highlighted}
      className={`
        rounded px-1 py-0.5 font-semibold transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
        ${small ? 'text-[9px]' : 'text-[10px]'}
        ${
          highlighted
            ? 'bg-brand-100 text-brand-700'
            : disabled
              ? 'text-slate-400'
              : 'text-slate-500 hover:bg-slate-100 hover:text-brand-600'
        }
      `}
    >
      {number}
    </button>
  );

  return (
    <div
      className={`
        flex shrink-0 flex-col items-center gap-1
        ${
          quadrantStart
            ? small
              ? 'ml-2 border-l-2 border-slate-400 pl-2'
              : 'ml-3 border-l-2 border-slate-400 pl-3'
            : ''
        }
      `}
    >
      {numberPosition === 'top' && numberButton}

      <ToothIcon
        number={number}
        small={small}
        disabled={disabled}
        getFaceFill={getFaceFill}
        crossed={crossed}
        crossColor={crossColor}
        onFaceClick={onFaceClick}
      />

      {numberPosition === 'bottom' && numberButton}
    </div>
  );
}

interface ToothRowProps {
  teeth: readonly string[];
  splitAt: number;
  numberPosition: NumberPosition;
  small?: boolean;
  mode: OdontogramMode;
  disabled: boolean;
  getToothVisual: (tooth: string) => {
    highlighted: boolean;
    crossed: boolean;
    crossColor?: string;
    getFaceFill: (surface: ToothSurface) => { fill: string; stroke: string };
  };
  onFaceClick: (tooth: string, surface: ToothSurface) => void;
  onWholeToothClick: (tooth: string) => void;
}

function ToothRow({
  teeth,
  splitAt,
  numberPosition,
  small = false,
  mode,
  disabled,
  getToothVisual,
  onFaceClick,
  onWholeToothClick,
}: ToothRowProps) {
  return (
    <div className={`flex justify-center ${small ? 'gap-1' : 'gap-1.5'}`}>
      {teeth.map((number, index) => {
        const visual = getToothVisual(number);
        return (
          <Tooth
            key={number}
            number={number}
            small={small}
            quadrantStart={index === splitAt}
            numberPosition={numberPosition}
            mode={mode}
            disabled={disabled}
            highlighted={visual.highlighted}
            getFaceFill={visual.getFaceFill}
            crossed={visual.crossed}
            crossColor={visual.crossColor}
            onFaceClick={(surface) => onFaceClick(number, surface)}
            onWholeToothClick={() => onWholeToothClick(number)}
          />
        );
      })}
    </div>
  );
}

interface DentalSectionProps {
  title: string;
  upper: readonly string[];
  lower: readonly string[];
  upperQuadrants: [string, string];
  lowerQuadrants: [string, string];
  splitAt: number;
  small?: boolean;
  mode: OdontogramMode;
  disabled: boolean;
  getToothVisual: (tooth: string) => {
    highlighted: boolean;
    crossed: boolean;
    crossColor?: string;
    getFaceFill: (surface: ToothSurface) => { fill: string; stroke: string };
  };
  onFaceClick: (tooth: string, surface: ToothSurface) => void;
  onWholeToothClick: (tooth: string) => void;
}

function DentalSection({
  title,
  upper,
  lower,
  upperQuadrants,
  lowerQuadrants,
  splitAt,
  small = false,
  mode,
  disabled,
  getToothVisual,
  onFaceClick,
  onWholeToothClick,
}: DentalSectionProps) {
  return (
    <section>
      <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>

      <div className="mx-auto w-fit min-w-max">
        <div className={`mb-1 grid grid-cols-2 text-center font-bold text-slate-600 ${small ? 'text-sm' : 'text-lg'}`}>
          <span>{upperQuadrants[0]}</span>
          <span>{upperQuadrants[1]}</span>
        </div>

        <ToothRow
          teeth={upper}
          splitAt={splitAt}
          numberPosition="top"
          small={small}
          mode={mode}
          disabled={disabled}
          getToothVisual={getToothVisual}
          onFaceClick={onFaceClick}
          onWholeToothClick={onWholeToothClick}
        />

        <div className="my-2 border-t-2 border-slate-400" />

        <ToothRow
          teeth={lower}
          splitAt={splitAt}
          numberPosition="bottom"
          small={small}
          mode={mode}
          disabled={disabled}
          getToothVisual={getToothVisual}
          onFaceClick={onFaceClick}
          onWholeToothClick={onWholeToothClick}
        />

        <div className={`mt-1 grid grid-cols-2 text-center font-bold text-slate-600 ${small ? 'text-sm' : 'text-lg'}`}>
          <span>{lowerQuadrants[0]}</span>
          <span>{lowerQuadrants[1]}</span>
        </div>
      </div>
    </section>
  );
}

const MODE_HINTS: Record<OdontogramMode, string> = {
  session: 'Esta prestación aplica a toda la boca.',
  tooth: 'Haz clic en las caras de cada pieza (el número selecciona las 5 caras).',
  surface: 'Haz clic en las caras afectadas de cada pieza (el número selecciona las 5 caras).',
  extraction: 'Haz clic en la(s) pieza(s) a marcar para extracción.',
  cuadrante: 'Haz clic en cualquier pieza del cuadrante para marcarlo completo.',
  sextante: 'Haz clic en cualquier pieza del sextante para marcarlo completo.',
  arcada: 'Haz clic en cualquier pieza de la arcada para marcarla completa.',
};

export function Odontogram({
  mode,
  selection,
  onSelectionChange,
  marks,
}: {
  mode: OdontogramMode;
  selection: ToothSelection[];
  onSelectionChange: (selection: ToothSelection[]) => void;
  marks: OdontogramMark[];
}) {
  const disabled = mode === 'session';

  function toggleFace(tooth: string, surface: ToothSurface) {
    if (disabled) return;

    // La extracción, y las selecciones por cuadrante/sextante/arcada, son por
    // zona completa (no tiene sentido marcar "una cara" de una extracción o de
    // medio cuadrante), así que ahí cualquier clic marca/desmarca toda la zona
    // a la que pertenece la pieza clickeada. En 'tooth' y 'surface' cada cara
    // se selecciona de forma independiente, igual que siempre — el número de
    // la pieza sigue siendo el atajo para marcar las 5 caras de una vez.
    if (ZONE_MODES.includes(mode)) {
      toggleWholeGroup(zoneTeethFor(mode, tooth));
      return;
    }

    const exists = selection.some((item) => item.tooth === tooth && item.surface === surface);
    if (exists) {
      onSelectionChange(selection.filter((item) => !(item.tooth === tooth && item.surface === surface)));
      return;
    }
    onSelectionChange([...selection, { tooth, surface }]);
  }

  function toggleWholeGroup(teeth: string[]) {
    if (disabled) return;

    const teethSet = new Set(teeth);
    const otherTeeth = selection.filter((item) => !teethSet.has(item.tooth));
    const fullySelected = teeth.every((t) => wholeToothSurfaces(selection, t) === TOOTH_SURFACES.length);

    if (fullySelected) {
      onSelectionChange(otherTeeth);
      return;
    }

    const completeGroup: ToothSelection[] = teeth.flatMap((t) => TOOTH_SURFACES.map((surface) => ({ tooth: t, surface })));
    onSelectionChange([...otherTeeth, ...completeGroup]);
  }

  function handleWholeToothClick(tooth: string) {
    if (disabled) return;
    // En modos por zona, el número de cualquier pieza de la zona selecciona la
    // zona entera (mismo atajo que hacer clic en una de sus caras).
    toggleWholeGroup(ZONE_MODES.includes(mode) ? zoneTeethFor(mode, tooth) : [tooth]);
  }

  function markFor(tooth: string): OdontogramMark | null {
    return marks.find((m) => m.tooth === tooth) ?? null;
  }

  function getToothVisual(tooth: string) {
    const mark = markFor(tooth);
    const draftSurfaces = new Set(selection.filter((item) => item.tooth === tooth).map((item) => item.surface));
    const draftWhole = draftSurfaces.size === TOOTH_SURFACES.length;

    function getFaceFill(surface: ToothSurface): { fill: string; stroke: string } {
      // La selección provisional (lo que se está configurando ahora) siempre
      // se ve por encima de una marca ya guardada en esa misma cara.
      if (draftSurfaces.has(surface)) {
        return { fill: DRAFT_FILL, stroke: DRAFT_STROKE };
      }
      if (mark && mark.mode !== 'extraction' && mark.surfaces.includes(surface)) {
        const color = mark.color ?? DEFAULT_MARK_COLOR;
        return { fill: color, stroke: color };
      }
      return { fill: '#ffffff', stroke: '#94a3b8' };
    }

    const savedCrossed = mark?.mode === 'extraction';
    const draftCrossed = mode === 'extraction' && draftWhole;

    return {
      highlighted: draftSurfaces.size > 0 || mark !== null,
      crossed: savedCrossed || draftCrossed,
      crossColor: savedCrossed ? (mark?.color ?? DEFAULT_EXTRACTION_COLOR) : DRAFT_FILL,
      getFaceFill,
    };
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-700">Selección de piezas y caras</h2>
            <p className="mt-0.5 text-xs text-slate-500">{MODE_HINTS[mode]}</p>
          </div>

          <span
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
              mode === 'session' ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white text-slate-500'
            }`}
          >
            Sesión · Toda la boca
          </span>
        </div>

        <div className="overflow-x-auto p-4">
          <div className="mx-auto flex min-w-[790px] flex-col gap-7">
            <DentalSection
              title="Dentición permanente"
              upper={UPPER_PERMANENT}
              lower={LOWER_PERMANENT}
              upperQuadrants={['1', '2']}
              lowerQuadrants={['4', '3']}
              splitAt={8}
              mode={mode}
              disabled={disabled}
              getToothVisual={getToothVisual}
              onFaceClick={toggleFace}
              onWholeToothClick={handleWholeToothClick}
            />

            <div className="border-t border-dashed border-slate-300" />

            <DentalSection
              title="Dentición temporal"
              upper={UPPER_DECIDUOUS}
              lower={LOWER_DECIDUOUS}
              upperQuadrants={['5', '6']}
              lowerQuadrants={['8', '7']}
              splitAt={5}
              small
              mode={mode}
              disabled={disabled}
              getToothVisual={getToothVisual}
              onFaceClick={toggleFace}
              onWholeToothClick={handleWholeToothClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
