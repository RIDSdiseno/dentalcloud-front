import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { CameraIcon } from './icons';
import { SCAN_SEQUENCE, type ScanSlot } from './facialScanConfig';

// Escaneo facial guiado ("Fotográfico avanzado — demo", 30/09).
//
// Diferencia con CameraCaptureModal: ahí la detección solo responde "¿está
// bien encuadrado para el ángulo que te pedí?" a partir de la caja del rostro
// y tres puntos (ojos + nariz). Acá se usa FaceLandmarker con la matriz de
// transformación facial, que da la rotación real de la cabeza en grados
// (yaw/pitch/roll). Con eso el modal puede decir en todo momento CÓMO está
// puesto el rostro — no solo si coincide con lo pedido — y guiar la sesión
// completa solo, ángulo por ángulo.

// Umbrales de giro (grados). El rango de 45° es ancho a propósito: pedirle a
// una persona "exactamente 45°" no es realista, y el examen solo necesita una
// vista de tres cuartos consistente.
const FRONTAL_MAX_YAW = 12;
const YAW_45_MIN = 22;
const YAW_45_MAX = 58;
const PROFILE_MIN_YAW = 58;
// Inclinación (mentón arriba/abajo) y ladeo permitidos en cualquier ángulo —
// son los que arruinan la comparación entre el "antes" y el "avance".
const MAX_PITCH = 14;
const MAX_ROLL = 12;

// La cámara se abre con la trasera (facingMode 'environment', igual que
// CameraCaptureModal) y NO se refleja, así que la imagen es la del observador
// mirando al paciente. Si en terreno queda cambiado izquierda por derecha,
// basta invertir esta constante — mismo criterio que NOSE_TURN_SIGN en
// CameraCaptureModal, que se dejó igual de ajustable por el mismo motivo.
const YAW_SIGN = 1;

