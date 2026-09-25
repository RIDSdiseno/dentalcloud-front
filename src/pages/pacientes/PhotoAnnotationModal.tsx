import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { Modal } from '../../components/Modal';
import { DotToolIcon, DashedLineToolIcon, LineToolIcon, EraserIcon, UndoIcon, RedoIcon } from '../../components/icons';

// Etapa 07 — marcación sobre la foto (pedido explícito de Urbina, ver
// transcript "Flujo Estético RIDS"): simbología estandarizada de 3 trazos,
// no dibujo libre cualquiera.
//   Punto           -> toxina botulínica (botox)
//   Línea punteada  -> ojeras / surco lagrimal
//   Línea continua  -> filler (relleno) e hilos de tracción
// El resultado se aplana en una imagen NUEVA (nunca se toca la foto
// original) — ver `flattenToBlob` más abajo.
type MarkTool = 'punto' | 'punteada' | 'continua' | 'borrador';

type Point = { x: number; y: number };

type Mark =
  | { id: string; tool: 'punto'; point: Point }
  | { id: string; tool: 'punteada'; points: Point[] }
  | { id: string; tool: 'continua'; points: Point[] };

const MARK_COLOR = '#db2777';

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function markHit(mark: Mark, p: Point, threshold: number): boolean {
  if (mark.tool === 'punto') return distance(mark.point, p) < threshold;
  return mark.points.some((pt) => distance(pt, p) < threshold);
}

const TOOLS: { key: MarkTool; icon: ComponentType<SVGProps<SVGSVGElement>>; label: string }[] = [
  { key: 'punto', icon: DotToolIcon, label: 'Punto — botox' },
  { key: 'punteada', icon: DashedLineToolIcon, label: 'Línea punteada — ojeras' },
  { key: 'continua', icon: LineToolIcon, label: 'Línea continua — filler / hilos' },
  { key: 'borrador', icon: EraserIcon, label: 'Borrador' },
];

function MarkShape({ mark, strokeWidth, dotRadius }: { mark: Mark; strokeWidth: number; dotRadius: number }) {
  if (mark.tool === 'punto') {
    return <circle cx={mark.point.x} cy={mark.point.y} r={dotRadius} fill={MARK_COLOR} />;
  }
  const d = mark.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return (
    <path
      d={d}
      stroke={MARK_COLOR}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={mark.tool === 'punteada' ? `${strokeWidth * 2.6} ${strokeWidth * 1.8}` : undefined}
    />
  );
}

type PhotoAnnotationModalProps = {
  photoUrl: string;
  onClose: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
};

