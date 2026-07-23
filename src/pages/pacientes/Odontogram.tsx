import {
  useId,
  type KeyboardEvent,
} from 'react';

/* =========================================================
 * PIEZAS
 * ======================================================= */

const UPPER_PERMANENT = [
  '1.8',
  '1.7',
  '1.6',
  '1.5',
  '1.4',
  '1.3',
  '1.2',
  '1.1',
  '2.1',
  '2.2',
  '2.3',
  '2.4',
  '2.5',
  '2.6',
  '2.7',
  '2.8',
] as const;

const LOWER_PERMANENT = [
  '4.8',
  '4.7',
  '4.6',
  '4.5',
  '4.4',
  '4.3',
  '4.2',
  '4.1',
  '3.1',
  '3.2',
  '3.3',
  '3.4',
  '3.5',
  '3.6',
  '3.7',
  '3.8',
] as const;

const UPPER_DECIDUOUS = [
  '5.5',
  '5.4',
  '5.3',
  '5.2',
  '5.1',
  '6.1',
  '6.2',
  '6.3',
  '6.4',
  '6.5',
] as const;

const LOWER_DECIDUOUS = [
  '8.5',
  '8.4',
  '8.3',
  '8.2',
  '8.1',
  '7.1',
  '7.2',
  '7.3',
  '7.4',
  '7.5',
] as const;

/* =========================================================
 * TIPOS
 * ======================================================= */

export const TOOTH_SURFACES = [
  'top',
  'right',
  'bottom',
  'left',
  'center',
] as const;

export type ToothSurface =
  (typeof TOOTH_SURFACES)[number];

export type OdontogramMode =
  | 'session'
  | 'tooth'
  | 'surface'
  | 'extraction'
  | 'cuadrante'
  | 'sextante'
  | 'arcada';

export type QuadrantKey =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8';

export type SextantKey =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6';

export type ArchKey =
  | 'superior'
  | 'inferior';

export interface ToothSelection {
  tooth: string;
  surface: ToothSurface;
}

export interface OdontogramMark {
  tooth: string;
  mode: Exclude<OdontogramMode, 'session'>;
  surfaces: ToothSurface[];
  color?: string;
}

interface FaceStyle {
  fill: string;
  stroke: string;
}

interface ToothVisual {
  highlighted: boolean;
  selectedSurfaceCount: number;
  wholeToothSelected: boolean;
  crossed: boolean;
  crossColor?: string;
  getFaceStyle: (
    surface: ToothSurface,
  ) => FaceStyle;
}

interface OdontogramProps {
  mode: OdontogramMode;

  selection: ToothSelection[];

  onSelectionChange: (
    selection: ToothSelection[],
  ) => void;

  marks?: OdontogramMark[];

  /**
   * Permite cambiar de modo desde los selectores gráficos:
   * sesión, arcada, cuadrante y sextante.
   */
  onModeChange?: (
    mode: OdontogramMode,
  ) => void;

  /**
   * Modos disponibles para la prestación activa.
   */
  allowedModes?: OdontogramMode[];
}

/* =========================================================
 * AGRUPACIONES
 * ======================================================= */

export const QUADRANT_TEETH: Record<
  QuadrantKey,
  readonly string[]
> = {
  '1': [
    '1.8',
    '1.7',
    '1.6',
    '1.5',
    '1.4',
    '1.3',
    '1.2',
    '1.1',
  ],

  '2': [
    '2.1',
    '2.2',
    '2.3',
    '2.4',
    '2.5',
    '2.6',
    '2.7',
    '2.8',
  ],

  '3': [
    '3.1',
    '3.2',
    '3.3',
    '3.4',
    '3.5',
    '3.6',
    '3.7',
    '3.8',
  ],

  '4': [
    '4.8',
    '4.7',
    '4.6',
    '4.5',
    '4.4',
    '4.3',
    '4.2',
    '4.1',
  ],

  '5': [
    '5.5',
    '5.4',
    '5.3',
    '5.2',
    '5.1',
  ],

  '6': [
    '6.1',
    '6.2',
    '6.3',
    '6.4',
    '6.5',
  ],

  '7': [
    '7.1',
    '7.2',
    '7.3',
    '7.4',
    '7.5',
  ],

  '8': [
    '8.5',
    '8.4',
    '8.3',
    '8.2',
    '8.1',
  ],
};

/**
 * Los terceros molares no se incluyen
 * dentro de los sextantes.
 */
export const SEXTANT_TEETH: Record<
  SextantKey,
  readonly string[]