// El zoom digital compensa que el rostro se ve lejos salvo que la cámara esté
// físicamente encima; se aplica igual al video en vivo y al recorte final para
// que lo encuadrado sea exactamente lo que se guarda (mismo criterio y mismo
// valor que CameraCaptureModal).
const FACE_ZOOM_SCALE = 1.6;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Tiempo de espera agotado (${ms}ms)`)), ms)),
  ]);
}

// Carga perezosa y compartida por sesión de navegador: el modelo (~3MB) y el
// runtime WASM se piden una sola vez, no cada vez que se abre el escaneo.
// Igual que en CameraCaptureModal se reintenta con CPU porque varios webviews
// de Android fallan en silencio con el delegate GPU.
let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;
function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const { FaceLandmarker: FL, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
      );
      const modelAssetPath =
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
      const options = {
        runningMode: 'VIDEO' as const,
        numFaces: 1,
        // Sin esto no hay matriz de rotación y todo el modal pierde sentido:
        // volvería a adivinar la orientación desde posiciones de puntos.
        outputFacialTransformationMatrixes: true,
      };
      try {
        return await FL.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'GPU' },
          ...options,
        });
      } catch {
        return await FL.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'CPU' },
          ...options,
        });
      }
    })().catch((err) => {
      // Sin esto, un fallo de red deja la promesa rechazada cacheada para
      // siempre y el escaneo no se recupera ni recargando el modal.
      faceLandmarkerPromise = null;
      throw err;
    });
  }
  return faceLandmarkerPromise;
}

type HeadPose = { yaw: number; pitch: number; roll: number };

// MediaPipe entrega la matriz 4x4 en orden por columnas: el elemento de la
// fila i, columna j está en data[j * 4 + i].
function headPoseFromMatrix(data: Float32Array | number[]): HeadPose {
  const r00 = data[0];
  const r10 = data[1];
  const r20 = data[2];
  const r21 = data[6];
  const r22 = data[10];
  const deg = (rad: number) => (rad * 180) / Math.PI;
  return {
    pitch: deg(Math.atan2(r21, r22)),
    yaw: deg(Math.atan2(-r20, Math.hypot(r21, r22))) * YAW_SIGN,
    roll: deg(Math.atan2(r10, r00)),
  };
}

// Cómo está puesto el rostro AHORA, independiente de lo que se haya pedido.
// `slot` es null cuando la pose no corresponde a ninguno de los 4 ángulos del
// examen (ej. perfil izquierdo, que este registro no incluye) — igual se
// nombra, porque la idea es que el operador siempre vea qué está detectando.
function classifyPose(yaw: number): { slot: ScanSlot | null; name: string } {
  const turned = Math.abs(yaw);
  const toPatientRight = yaw > 0;
  if (turned < FRONTAL_MAX_YAW) return { slot: 'frontal', name: 'Frontal' };
  if (turned >= YAW_45_MIN && turned <= YAW_45_MAX) {
    return toPatientRight
      ? { slot: '45derecha', name: '45° derecha' }
      : { slot: '45izquierda', name: '45° izquierda' };
  }
  if (turned > PROFILE_MIN_YAW) {
    return toPatientRight
      ? { slot: 'perfilDerecho', name: 'Perfil derecho' }
      : { slot: null, name: 'Perfil izquierdo (no se registra en este examen)' };
  }
  return { slot: null, name: toPatientRight ? 'Girando a su derecha' : 'Girando a su izquierda' };
}

export function FacialScanModal({
  patientName,
  pending,
  onSave,
  onClose,
  momentLabel,
}: {
  patientName: string;
  // Ángulos que todavía faltan en esta ronda. El modal recorre solo éstos y se
  // cierra al completarlos; los que ya estaban no se vuelven a pedir.
  pending: ScanSlot[];
  onSave: (slot: ScanSlot, file: File) => void;
  onClose: () => void;
  momentLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<'loading' | 'active' | 'unavailable'>('loading');
  const [aiErrorDetail, setAiErrorDetail] = useState<string | null>(null);

  const [remaining, setRemaining] = useState<ScanSlot[]>(pending);
  const [targetIndex, setTargetIndex] = useState(0);
  const [pose, setPose] = useState<HeadPose | null>(null);
  const [faceSeen, setFaceSeen] = useState(false);
  // Foto tomada esperando el "¿Está correcta?" — guarda también a qué ángulo
  // corresponde, porque se puede capturar un ángulo distinto al pedido
  // (adelanto) y al confirmar hay que guardarlo en el correcto.
  const [shot, setShot] = useState<{ slot: ScanSlot; file: File; url: string } | null>(null);
  const [flash, setFlash] = useState(false);
  const [shotVisible, setShotVisible] = useState(false);

  const target = remaining[targetIndex] ?? null;
  const targetStep = SCAN_SEQUENCE.find((s) => s.slot === target) ?? null;

  // El bucle de detección lee estos por ref: el rAF se monta una sola vez y no
  // debe reiniciarse (ni perder el stream) cada vez que cambia el ángulo
  // pedido o aparece una foto en revisión.
  const pausedRef = useRef(false);
  pausedRef.current = shot !== null;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus('ready');
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err instanceof Error && err.name === 'NotFoundError'
            ? 'No se detecta ninguna cámara en este dispositivo. El escaneo guiado necesita cámara — usa el registro fotográfico normal, que permite subir archivos.'
            : 'No se pudo iniciar la cámara. Revisa los permisos del navegador.'
        );
        return;
      }

      let landmarker: FaceLandmarker;
      try {
        landmarker = await withTimeout(getFaceLandmarker(), 20000);
        if (cancelled) return;
        setAiStatus('active');
      } catch (err) {
        setAiStatus('unavailable');
        setAiErrorDetail(err instanceof Error ? err.message : String(err));
        return;
      }

      let lastVideoTime = -1;
      const loop = () => {
        const video = videoRef.current;
        if (cancelled || !video) return;
        // Mientras hay una foto en revisión no se sigue midiendo: el rostro ya
        // no importa y así no parpadean los mensajes detrás del preview.
        if (!pausedRef.current && video.videoWidth > 0 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, performance.now());
            const matrix = result.facialTransformationMatrixes?.[0]?.data;
            if (matrix && result.faceLandmarks?.length) {
              setFaceSeen(true);
              setPose(headPoseFromMatrix(matrix));
            } else {
              setFaceSeen(false);
              setPose(null);
            }
          } catch {
            // Un frame que falla no debe cortar el bucle: se ignora y se sigue.
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Libera la foto en revisión si el modal se cierra sin resolverla.
  useEffect(() => {
    return () => {
      if (shot) URL.revokeObjectURL(shot.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detected = pose ? classifyPose(pose.yaw) : null;
  const tiltOk = pose ? Math.abs(pose.pitch) <= MAX_PITCH && Math.abs(pose.roll) <= MAX_ROLL : false;
  const matchesTarget = detected?.slot != null && detected.slot === target && tiltOk;
  // Adelanto: el paciente quedó en un ángulo que todavía falta, pero no es el
  // que se estaba pidiendo. En vez de corregirlo, se ofrece aprovecharlo.
  const advanceSlot =
    detected?.slot && detected.slot !== target && tiltOk && remaining.includes(detected.slot)
      ? detected.slot
      : null;

  function correctionHint(): string | null {
    if (!pose) return null;
    if (pose.pitch > MAX_PITCH) return 'Baje el mentón — la cabeza está inclinada hacia arriba';
    if (pose.pitch < -MAX_PITCH) return 'Suba el mentón — la cabeza está inclinada hacia abajo';
    if (Math.abs(pose.roll) > MAX_ROLL) return 'Enderece la cabeza — está ladeada hacia un hombro';
    return null;
  }

  function capture(slot: ScanSlot) {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const srcW = video.videoWidth / FACE_ZOOM_SCALE;
    const srcH = video.videoHeight / FACE_ZOOM_SCALE;
    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, (video.videoWidth - srcW) / 2, (video.videoHeight - srcH) / 2, srcW, srcH, 0, 0, srcW, srcH);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${slot}-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setShot({ slot, file, url: URL.createObjectURL(file) });
        // Fogonazo + entrada de la foto: da la sensación de "se tomó" y separa
        // visualmente el momento de revisar del de encuadrar.
        setFlash(true);
        setShotVisible(false);
        setTimeout(() => setFlash(false), 180);
        requestAnimationFrame(() => setShotVisible(true));
      },
      'image/jpeg',
      0.92
    );
  }

  function discardShot() {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setShotVisible(false);
  }

  function confirmShot() {
    if (!shot) return;
    onSave(shot.slot, shot.file);
    const savedSlot = shot.slot;
    URL.revokeObjectURL(shot.url);
    setShot(null);
    setShotVisible(false);
    const left = remaining.filter((s) => s !== savedSlot);
    if (left.length === 0) {
      onClose();
      return;
    }
    setRemaining(left);
    // Si se guardó el ángulo pedido, sigue el que venía; si fue un adelanto, el
    // pedido no se tomó y hay que quedarse en él (ahora en otra posición de la
    // lista, porque el guardado desapareció).
    const nextTarget = savedSlot === target ? left[0] : target;
    setTargetIndex(Math.max(0, left.indexOf(nextTarget as ScanSlot)));
  }

  const hint = correctionHint();
  const doneCount = pending.length - remaining.length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              Escaneo facial — {momentLabel}
            </p>
            <p className="truncate text-xs text-slate-400">{patientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar escaneo"
          >
            ✕
          </button>
        </div>

        {/* Progreso de la sesión: qué ángulos ya quedaron listos y cuál se está
            pidiendo, para no tener que recordarlo de memoria. */}
        <div className="flex gap-1.5 px-4 pb-3">
          {pending.map((slot) => {
            const step = SCAN_SEQUENCE.find((s) => s.slot === slot);
            const done = !remaining.includes(slot);
            const current = slot === target;
            return (
              <div
                key={slot}
                className={`flex-1 rounded-md px-1.5 py-1 text-center text-[10px] font-semibold ${
                  done
                    ? 'bg-green-600/20 text-green-300'
                    : current
                      ? 'bg-brand-600/30 text-brand-200'
                      : 'bg-white/5 text-slate-500'
                }`}
              >
                {done ? '✓ ' : ''}
                {step?.label ?? slot}
              </div>
            );
          })}
        </div>

        <div className="relative aspect-square w-full overflow-hidden bg-black">
          <div className="absolute inset-0" style={{ transform: `scale(${FACE_ZOOM_SCALE})` }}>
            {status !== 'error' && <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />}
          </div>

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

          {/* Lectura en vivo de la orientación: se muestra SIEMPRE, coincida o
              no con lo pedido — es el punto del modo avanzado. */}
          {status === 'ready' && !shot && (
            <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
              <div
                className={`rounded-lg px-3 py-2 text-center text-xs font-bold backdrop-blur-sm ${
                  matchesTarget
                    ? 'bg-green-600/85 text-white'
                    : faceSeen
                      ? 'bg-black/65 text-amber-200'
                      : 'bg-black/65 text-slate-300'
                }`}
              >
                {!faceSeen
                  ? 'No se detecta un rostro — acérquese y busque buena luz'
                  : matchesTarget
                    ? `✓ ${detected?.name} detectado — puede tomar la foto`
                    : (hint ?? `Detectado: ${detected?.name}`)}
              </div>
              {faceSeen && pose && (
                <div className="mt-1.5 flex justify-center gap-3 text-[10px] font-semibold text-slate-300">
                  <span>giro {pose.yaw.toFixed(0)}°</span>
                  <span>inclinación {pose.pitch.toFixed(0)}°</span>
                  <span>ladeo {pose.roll.toFixed(0)}°</span>
                </div>
              )}
            </div>
          )}

          {flash && <div className="absolute inset-0 z-20 bg-white" />}

          {/* Revisión de la foto recién tomada. Entra con una transición corta
              en vez de aparecer de golpe, para que se lea como "esta es la que
              acabas de tomar". */}
          {shot && (
            <div
              className={`absolute inset-0 z-10 bg-black transition-all duration-300 ${
                shotVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
            >
              <img src={shot.url} alt="Foto recién tomada" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10 text-center">
                <p className="text-sm font-bold text-white">¿Está correcta?</p>
                <p className="text-xs text-slate-300">
                  {SCAN_SEQUENCE.find((s) => s.slot === shot.slot)?.label ?? shot.slot}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          {shot ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={discardShot}
                className="flex-1 rounded-lg border border-white/20 py-2.5 text-xs font-medium text-slate-200 hover:bg-white/10"
              >
                No, retomar
              </button>
              <button
                type="button"
                onClick={confirmShot}
                className="flex flex-[2] items-center justify-center rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Sí, guardar
              </button>
            </div>
          ) : (
            <>
              <p className="mb-1 text-center text-xs font-bold text-white">
                {targetStep ? `${doneCount + 1} de ${pending.length} — ${targetStep.label}` : 'Escaneo completo'}
              </p>
              <p className="mb-3 text-center text-[11px] text-slate-400">{targetStep?.instruction}</p>

              {aiStatus === 'loading' && (
                <p className="mb-3 text-center text-xs font-semibold text-slate-400">
                  Cargando detección de orientación...
                </p>
              )}
              {aiStatus === 'unavailable' && (
                <div className="mb-3 text-center">
                  <p className="text-xs font-semibold text-amber-300">
                    Este navegador no soporta la detección de orientación. Puedes tomar las fotos igual, pero sin
                    guía automática.
                  </p>
                  {aiErrorDetail && <p className="mt-1 text-[10px] text-slate-500">Detalle: {aiErrorDetail}</p>}
                </div>
              )}

              {/* Adelanto: aparece solo cuando el rostro quedó en otro ángulo
                  que también falta. Evita pelear con el paciente para que
                  vuelva a la pose pedida cuando ya está en una útil. */}
              {advanceSlot && (
                <button
                  type="button"
                  onClick={() => capture(advanceSlot)}
                  className="mb-2 w-full rounded-lg border border-amber-400/40 bg-amber-400/10 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/20"
                >
                  {SCAN_SEQUENCE.find((s) => s.slot === advanceSlot)?.label} detectado — tomarlo como adelanto
                </button>
              )}

              <button
                type="button"
                onClick={() => target && capture(target)}
                disabled={status !== 'ready' || !target}
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40 ${
                  matchesTarget ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                <CameraIcon className="h-4 w-4" />
                Tomar {targetStep?.label ?? 'foto'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
