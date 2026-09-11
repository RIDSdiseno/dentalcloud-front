import { useEffect, useRef, useState } from 'react';
import type { FaceDetector } from '@mediapipe/tasks-vision';
import { CameraIcon } from './icons';

export type CaptureGuide = 'frontal' | 'perfil' | '45derecha' | '45izquierda';

const GUIDE_HINT: Record<CaptureGuide, string> = {
  frontal: 'Mira directo a la cámara, rostro centrado',
  perfil: 'Gira la cabeza para mostrar el perfil completo',
  '45derecha': 'Gira la cabeza 45° hacia su derecha',
  '45izquierda': 'Gira la cabeza 45° hacia su izquierda',
};

// Carga perezosa y compartida entre todas las instancias del modal — el
// modelo (~200KB) y el runtime WASM se piden una sola vez por sesión del
// navegador, no cada vez que el doctor abre la cámara para una foto distinta.
// Muchos navegadores móviles (sobre todo webviews de Android) no soportan
// bien el delegate "GPU" de MediaPipe y fallan en silencio — por eso se
// reintenta con "CPU" antes de darse por vencido.
let faceDetectorPromise: Promise<FaceDetector> | null = null;
function getFaceDetector(): Promise<FaceDetector> {
  if (!faceDetectorPromise) {
    faceDetectorPromise = (async () => {
      const { FaceDetector: FD, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
      );
      const modelAssetPath =
        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
      try {
        return await FD.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'GPU' },
          runningMode: 'VIDEO',
        });
      } catch {
        return await FD.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'CPU' },
          runningMode: 'VIDEO',
        });
      }
    })();
  }
  return faceDetectorPromise;
}

// Silueta guía por ángulo — puramente visual (referencia de encuadre), no
// depende de la detección facial. '45derecha'/'45izquierda' usan el mismo
// trazo, espejado con CSS.
function GuideSilhouette({ guide, aligned }: { guide: CaptureGuide; aligned: boolean }) {
  const stroke = aligned ? '#22c55e' : '#ffffff';
  const mirrored = guide === '45izquierda';
  const common = { fill: 'none', stroke, strokeWidth: 2.5, strokeDasharray: aligned ? undefined : '6 6', opacity: 0.85 };

  return (
    <svg
      viewBox="0 0 200 260"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    >
      {guide === 'frontal' && (
        <>
          <ellipse cx="100" cy="95" rx="55" ry="72" {...common} />
          <path d="M55 190 Q100 165 145 190 L155 250 L45 250 Z" {...common} />
        </>
      )}
      {guide === 'perfil' && (
        <>
          <path
            d="M70 35 Q120 30 132 70 Q145 80 140 92 Q148 98 138 105 Q140 120 128 128 Q125 145 108 150 L100 175 Q90 185 70 182 Q45 178 40 150 Q30 120 40 85 Q42 50 70 35 Z"
            {...common}
          />
          <path d="M50 190 Q95 165 148 190 L158 250 L38 250 Z" {...common} />
        </>
      )}
      {(guide === '45derecha' || guide === '45izquierda') && (
        <>
          <path
            d="M75 28 Q135 28 148 85 Q158 95 150 105 Q152 130 132 138 L126 160 Q118 178 92 178 Q55 178 48 145 Q35 110 45 75 Q48 42 75 28 Z"
            {...common}
          />
          <path d="M45 190 Q98 165 155 190 L165 250 L35 250 Z" {...common} />
        </>
      )}
    </svg>
  );
}