> = {
  '1': [
    '1.7',
    '1.6',
    '1.5',
    '1.4',
  ],

  '2': [
    '1.3',
    '1.2',
    '1.1',
    '2.1',
    '2.2',
    '2.3',
  ],

  '3': [
    '2.4',
    '2.5',
    '2.6',
    '2.7',
  ],

  '4': [
    '4.7',
    '4.6',
    '4.5',
    '4.4',
  ],

  '5': [
    '4.3',
    '4.2',
    '4.1',
    '3.1',
    '3.2',
    '3.3',
  ],

  '6': [
    '3.4',
    '3.5',
    '3.6',
    '3.7',
  ],
};

export const ARCH_TEETH: Record<
  ArchKey,
  readonly string[]
> = {
  superior: [
    ...UPPER_PERMANENT,
    ...UPPER_DECIDUOUS,
  ],

  inferior: [
    ...LOWER_PERMANENT,
    ...LOWER_DECIDUOUS,
  ],
};

/* =========================================================
 * CONFIGURACIÓN VISUAL
 * ======================================================= */

export const SURFACE_LABELS: Record<
  ToothSurface,
  string
> = {
  top: 'superior',
  right: 'derecha',
  bottom: 'inferior',
  left: 'izquierda',
  center: 'central',
};

const ALL_MODES: OdontogramMode[] = [
  'session',
  'tooth',
  'surface',
  'extraction',
  'cuadrante',
  'sextante',
  'arcada',
];

const GROUP_MODES: OdontogramMode[] = [
  'cuadrante',
  'sextante',
  'arcada',
];

const MODE_HINTS: Record<
  OdontogramMode,
  string
> = {
  session:
    'Esta prestación aplica a toda la boca.',

  tooth:
    'Haz clic en una cara o usa el círculo inferior para seleccionar la pieza completa.',

  surface:
    'Haz clic en las caras afectadas. El círculo inferior selecciona la pieza completa.',

  extraction:
    'Haz clic en una pieza para marcarla con una X.',

  cuadrante:
    'Haz clic en el número del cuadrante o en cualquiera de sus piezas.',

  sextante:
    'Haz clic directamente sobre una zona del selector de sextantes.',

  arcada:
    'Haz clic en la mitad superior o inferior del selector de arcadas.',
};

const DRAFT_FILL = '#0ea5e9';
const DRAFT_STROKE = '#0369a1';

const SAVED_FILL = '#16a34a';
const EXTRACTION_COLOR = '#1e3a8a';

const EMPTY_FILL = '#ffffff';
const EMPTY_STROKE = '#94a3b8';

const DISABLED_FILL = '#f8fafc';
const DISABLED_STROKE = '#cbd5e1';

/* =========================================================
 * UTILIDADES
 * ======================================================= */

