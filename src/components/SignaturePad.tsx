import { useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };

// La firma que se dibuja acá termina impresa en documentos (recetas, fichas
// de profesionales) sobre fondo blanco — así que la superficie donde se
// dibuja queda SIEMPRE blanca, sin importar el tema de la app, como una
// hoja de papel real. Bug real (29/09): antes el canvas sí cambiaba a fondo
// oscuro en modo oscuro (dark:bg-slate-800), pero el trazo seguía dibujado
// en el mismo color oscuro (#1e293b) — la firma quedaba invisible mientras
// se dibujaba. Dejar el papel siempre blanco evita ese problema de raíz y
// además asegura que la tinta se siga viendo una vez impresa en un PDF.
const PAPER_BG = '#ffffff';
const INK_COLOR = '#1e293b';

// Pad de firma: dibujo libre con Pointer Events (funciona igual con mouse,
// dedo o lápiz óptico). El canvas se redimensiona a su contenedor y se
// escala por devicePixelRatio para que la línea salga nítida en pantallas
// retina/celular sin distorsionar las coordenadas del trazo.
export function SignaturePad({
  onChange,
  height = 160,
}: {
  onChange: (dataUrl: string | null) => void;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.fillStyle = PAPER_BG;
      ctx.fillRect(0, 0, rect.width, height);
    }
  }, [height]);

  function toPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = toPoint(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    const point = toPoint(e);
    if (ctx && lastPointRef.current) {
      ctx.strokeStyle = INK_COLOR;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPointRef.current = point;
  }

  function emitChange() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  }

  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    setIsEmpty(false);
    emitChange();
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = PAPER_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setIsEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ height, touchAction: 'none' }}
          className="w-full cursor-crosshair rounded-lg border border-slate-300 bg-white dark:border-slate-600"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-slate-400 dark:text-slate-500">Firma aquí con el dedo, mouse o lápiz óptico</span>
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Borrar
        </button>
      </div>
    </div>
  );
}
