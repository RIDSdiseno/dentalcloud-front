import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from './icons';

// Mismo patrón que CameraCaptureModal (cámara en vivo + fallback a archivo),
// pero grabando video con MediaRecorder en vez de una sola foto — un solo
// clip por vez, sin guía de encuadre ni detección facial (no aplica a video).
export function VideoCaptureModal({
  label,
  onCapture,
  onClose,
  onFallbackToFile,
}: {
  label: string;
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallbackToFile: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: true,
        });
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
            ? 'No se pudo acceder a la cámara/micrófono — revisa los permisos del navegador.'
            : `No se pudo iniciar la cámara en este dispositivo${name ? ` (${name})` : ''}.`
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // El video en vivo se monta una sola vez para toda la vida del modal (ver
    // el <video hidden> más abajo) — así "Repetir" nunca pierde el srcObject.
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleStartRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function handleStopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
  }

  function handleConfirm() {
    if (!previewBlob) return;
    const ext = previewBlob.type.includes('mp4') ? 'mp4' : 'webm';
    onCapture(new File([previewBlob], `video-${Date.now()}.${ext}`, { type: previewBlob.type }));
  }

  // Los blobs que entrega MediaRecorder no traen la duración total en el
  // encabezado (solo se va sabiendo a medida que se reproduce) — Chrome/
  // Android lo interpreta como una transmisión en vivo y muestra "Live" sin
  // barra de progreso hasta que se fuerza un seek al final una vez cargado.
  function fixInfiniteDuration(video: HTMLVideoElement) {
    if (video.duration !== Infinity) return;
    video.currentTime = 1e101;
    const onTimeUpdate = () => {
      video.currentTime = 0;
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
    video.addEventListener('timeupdate', onTimeUpdate);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold text-white">{label}</p>
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
          {/* Siempre montado (solo oculto) para no perder el srcObject al volver desde "Repetir". */}
          <video ref={videoRef} playsInline muted hidden={!!previewUrl || status === 'error'} className="h-full w-full object-cover" />
          {previewUrl && (
            <video
              ref={previewVideoRef}
              src={previewUrl}
              controls
              playsInline
              onLoadedMetadata={(e) => fixInfiniteDuration(e.currentTarget)}
              className="h-full w-full object-cover"
            />
          )}
          {status === 'loading' && !previewUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
              Cargando cámara...
            </div>
          )}
          {status === 'error' && !previewUrl && (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-300">
              {errorMessage}
            </div>
          )}
          {recording && (
            <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-red-600/90 px-2 py-1 text-xs font-semibold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              Grabando
            </span>
          )}
        </div>

        <div className="px-4 py-3">
          {previewUrl ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 rounded-lg border border-white/20 py-2.5 text-xs font-medium text-slate-200 hover:bg-white/10"
              >
                Repetir
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Usar este video
              </button>
            </div>
          ) : (
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
                onClick={recording ? handleStopRecording : handleStartRecording}
                disabled={status !== 'ready'}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40 ${
                  recording ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                <CameraIcon className="h-4 w-4" />
                {recording ? 'Detener' : 'Grabar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