function uniqueSelection(
  selection: ToothSelection[],
): ToothSelection[] {
  const seen = new Set<string>();

  return selection.filter((item) => {
    const key =
      `${item.tooth}:${item.surface}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getToothSurfaces(
  selection: ToothSelection[],
  tooth: string,
): Set<ToothSurface> {
  return new Set(
    selection
      .filter(
        (item) =>
          item.tooth === tooth,
      )
      .map(
        (item) =>
          item.surface,
      ),
  );
}

function isWholeToothSelected(
  selection: ToothSelection[],
  tooth: string,
): boolean {
  const surfaces =
    getToothSurfaces(
      selection,
      tooth,
    );

  return TOOTH_SURFACES.every(
    (surface) =>
      surfaces.has(surface),
  );
}

function isWholeGroupSelected(
  selection: ToothSelection[],
  teeth: readonly string[],
): boolean {
  return (
    teeth.length > 0 &&
    teeth.every(
      (tooth) =>
        isWholeToothSelected(
          selection,
          tooth,
        ),
    )
  );
}

function createWholeToothSelection(
  tooth: string,
): ToothSelection[] {
  return TOOTH_SURFACES.map(
    (surface) => ({
      tooth,
      surface,
    }),
  );
}

function createWholeGroupSelection(
  teeth: readonly string[],
): ToothSelection[] {
  return teeth.flatMap(
    (tooth) =>
      createWholeToothSelection(
        tooth,
      ),
  );
}

function getQuadrantForTooth(
  tooth: string,
): QuadrantKey | null {
  const quadrant =
    tooth.split('.')[0];

  if (
    quadrant === '1' ||
    quadrant === '2' ||
    quadrant === '3' ||
    quadrant === '4' ||
    quadrant === '5' ||
    quadrant === '6' ||
    quadrant === '7' ||
    quadrant === '8'
  ) {
    return quadrant;
  }

  return null;
}

function getSextantForTooth(
  tooth: string,
): SextantKey | null {
  const entry = (
    Object.entries(
      SEXTANT_TEETH,
    ) as [
      SextantKey,
      readonly string[],
    ][]
  ).find(
    ([, teeth]) =>
      teeth.includes(tooth),
  );

  return entry?.[0] ?? null;
}

function getArchForTooth(
  tooth: string,
): ArchKey | null {
  if (
    ARCH_TEETH.superior.includes(
      tooth,
    )
  ) {
    return 'superior';
  }

  if (
    ARCH_TEETH.inferior.includes(
      tooth,
    )
  ) {
    return 'inferior';
  }

  return null;
}

function getZoneTeeth(
  mode: OdontogramMode,
  tooth: string,
): readonly string[] {
  if (mode === 'cuadrante') {
    const quadrant =
      getQuadrantForTooth(tooth);

    return quadrant
      ? QUADRANT_TEETH[quadrant]
      : [];
  }

  if (mode === 'sextante') {
    const sextant =
      getSextantForTooth(tooth);

    return sextant
      ? SEXTANT_TEETH[sextant]
      : [];
  }

  if (mode === 'arcada') {
    const arch =
      getArchForTooth(tooth);

    return arch
      ? ARCH_TEETH[arch]
      : [];
  }

  return [tooth];
}

function joinClassNames(
  ...classes: Array<
    string | false | null | undefined
  >
): string {
  return classes
    .filter(Boolean)
    .join(' ');
}

/* =========================================================
 * SVG DE CADA PIEZA
 * ======================================================= */

interface ToothIconProps {
  number: string;
  small?: boolean;
  disabled: boolean;

  crossed: boolean;
  crossColor?: string;

  getFaceStyle: (
    surface: ToothSurface,
  ) => FaceStyle;

  onFaceClick: (
    surface: ToothSurface,
  ) => void;
}

function ToothIcon({
  number,
  small = false,
  disabled,
  crossed,
  crossColor,
  getFaceStyle,
  onFaceClick,
}: ToothIconProps) {
  function handleKeyboard(
    event: KeyboardEvent<SVGElement>,
    surface: ToothSurface,
  ) {
    if (disabled) {
      return;
    }

    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      onFaceClick(surface);
    }
  }

  function faceProps(
    surface: ToothSurface,
  ) {
    const {
      fill,
      stroke,
    } = getFaceStyle(surface);

    return {
      fill,
      stroke,
      strokeWidth: 1.7,

      role: disabled
        ? undefined
        : ('button' as const),

      tabIndex: disabled
        ? undefined
        : 0,

      'aria-label':
        `Pieza ${number}, cara ${SURFACE_LABELS[surface]}`,

      className: disabled
        ? 'cursor-default outline-none'
        : joinClassNames(
            'cursor-pointer outline-none',
            'transition-opacity duration-150',
            'hover:opacity-75',
            'focus:opacity-75',
          ),

      onClick: disabled
        ? undefined
        : () =>
            onFaceClick(surface),

      onKeyDown: disabled
        ? undefined
        : (
            event: KeyboardEvent<SVGElement>,
          ) =>
            handleKeyboard(
              event,
              surface,
            ),
    };
  }

  return (
    <svg
      viewBox="0 0 44 44"
      aria-label={`Pieza dental ${number}`}
      className={
        small
          ? 'h-8 w-8'
          : 'h-10 w-10'
      }
    >
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

      <circle
        cx="22"
        cy="22"
        r="9"
        {...faceProps('center')}
      />

      {crossed && (
        <g
          className="pointer-events-none"
          stroke={
            crossColor ??
            EXTRACTION_COLOR
          }
          strokeWidth="4"
          strokeLinecap="round"
        >
          <line
            x1="6"
            y1="6"
            x2="38"
            y2="38"
          />

          <line
            x1="38"
            y1="6"
            x2="6"
            y2="38"
          />
        </g>
      )}
    </svg>
  );
}

/* =========================================================
 * SELECTOR DE PIEZA COMPLETA
 * ======================================================= */

interface WholeToothControlProps {
  number: string;
  disabled: boolean;
  selectedSurfaceCount: number;
  wholeToothSelected: boolean;
  onClick: () => void;
}

function WholeToothControl({
  number,
  disabled,
  selectedSurfaceCount,
  wholeToothSelected,
  onClick,
}: WholeToothControlProps) {
  const partiallySelected =
    selectedSurfaceCount > 0 &&
    !wholeToothSelected;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={
        `Seleccionar pieza completa ${number}`
      }
      aria-pressed={
        wholeToothSelected
      }
      title={
        `Seleccionar pieza completa ${number}`
      }
      className={joinClassNames(
        'flex h-4 w-4 items-center justify-center',
        'rounded-full border',
        'text-[8px] font-bold leading-none',
        'transition-colors',
        'focus:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-brand-500',
        disabled &&
          'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-200',
        !disabled &&
          wholeToothSelected &&
          'border-brand-500 bg-brand-500 text-white',
        !disabled &&
          partiallySelected &&
          'border-brand-400 bg-brand-100 text-brand-600',
        !disabled &&
          !wholeToothSelected &&
          !partiallySelected &&
          'border-slate-300 bg-white text-slate-300 hover:border-brand-400',
      )}
    >
      {wholeToothSelected
        ? '✓'
        : partiallySelected
          ? '•'
          : '✓'}
    </button>
  );
}

/* =========================================================
 * PIEZA COMPLETA
 * ======================================================= */

interface ToothProps {
  number: string;
  small?: boolean;
  quadrantStart: boolean;

  mode: OdontogramMode;
  disabled: boolean;

  visual: ToothVisual;

  onFaceClick: (
    surface: ToothSurface,
  ) => void;

  onWholeToothClick: () => void;
}

function Tooth({
  number,
  small = false,
  quadrantStart,
  mode,
  disabled,
  visual,
  onFaceClick,
  onWholeToothClick,
}: ToothProps) {
  return (
    <div
      className={joinClassNames(
        'flex shrink-0 flex-col items-center gap-1',
        quadrantStart &&
          (
            small
              ? 'ml-2 border-l-2 border-slate-400 pl-2'
              : 'ml-3 border-l-2 border-slate-400 pl-3'
          ),
      )}
    >
      <span
        className={joinClassNames(
          'rounded px-1 py-0.5 font-semibold',
          small
            ? 'text-[9px]'
            : 'text-[10px]',
          visual.highlighted
            ? 'bg-brand-100 text-brand-700'
            : 'text-slate-500',
        )}
      >
        {number}
      </span>

      <ToothIcon
        number={number}
        small={small}
        disabled={disabled}
        crossed={visual.crossed}
        crossColor={
          visual.crossColor
        }
        getFaceStyle={
          visual.getFaceStyle
        }
        onFaceClick={
          onFaceClick
        }
      />

      <WholeToothControl
        number={number}
        disabled={disabled}
        selectedSurfaceCount={
          visual.selectedSurfaceCount
        }
        wholeToothSelected={
          visual.wholeToothSelected
        }
        onClick={
          onWholeToothClick
        }
      />

      {mode === 'extraction' &&
        visual.crossed && (
          <span className="text-[8px] font-semibold text-blue-700">
            Extraer
          </span>
        )}
    </div>
  );
}

/* =========================================================
 * FILA DE PIEZAS
 * ======================================================= */

interface ToothRowProps {
  teeth: readonly string[];
  splitAt: number;
  small?: boolean;

  mode: OdontogramMode;

  getVisual: (
    tooth: string,
  ) => ToothVisual;

  isDisabled: (
    tooth: string,
  ) => boolean;

  onFaceClick: (
    tooth: string,
    surface: ToothSurface,
  ) => void;

  onWholeToothClick: (
    tooth: string,
  ) => void;
}

function ToothRow({
  teeth,
  splitAt,
  small = false,
  mode,
  getVisual,
  isDisabled,
  onFaceClick,
  onWholeToothClick,
}: ToothRowProps) {
  return (
    <div
      className={joinClassNames(
        'flex justify-center',
        small
          ? 'gap-1'
          : 'gap-1.5',
      )}
    >
      {teeth.map(
        (
          tooth,
          index,
        ) => {
          const visual =
            getVisual(tooth);

          return (
            <Tooth
              key={tooth}
              number={tooth}
              small={small}
              quadrantStart={
                index === splitAt
              }
              mode={mode}
              disabled={
                isDisabled(tooth)
              }
              visual={visual}
              onFaceClick={(
                surface,
              ) =>
                onFaceClick(
                  tooth,
                  surface,
                )
              }
              onWholeToothClick={() =>
                onWholeToothClick(
                  tooth,
                )
              }
            />
          );
        },
      )}
    </div>
  );
}

/* =========================================================
 * CUADRANTES INTEGRADOS
 * ======================================================= */

interface QuadrantPairProps {
  left: QuadrantKey;
  right: QuadrantKey;

  selection: ToothSelection[];

  disabled: boolean;
  compact?: boolean;

  onSelect: (
    quadrant: QuadrantKey,
  ) => void;
}

function QuadrantPair({
  left,
  right,
  selection,
  disabled,
  compact = false,
  onSelect,
}: QuadrantPairProps) {
  function renderButton(
    quadrant: QuadrantKey,
  ) {
    const selected =
      isWholeGroupSelected(
        selection,
        QUADRANT_TEETH[quadrant],
      );

    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={
          `Seleccionar cuadrante ${quadrant}`
        }
        aria-pressed={selected}
        onClick={() =>
          onSelect(quadrant)
        }
        className={joinClassNames(
          'mx-auto flex items-center justify-center',
          'rounded-full border font-bold',
          'transition-colors',
          'focus:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-brand-500',
          compact
            ? 'h-6 w-6 text-xs'
            : 'h-8 w-8 text-sm',
          disabled &&
            'cursor-not-allowed border-transparent text-slate-400',
          !disabled &&
            selected &&
            'border-brand-500 bg-brand-500 text-white',
          !disabled &&
            !selected &&
            'border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:text-brand-600',
        )}
      >
        {quadrant}
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2">
      {renderButton(left)}
      {renderButton(right)}
    </div>
  );
}

/* =========================================================
 * SELECTOR GRÁFICO DE ARCADAS
 * ======================================================= */

interface ArchSelectorProps {
  selection: ToothSelection[];
  disabled: boolean;

  onSelect: (
    arch: ArchKey,
  ) => void;
}

function ArchSelector({
  selection,
  disabled,
  onSelect,
}: ArchSelectorProps) {
  const upperSelected =
    isWholeGroupSelected(
      selection,
      ARCH_TEETH.superior,
    );

  const lowerSelected =
    isWholeGroupSelected(
      selection,
      ARCH_TEETH.inferior,
    );

  const dots = [
    [31, 42],
    [40, 32],
    [50, 26],
    [60, 24],
    [70, 26],
    [80, 32],
    [89, 42],

    [31, 108],
    [40, 118],
    [50, 124],
    [60, 126],
    [70, 124],
    [80, 118],
    [89, 108],
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Arcadas
      </p>

      <svg
        viewBox="0 0 120 150"
        className="h-36 w-28"
        aria-label="Selector de arcadas"
      >
        <path
          d="
            M 15 75
            A 45 60 0 0 1 105 75
            L 15 75
            Z
          "
          role={
            disabled
              ? undefined
              : 'button'
          }
          tabIndex={
            disabled
              ? undefined
              : 0
          }
          aria-label="Seleccionar arcada superior"
          fill={
            upperSelected
              ? DRAFT_FILL
              : '#ffffff'
          }
          stroke={
            upperSelected
              ? DRAFT_STROKE
              : '#94a3b8'
          }
          strokeWidth="2"
          className={
            disabled
              ? 'cursor-default'
              : 'cursor-pointer hover:opacity-80'
          }
          onClick={
            disabled
              ? undefined
              : () =>
                  onSelect(
                    'superior',
                  )
          }
        />

        <path
          d="
            M 15 75
            A 45 60 0 0 0 105 75
            L 15 75
            Z
          "
          role={
            disabled
              ? undefined
              : 'button'
          }
          tabIndex={
            disabled
              ? undefined
              : 0
          }
          aria-label="Seleccionar arcada inferior"
          fill={
            lowerSelected
              ? DRAFT_FILL
              : '#ffffff'
          }
          stroke={
            lowerSelected
              ? DRAFT_STROKE
              : '#94a3b8'
          }
          strokeWidth="2"
          className={
            disabled
              ? 'cursor-default'
              : 'cursor-pointer hover:opacity-80'
          }
          onClick={
            disabled
              ? undefined
              : () =>
                  onSelect(
                    'inferior',
                  )
          }
        />

        <line
          x1="15"
          y1="75"
          x2="105"
          y2="75"
          stroke="#94a3b8"
          strokeWidth="1.5"
          className="pointer-events-none"
        />

        {dots.map(
          (
            [cx, cy],
            index,
          ) => (
            <circle
              key={`${cx}-${cy}-${index}`}
              cx={cx}
              cy={cy}
              r="3.2"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1"
              className="pointer-events-none"
            />
          ),
        )}

        <text
          x="60"
          y="55"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill={
            upperSelected
              ? '#ffffff'
              : '#64748b'
          }
          className="pointer-events-none"
        >
          Superior
        </text>

        <text
          x="60"
          y="102"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill={
            lowerSelected
              ? '#ffffff'
              : '#64748b'
          }
          className="pointer-events-none"
        >
          Inferior
        </text>
      </svg>
    </div>
  );
}

/* =========================================================
 * SELECTOR GRÁFICO DE SEXTANTES
 * ======================================================= */

interface SextantSelectorProps {
  selection: ToothSelection[];
  disabled: boolean;

  onSelect: (
    sextant: SextantKey,
  ) => void;
}

function SextantSelector({
  selection,
  disabled,
  onSelect,
}: SextantSelectorProps) {
  const rawId = useId();

  const clipId =
    `sextant-${rawId.replace(
      /:/g,
      '',
    )}`;

  const sectors: Array<{
    key: SextantKey;
    points: string;
    labelX: number;
    labelY: number;
  }> = [
    {
      key: '1',
      points:
        '60,75 15,75 37,15',
      labelX: 34,
      labelY: 54,
    },
    {
      key: '2',
      points:
        '60,75 37,15 83,15',
      labelX: 60,
      labelY: 39,
    },
    {
      key: '3',
      points:
        '60,75 83,15 105,75',
      labelX: 86,
      labelY: 54,
    },
    {
      key: '4',
      points:
        '60,75 15,75 37,135',
      labelX: 34,
      labelY: 103,
    },
    {
      key: '5',
      points:
        '60,75 37,135 83,135',
      labelX: 60,
      labelY: 118,
    },
    {
      key: '6',
      points:
        '60,75 83,135 105,75',
      labelX: 86,
      labelY: 103,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Sextantes
      </p>

      <svg
        viewBox="0 0 120 150"
        className="h-36 w-28"
        aria-label="Selector de sextantes"
      >
        <defs>
          <clipPath id={clipId}>
            <ellipse
              cx="60"
              cy="75"
              rx="45"
              ry="60"
            />
          </clipPath>
        </defs>

        {sectors.map(
          ({
            key,
            points,
            labelX,
            labelY,
          }) => {
            const selected =
              isWholeGroupSelected(
                selection,
                SEXTANT_TEETH[key],
              );

            return (
              <g key={key}>
                <polygon
                  points={points}
                  clipPath={
                    `url(#${clipId})`
                  }
                  role={
                    disabled
                      ? undefined
                      : 'button'
                  }
                  tabIndex={
                    disabled
                      ? undefined
                      : 0
                  }
                  aria-label={
                    `Seleccionar sextante ${key}`
                  }
                  fill={
                    selected
                      ? DRAFT_FILL
                      : '#ffffff'
                  }
                  stroke={
                    selected
                      ? DRAFT_STROKE
                      : '#94a3b8'
                  }
                  strokeWidth="1.5"
                  className={
                    disabled
                      ? 'cursor-default'
                      : 'cursor-pointer hover:opacity-80'
                  }
                  onClick={
                    disabled
                      ? undefined
                      : () =>
                          onSelect(key)
                  }
                />

                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={
                    selected
                      ? '#ffffff'
                      : '#64748b'
                  }
                  className="pointer-events-none"
                >
                  S{key}
                </text>
              </g>
            );
          },
        )}

        <ellipse
          cx="60"
          cy="75"
          rx="45"
          ry="60"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          className="pointer-events-none"
        />
      </svg>
    </div>
  );
}