export function PhotoAnnotationModal({ photoUrl, onClose, onConfirm }: PhotoAnnotationModalProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [imageError, setImageError] = useState(false);
  const [tool, setTool] = useState<MarkTool>('punto');
  const [marks, setMarks] = useState<Mark[]>([]);
  const [draft, setDraft] = useState<Mark | null>(null);
  const [redoStack, setRedoStack] = useState<Mark[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isErasingRef = useRef(false);

  // Foto cargada aparte (crossOrigin) para poder leerla en un canvas al
  // aplanar — la que se ve en pantalla es la misma URL, pero el <img> normal
  // del overlay (sin crossOrigin) no serviría para exportar sin "mancharlo".
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => setImageError(true);
    img.src = photoUrl;
  }, [photoUrl]);

  const strokeWidth = naturalSize ? Math.max(3, naturalSize.w * 0.006) : 3;
  const dotRadius = naturalSize ? Math.max(6, naturalSize.w * 0.012) : 6;
  const eraserThreshold = naturalSize ? Math.max(strokeWidth * 3, naturalSize.w * 0.02) : 12;

  function toPoint(e: React.PointerEvent): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    if (!naturalSize) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * naturalSize.w,
      y: ((e.clientY - rect.top) / rect.height) * naturalSize.h,
    };
  }

  function eraseAt(p: Point) {
    for (let i = marks.length - 1; i >= 0; i--) {
      if (markHit(marks[i], p, eraserThreshold)) {
        setMarks(marks.slice(0, i).concat(marks.slice(i + 1)));
        setRedoStack([]);
        return;
      }
    }
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const p = toPoint(e);
    if (tool === 'borrador') {
      isErasingRef.current = true;
      eraseAt(p);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const id = `mark-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (tool === 'punto') {
      setMarks((prev) => [...prev, { id, tool: 'punto', point: p }]);
      setRedoStack([]);
      return;
    }
    setDraft({ id, tool, points: [p] });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (tool === 'borrador') {
      if (isErasingRef.current) eraseAt(toPoint(e));
      return;
    }
    if (!draft || draft.tool === 'punto') return;
    const p = toPoint(e);
    setDraft((prev) => (prev && prev.tool !== 'punto' ? { ...prev, points: [...prev.points, p] } : prev));
  }

  function handlePointerUp() {
    isErasingRef.current = false;
    if (!draft) return;
    setMarks((prev) => [...prev, draft]);
    setRedoStack([]);
    setDraft(null);
  }

  function handleUndo() {
    if (marks.length === 0) return;
    setRedoStack((r) => [...r, marks[marks.length - 1]]);
    setMarks((prev) => prev.slice(0, -1));
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    setMarks((prev) => [...prev, redoStack[redoStack.length - 1]]);
    setRedoStack((r) => r.slice(0, -1));
  }

  // Aplana la foto + los trazos en una imagen nueva, a la resolución real de
  // la foto original (no la del recuadro en pantalla) — se redibuja desde
  // los datos estructurados de `marks`, no se serializa el SVG en pantalla.
  function flattenToBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = imageRef.current;
      if (!img || !naturalSize) return resolve(null);
      const canvas = document.createElement('canvas');
      canvas.width = naturalSize.w;
      canvas.height = naturalSize.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, naturalSize.w, naturalSize.h);
      ctx.strokeStyle = MARK_COLOR;
      ctx.fillStyle = MARK_COLOR;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const mark of marks) {
        if (mark.tool === 'punto') {
          ctx.beginPath();
          ctx.arc(mark.point.x, mark.point.y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.setLineDash(mark.tool === 'punteada' ? [strokeWidth * 2.6, strokeWidth * 1.8] : []);
        ctx.beginPath();
        mark.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  async function handleSave() {
    if (marks.length === 0) {
      setError('Marca algo sobre la foto antes de guardar.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const blob = await flattenToBlob();
      if (!blob) {
        setError('No se pudo generar la imagen marcada.');
        return;
      }
      await onConfirm(blob);
    } catch {
      setError('No se pudo guardar la marcación.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Marcar foto" onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-slate-500">
          Esto no modifica la foto original — se guarda como una imagen nueva, aparte, en "Imágenes marcadas".
        </p>

        <div className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-100 p-1.5">
          <div className="flex gap-0.5">
            {TOOLS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={tool === key}
                onClick={() => setTool(key)}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  tool === key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <div className="flex gap-0.5">
            <button
              type="button"
              title="Deshacer"
              aria-label="Deshacer"
              onClick={handleUndo}
              disabled={marks.length === 0}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UndoIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Rehacer"
              aria-label="Rehacer"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RedoIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
          {imageError && <p className="p-8 text-sm text-red-600">No se pudo cargar la foto.</p>}
          {!imageError && !naturalSize && <p className="p-8 text-sm text-slate-400">Cargando foto...</p>}
          {naturalSize && (
            <svg
              id="photo-annotation-canvas"
              ref={svgRef}
              viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
              className="block max-h-[55vh] w-full"
              style={{ touchAction: 'none', backgroundImage: `url(${photoUrl})`, backgroundSize: '100% 100%' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {marks.map((m) => (
                <MarkShape key={m.id} mark={m} strokeWidth={strokeWidth} dotRadius={dotRadius} />
              ))}
              {draft && <MarkShape mark={draft} strokeWidth={strokeWidth} dotRadius={dotRadius} />}
            </svg>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MARK_COLOR }} />
            Punto — botox
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed" style={{ borderColor: MARK_COLOR }} />
            Punteada — ojeras
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5" style={{ backgroundColor: MARK_COLOR }} />
            Continua — filler / hilos
          </span>
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !naturalSize}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Guardando...' : 'Guardar marcación'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
