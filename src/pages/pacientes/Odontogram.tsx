const UPPER_PERMANENT = ['1.8', '1.7', '1.6', '1.5', '1.4', '1.3', '1.2', '1.1', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8'];
const LOWER_PERMANENT = ['4.8', '4.7', '4.6', '4.5', '4.4', '4.3', '4.2', '4.1', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'];
const UPPER_DECIDUOUS = ['5.5', '5.4', '5.3', '5.2', '5.1', '6.1', '6.2', '6.3', '6.4', '6.5'];
const LOWER_DECIDUOUS = ['8.5', '8.4', '8.3', '8.2', '8.1', '7.1', '7.2', '7.3', '7.4', '7.5'];

function Tooth({
  number,
  selected,
  onClick,
  quadrantStart,
  small,
}: {
  number: string;
  selected: boolean;
  onClick: () => void;
  quadrantStart: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center gap-1 ${quadrantStart ? 'ml-2' : ''}`}
    >
      <span className="text-[10px] font-medium text-slate-500">{number}</span>
      <span
        className={`flex items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
          small ? 'h-6 w-6' : 'h-8 w-8'
        } ${
          selected
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-slate-300 bg-white text-slate-300 hover:border-brand-300'
        }`}
      >
        {selected ? <span className="text-[13px] leading-none">✓</span> : ''}
      </span>
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-200 text-[8px] text-slate-300">
        ✓
      </span>
    </button>
  );
}

function ArchDiagram({ variant }: { variant: 'upper' | 'lower' }) {
  return (
    <svg viewBox="0 0 100 130" className="h-20 w-16 text-slate-300">
      <ellipse cx="50" cy="65" rx="42" ry="60" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + 42 * Math.cos(angle);
        const y = 65 + 60 * Math.sin(angle);
        return <circle key={i} cx={x} cy={y} r="2.2" fill="currentColor" />;
      })}
      {variant === 'upper' ? (
        <line x1="50" y1="10" x2="50" y2="120" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
      ) : (
        <>
          <line x1="50" y1="10" x2="50" y2="120" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="14" y1="30" x2="86" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="86" y1="30" x2="14" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        </>
      )}
    </svg>
  );
}

export function Odontogram({
  selected,
  onSelect,
}: {
  selected: string[];
  onSelect: (teeth: string[]) => void;
}) {
  function toggle(number: string) {
    onSelect(selected.includes(number) ? selected.filter((t) => t !== number) : [...selected, number]);
  }

  const wholeMouth = selected.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex gap-1">
          {UPPER_PERMANENT.map((n, i) => (
            <Tooth key={n} number={n} selected={selected.includes(n)} onClick={() => toggle(n)} quadrantStart={i === 8} />
          ))}
        </div>

        <div className="flex gap-1">
          {UPPER_DECIDUOUS.map((n, i) => (
            <Tooth key={n} number={n} selected={selected.includes(n)} onClick={() => toggle(n)} quadrantStart={i === 5} small />
          ))}
        </div>

        <div className="flex w-full items-center justify-center gap-10">
          <ArchDiagram variant="upper" />
          <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
            <input
              type="checkbox"
              checked={wholeMouth}
              onChange={() => onSelect([])}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Sesión
          </label>
          <ArchDiagram variant="lower" />
        </div>

        <div className="flex gap-1">
          {LOWER_DECIDUOUS.map((n, i) => (
            <Tooth key={n} number={n} selected={selected.includes(n)} onClick={() => toggle(n)} quadrantStart={i === 5} small />
          ))}
        </div>

        <div className="flex gap-1">
          {LOWER_PERMANENT.map((n, i) => (
            <Tooth key={n} number={n} selected={selected.includes(n)} onClick={() => toggle(n)} quadrantStart={i === 8} />
          ))}
        </div>
      </div>

      <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
        {wholeMouth
          ? 'Aplicando a: Sesión (toda la boca). Haz clic en una o varias piezas para elegir dónde va la prestación.'
          : `Aplicando a: pieza${selected.length > 1 ? 's' : ''} ${selected.join(', ')}. Busca abajo la prestación y se agregará a ${
              selected.length > 1 ? 'cada pieza seleccionada' : 'esa pieza'
            }.`}
      </p>
    </div>
  );
}