/* =========================================================
 * COMPONENTE PRINCIPAL
 * ======================================================= */

export function Odontogram({
  mode,
  selection,
  onSelectionChange,
  marks = [],
  onModeChange,
  allowedModes = ALL_MODES,
}: OdontogramProps) {
  function modeAllowed(
    targetMode: OdontogramMode,
  ): boolean {
    return allowedModes.includes(
      targetMode,
    );
  }

  function scopeControlDisabled(
    targetMode: OdontogramMode,
  ): boolean {
    if (
      !modeAllowed(targetMode)
    ) {
      return true;
    }

    if (
      mode === targetMode
    ) {
      return false;
    }

    return !onModeChange;
  }

  function changeToMode(
    targetMode: OdontogramMode,
  ): boolean {
    if (
      !modeAllowed(targetMode)
    ) {
      return false;
    }

    if (
      mode !== targetMode &&
      !onModeChange
    ) {
      return false;
    }

    if (
      mode !== targetMode
    ) {
      onModeChange?.(
        targetMode,
      );
    }

    return true;
  }

  function toggleSingleSurface(
    tooth: string,
    surface: ToothSurface,
  ) {
    const exists =
      selection.some(
        (item) =>
          item.tooth === tooth &&
          item.surface === surface,
      );

    if (exists) {
      onSelectionChange(
        selection.filter(
          (item) =>
            !(
              item.tooth === tooth &&
              item.surface === surface
            ),
        ),
      );

      return;
    }

    onSelectionChange(
      uniqueSelection([
        ...selection,
        {
          tooth,
          surface,
        },
      ]),
    );
  }

  function toggleWholeGroup(
    teeth: readonly string[],
    sourceSelection = selection,
  ) {
    if (
      teeth.length === 0
    ) {
      return;
    }

    const teethSet =
      new Set(teeth);

    const withoutGroup =
      sourceSelection.filter(
        (item) =>
          !teethSet.has(
            item.tooth,
          ),
      );

    if (
      isWholeGroupSelected(
        sourceSelection,
        teeth,
      )
    ) {
      onSelectionChange(
        withoutGroup,
      );

      return;
    }

    onSelectionChange(
      uniqueSelection([
        ...withoutGroup,
        ...createWholeGroupSelection(
          teeth,
        ),
      ]),
    );
  }

  function selectScopeGroup(
    targetMode: OdontogramMode,
    teeth: readonly string[],
  ) {
    if (
      !changeToMode(
        targetMode,
      )
    ) {
      return;
    }

    if (
      mode !== targetMode
    ) {
      onSelectionChange(
        createWholeGroupSelection(
          teeth,
        ),
      );

      return;
    }

    toggleWholeGroup(teeth);
  }

  function handleSessionChange() {
    if (
      !changeToMode('session')
    ) {
      return;
    }

    onSelectionChange([]);
  }

  function handleQuadrantSelect(
    quadrant: QuadrantKey,
  ) {
    selectScopeGroup(
      'cuadrante',
      QUADRANT_TEETH[quadrant],
    );
  }

  function handleArchSelect(
    arch: ArchKey,
  ) {
    selectScopeGroup(
      'arcada',
      ARCH_TEETH[arch],
    );
  }

  function handleSextantSelect(
    sextant: SextantKey,
  ) {
    selectScopeGroup(
      'sextante',
      SEXTANT_TEETH[sextant],
    );
  }

  function toothDisabled(
    tooth: string,
  ): boolean {
    if (
      mode === 'session'
    ) {
      return true;
    }

    if (
      mode === 'sextante' &&
      getSextantForTooth(
        tooth,
      ) === null
    ) {
      return true;
    }

    return false;
  }

  function handleFaceClick(
    tooth: string,
    surface: ToothSurface,
  ) {
    if (
      toothDisabled(tooth)
    ) {
      return;
    }

    /**
     * Cara y pieza permiten marcar caras.
     * La pieza completa se selecciona desde
     * el círculo pequeño inferior.
     */
    if (
      mode === 'surface' ||
      mode === 'tooth'
    ) {
      toggleSingleSurface(
        tooth,
        surface,
      );

      return;
    }

    if (
      mode === 'extraction'
    ) {
      toggleWholeGroup([
        tooth,
      ]);

      return;
    }

    if (
      GROUP_MODES.includes(
        mode,
      )
    ) {
      toggleWholeGroup(
        getZoneTeeth(
          mode,
          tooth,
        ),
      );
    }
  }

  function handleWholeToothClick(
    tooth: string,
  ) {
    if (
      toothDisabled(tooth)
    ) {
      return;
    }

    if (
      GROUP_MODES.includes(
        mode,
      )
    ) {
      toggleWholeGroup(
        getZoneTeeth(
          mode,
          tooth,
        ),
      );

      return;
    }

    toggleWholeGroup([
      tooth,
    ]);
  }

  function marksForTooth(
    tooth: string,
  ): OdontogramMark[] {
    return marks.filter(
      (mark) =>
        mark.tooth === tooth,
    );
  }

  function getVisual(
    tooth: string,
  ): ToothVisual {
    const savedMarks =
      marksForTooth(tooth);

    const draftSurfaces =
      getToothSurfaces(
        selection,
        tooth,
      );

    const selectedSurfaceCount =
      draftSurfaces.size;

    const wholeToothSelected =
      TOOTH_SURFACES.every(
        (surface) =>
          draftSurfaces.has(
            surface,
          ),
      );

    function getFaceStyle(
      surface: ToothSurface,
    ): FaceStyle {
      if (
        draftSurfaces.has(
          surface,
        )
      ) {
        return {
          fill: DRAFT_FILL,
          stroke: DRAFT_STROKE,
        };
      }

      const savedMark = [
        ...savedMarks,
      ]
        .reverse()
        .find(
          (mark) =>
            mark.mode !==
              'extraction' &&
            mark.surfaces.includes(
              surface,
            ),
        );

      if (savedMark) {
        const color =
          savedMark.color ??
          SAVED_FILL;

        return {
          fill: color,
          stroke: color,
        };
      }

      if (
        toothDisabled(tooth)
      ) {
        return {
          fill: DISABLED_FILL,
          stroke: DISABLED_STROKE,
        };
      }

      return {
        fill: EMPTY_FILL,
        stroke: EMPTY_STROKE,
      };
    }

    const savedExtraction = [
      ...savedMarks,
    ]
      .reverse()
      .find(
        (mark) =>
          mark.mode ===
          'extraction',
      );

    const draftExtraction =
      mode === 'extraction' &&
      wholeToothSelected;

    return {
      highlighted:
        selectedSurfaceCount > 0 ||
        savedMarks.length > 0,

      selectedSurfaceCount,

      wholeToothSelected,

      crossed:
        Boolean(
          savedExtraction,
        ) ||
        draftExtraction,

      crossColor:
        savedExtraction?.color ??
        (
          draftExtraction
            ? DRAFT_FILL
            : undefined
        ),

      getFaceStyle,
    };
  }

  const permanentQuadrantsDisabled =
    scopeControlDisabled(
      'cuadrante',
    );

  const temporaryQuadrantsDisabled =
    scopeControlDisabled(
      'cuadrante',
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-700">
            Selección de piezas y caras
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            {MODE_HINTS[mode]}
          </p>
        </div>

        <div className="overflow-x-auto p-4">
          <div className="mx-auto min-w-[980px]">
            {/* Permanentes superiores */}
            <section>
              <h3 className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                Dentición permanente
              </h3>

              <div className="mx-auto mb-2 max-w-[760px]">
                <QuadrantPair
                  left="1"
                  right="2"
                  selection={
                    selection
                  }
                  disabled={
                    permanentQuadrantsDisabled
                  }
                  onSelect={
                    handleQuadrantSelect
                  }
                />
              </div>

              <ToothRow
                teeth={
                  UPPER_PERMANENT
                }
                splitAt={8}
                mode={mode}
                getVisual={
                  getVisual
                }
                isDisabled={
                  toothDisabled
                }
                onFaceClick={
                  handleFaceClick
                }
                onWholeToothClick={
                  handleWholeToothClick
                }
              />
            </section>

            {/* Centro: arcadas, temporales y sextantes */}
            <div className="my-5 grid grid-cols-[150px_minmax(480px,1fr)_150px] items-center gap-5 border-y border-slate-200 py-5">
              <div className="flex flex-col items-center gap-3">
                <ArchSelector
                  selection={
                    selection
                  }
                  disabled={
                    scopeControlDisabled(
                      'arcada',
                    )
                  }
                  onSelect={
                    handleArchSelect
                  }
                />

                <label
                  className={joinClassNames(
                    'flex items-center gap-2',
                    'text-xs font-semibold',
                    scopeControlDisabled(
                      'session',
                    )
                      ? 'cursor-not-allowed text-slate-400'
                      : 'cursor-pointer text-slate-600',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={
                      mode ===
                      'session'
                    }
                    disabled={
                      scopeControlDisabled(
                        'session',
                      )
                    }
                    onChange={
                      handleSessionChange
                    }
                    className="
                      h-4 w-4 rounded
                      border-slate-300
                      text-brand-600
                      focus:ring-brand-500
                    "
                  />

                  Sesión
                </label>
              </div>

              <section>
                <h3 className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Dentición temporal
                </h3>

                <div className="mx-auto mb-2 max-w-[460px]">
                  <QuadrantPair
                    left="5"
                    right="6"
                    selection={
                      selection
                    }
                    disabled={
                      temporaryQuadrantsDisabled
                    }
                    compact
                    onSelect={
                      handleQuadrantSelect
                    }
                  />
                </div>

                <ToothRow
                  teeth={
                    UPPER_DECIDUOUS
                  }
                  splitAt={5}
                  small
                  mode={mode}
                  getVisual={
                    getVisual
                  }
                  isDisabled={
                    toothDisabled
                  }
                  onFaceClick={
                    handleFaceClick
                  }
                  onWholeToothClick={
                    handleWholeToothClick
                  }
                />

                <div className="mx-auto my-3 max-w-[460px] border-t-2 border-slate-400" />

                <ToothRow
                  teeth={
                    LOWER_DECIDUOUS
                  }
                  splitAt={5}
                  small
                  mode={mode}
                  getVisual={
                    getVisual
                  }
                  isDisabled={
                    toothDisabled
                  }
                  onFaceClick={
                    handleFaceClick
                  }
                  onWholeToothClick={
                    handleWholeToothClick
                  }
                />

                <div className="mx-auto mt-2 max-w-[460px]">
                  <QuadrantPair
                    left="8"
                    right="7"
                    selection={
                      selection
                    }
                    disabled={
                      temporaryQuadrantsDisabled
                    }
                    compact
                    onSelect={
                      handleQuadrantSelect
                    }
                  />
                </div>
              </section>

              <SextantSelector
                selection={
                  selection
                }
                disabled={
                  scopeControlDisabled(
                    'sextante',
                  )
                }
                onSelect={
                  handleSextantSelect
                }
              />
            </div>

            {/* Permanentes inferiores */}
            <section>
              <ToothRow
                teeth={
                  LOWER_PERMANENT
                }
                splitAt={8}
                mode={mode}
                getVisual={
                  getVisual
                }
                isDisabled={
                  toothDisabled
                }
                onFaceClick={
                  handleFaceClick
                }
                onWholeToothClick={
                  handleWholeToothClick
                }
              />

              <div className="mx-auto mt-2 max-w-[760px]">
                <QuadrantPair
                  left="4"
                  right="3"
                  selection={
                    selection
                  }
                  disabled={
                    permanentQuadrantsDisabled
                  }
                  onSelect={
                    handleQuadrantSelect
                  }
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}