export function CameraCaptureModal({
  guide,
  label,
  onCapture,
  onClose,
  onFallbackToFile,
}: {
  guide: CaptureGuide;
  label: string;
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallbackToFile: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [aligned, setAligned] = useState(false);
  const [aiStatus, setAiStatus] = useState<'loading' | 'active' | 'unavailable'>('loading');
  const [aiErrorDetail, setAiErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function openCamera() {
      // Primer intento: pedir la cámara trasera. Si el navegador rechaza la
      // restricción (algunos webviews de Android tratan "ideal" como si
      // fuera obligatorio), se reintenta sin ninguna restricción — mejor una
      // cámara cualquiera que ninguna.
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
      } catch {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    }

    async function start() {
      try {
        const stream = await openCamera();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        const name = err instanceof DOMException ? err.name : null;
        setErrorMessage(
          name === 'NotAllowedError'
            ? 'No se pudo acceder a la cámara — revisa los permisos del navegador.'
            : `No se pudo iniciar la cámara en este dispositivo${name ? ` (${name})` : ''}.`
        );
        return;
      }

      // La detección facial es un plus (guía visual) — si el modelo no
      // carga (WASM/GPU no soportado en este navegador), la cámara sigue
      // funcionando igual, solo sin el indicador de "posición correcta".
      try {
        const detector = await getFaceDetector();
        if (cancelled) return;
        setAiStatus('active');

        const detectLoop = () => {
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            try {
              const result = detector.detectForVideo(video, performance.now());
              const detection = result.detections[0];
              if (detection) {
                setFaceDetected(true);
                const box = detection.boundingBox;
                if (box) {
                  const cx = (box.originX + box.width / 2) / video.videoWidth;
                  const cy = (box.originY + box.height / 2) / video.videoHeight;
                  const sizeRatio = box.height / video.videoHeight;
                  const centered = cx > 0.3 && cx < 0.7 && cy > 0.2 && cy < 0.75;
                  const wellSized = sizeRatio > 0.22 && sizeRatio < 0.75;
                  setAligned(centered && wellSized);
                }
              } else {
                setFaceDetected(false);
                setAligned(false);
              }
            } catch {
              // Best-effort: si un frame puntual falla la detección, no
              // interrumpe el loop — solo se pierde ese cuadro.
            }
          }
          rafRef.current = requestAnimationFrame(detectLoop);
        };
        rafRef.current = requestAnimationFrame(detectLoop);
      } catch (err) {
        // Sin detección facial disponible en este navegador — se sigue
        // mostrando la cámara y la silueta guía, solo sin el indicador
        // automático de alineación. Se guarda el motivo real (temporal,
        // para diagnóstico) en vez de ocultarlo.
        if (!cancelled) {
          setAiStatus('unavailable');
          const detail = err instanceof Error ? err.message : String(err);
          setAiErrorDetail(detail.slice(0, 200));
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `${guide}-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-slate-300">{GUIDE_HINT[guide]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar cámara"
          >
            ✕
          </button>
        </div>

        <div className="relative aspect-square w-full bg-black">
          {status !== 'error' && (
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          )}
          {status === 'ready' && <GuideSilhouette guide={guide} aligned={aligned} />}
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
              Cargando cámara...
            </div>
          )}
          {status === 'error' && (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-300">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          {status === 'ready' && aiStatus === 'active' && (
            <p className={`mb-3 text-center text-xs font-semibold ${aligned ? 'text-green-400' : 'text-amber-300'}`}>
              {aligned
                ? '✓ Posición correcta — puedes tomar la foto'
                : faceDetected
                  ? 'Ajusta la posición según la guía'
                  : 'No se detecta un rostro — acércate y busca buena luz'}
            </p>
          )}
          {status === 'ready' && aiStatus === 'loading' && (
            <p className="mb-3 text-center text-xs font-semibold text-slate-400">Cargando detección facial...</p>
          )}
          {status === 'ready' && aiStatus === 'unavailable' && (
            <div className="mb-3 text-center">
              <p className="text-xs font-semibold text-slate-400">
                Solo guía visual — este navegador no soporta la detección automática. Usa la silueta para encuadrar.
              </p>
              {aiErrorDetail && <p className="mt-1 text-[10px] text-slate-500">Detalle: {aiErrorDetail}</p>}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onFallbackToFile}
              className="flex-1 rounded-lg border border-white/20 py-2.5 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              Subir archivo en su lugar
            </button>
            <button
              type="button"
              onClick={handleCapture}
              disabled={status !== 'ready'}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40 ${
                aligned ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              <CameraIcon className="h-4 w-4" />
              Capturar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
