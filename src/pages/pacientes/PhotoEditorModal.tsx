import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';

const FRAME_SIZE = 320;

type Position = { x: number; y: number };

const POSITION_PRESETS: Position[] = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 0.5 },
  { x: 0.5, y: 0.5 },
  { x: 1, y: 0.5 },
  { x: 0, y: 1 },
  { x: 0.5, y: 1 },
  { x: 1, y: 1 },
];

type PhotoEditorModalProps = {
  file: File;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
};

export function PhotoEditorModal({ file, onClose, onConfirm }: PhotoEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!imageLoaded) return;
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageLoaded, zoom, rotation, flipH, flipV, position]);

  function render() {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Paso 1: dibuja la imagen (flip + zoom + posición) en un canvas
    // intermedio del tamaño del marco — object-fit: cover + desplazamiento.
    const intermediate = document.createElement('canvas');
    intermediate.width = FRAME_SIZE;
    intermediate.height = FRAME_SIZE;
    const ictx = intermediate.getContext('2d')!;

    const baseScale = Math.max(FRAME_SIZE / img.naturalWidth, FRAME_SIZE / img.naturalHeight);
    const scale = baseScale * zoom;
    const sw = img.naturalWidth * scale;
    const sh = img.naturalHeight * scale;
    const dx = -(sw - FRAME_SIZE) * position.x;
    const dy = -(sh - FRAME_SIZE) * position.y;

    ictx.save();
    ictx.translate(flipH ? FRAME_SIZE : 0, flipV ? FRAME_SIZE : 0);
    ictx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ictx.drawImage(img, dx, dy, sw, sh);
    ictx.restore();

    // Paso 2: rota el marco completo (múltiplos de 90°, sin recorte al ser
    // un cuadrado) hacia el canvas final visible.
    canvas.width = FRAME_SIZE;
    canvas.height = FRAME_SIZE;
    ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
    ctx.save();
    ctx.translate(FRAME_SIZE / 2, FRAME_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(intermediate, -FRAME_SIZE / 2, -FRAME_SIZE / 2, FRAME_SIZE, FRAME_SIZE);
    ctx.restore();
  }

  function handleConfirm() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, 'image/png');
  }

  return (
    <Modal title="Editar foto" onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
          <canvas ref={canvasRef} width={FRAME_SIZE} height={FRAME_SIZE} className="block" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Rotación:</span>
          <button
            type="button"
            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ⟲ -90°
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ⟳ +90°
          </button>
          <span className="ml-2 text-xs font-medium text-slate-600">Flip:</span>
          <button
            type="button"
            onClick={() => setFlipH((v) => !v)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
              flipH ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            ↔ Horizontal
          </button>
          <button
            type="button"
            onClick={() => setFlipV((v) => !v)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
              flipV ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            ↕ Vertical
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Posición</label>
          <div className="mt-1 grid w-24 grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1.5">
            {POSITION_PRESETS.map((preset, idx) => {
              const isActive = preset.x === position.x && preset.y === position.y;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPosition(preset)}
                  aria-label={`Posición ${idx + 1}`}
                  className={`h-6 w-6 rounded ${isActive ? 'bg-brand-600' : 'bg-white ring-1 ring-slate-200 hover:bg-slate-50'}`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imageLoaded}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Usar esta foto
          </button>
        </div>
      </div>
    </Modal>
  );
}
