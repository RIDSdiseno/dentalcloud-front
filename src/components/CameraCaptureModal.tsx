import { useEffect, useRef, useState } from 'react';
import type { FaceDetector, PoseLandmarker } from '@mediapipe/tasks-vision';
import { CameraIcon } from './icons';

export type CaptureGuide =
  | 'frontal'
  | 'perfil'
  | '45derecha'
  | '45izquierda'
  | 'corpFrontal'
  | 'corpEspalda'
  | 'corpPerfilIzquierdo'
  | 'corpPerfilDerecho';

const GUIDE_HINT: Record<CaptureGuide, string> = {
  frontal: 'Mira directo a la cámara, rostro centrado',
  perfil: 'Gira la cabeza para mostrar el perfil completo',
  '45derecha': 'Gira la cabeza 45° hacia su derecha',
  '45izquierda': 'Gira la cabeza 45° hacia su izquierda',
  corpFrontal: 'Encuadra el cuerpo completo, de frente',
  corpEspalda: 'Encuadra el cuerpo completo, de espaldas',
  corpPerfilIzquierdo: 'Encuadra el cuerpo completo, perfil izquierdo',
  corpPerfilDerecho: 'Encuadra el cuerpo completo, perfil derecho',
};

// Las fotos corporales no usan la guía de encuadre facial (el óvalo de
// rostro no aplica a cuerpo completo) ni la detección de rostro con IA —
// no tiene sentido buscar una cara cuando se está fotografiando el cuerpo.
function isBodyGuide(guide: CaptureGuide): boolean {
  return guide.startsWith('corp');
}

// Las tomas de rostro se ven "lejos" a menos que la cámara ya esté muy cerca
// físicamente — se compensa con un acercamiento digital (recorte centrado),
// aplicado igual al video en vivo y a la foto final (ver handleCapture) para
// que lo que se ve al encuadrar sea exactamente lo que queda guardado.
const FACE_ZOOM_SCALE = 1.6;

// El modelo de pose (~6MB) pesa mucho más que el de rostro (~200KB) — en
// una red lenta, o si el delegate GPU se cuelga en vez de fallar rápido en
// algunos navegadores móviles, la carga puede demorar mucho o nunca
// terminar. Sin este límite, la cámara quedaría pegada en "Cargando..."
// para siempre en vez de degradar a "sin detección automática" (mismo
// comportamiento que ya existe cuando el modelo no carga).
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Tiempo de espera agotado (${ms}ms)`)), ms)),
  ]);
}

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
      // minDetectionConfidence alto (default de MediaPipe es 0.5) — el
      // modelo "short_range" es rápido pero muy propenso a falsos positivos
      // con cualquier patrón ovalado con manchas (una pelota con una cara
      // dibujada, por ejemplo). Se exige alta confianza para no marcar
      // "posición correcta" sobre algo que no es una cara real.
      try {
        return await FD.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'GPU' },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.75,
        });
      } catch {
        return await FD.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'CPU' },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.75,
        });
      }
    })();
  }
  return faceDetectorPromise;
}

// Mismo patrón que getFaceDetector (carga perezosa, GPU con reintento a CPU)
// pero con el modelo de pose completa — para las fotos corporales, donde no
// tiene sentido buscar un rostro sino que el cuerpo entero esté encuadrado.
let poseLandmarkerPromise: Promise<PoseLandmarker> | null = null;
function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = (async () => {
      const { PoseLandmarker: PL, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
      );
      const modelAssetPath =
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
      try {
        return await PL.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      } catch {
        return await PL.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      }
    })();
  }
  return poseLandmarkerPromise;
}

// Pares de landmarks de MediaPipe Pose (33 puntos) que forman el esqueleto
// visual — hombros, brazos, torso y piernas. La cabeza se dibuja aparte
// (ver drawSkeleton) porque no hay un landmark de "borde de la cabeza".
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

// Silueta guía por ángulo — puramente visual (referencia de encuadre), no
// depende de la detección. '45derecha'/'45izquierda' (rostro) y
// 'corpPerfilIzquierdo' (cuerpo) usan el mismo trazo que su par, espejado
// con CSS.
function GuideSilhouette({
  guide,
  aligned,
  gender,
}: {
  guide: CaptureGuide;
  aligned: boolean;
  gender?: string | null;
}) {
  const stroke = aligned ? '#22c55e' : '#ffffff';
  const mirrored = guide === '45izquierda' || guide === 'corpPerfilIzquierdo';
  const common = { fill: 'none', stroke, strokeWidth: 2.5, strokeDasharray: aligned ? undefined : '6 6', opacity: 0.85 };

  if (isBodyGuide(guide)) {
    const isProfile = guide === 'corpPerfilIzquierdo' || guide === 'corpPerfilDerecho';
    return (
      <svg
        viewBox="0 0 200 260"
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
      >
        {/* Silueta humana simplificada — cabeza, torso, brazos y piernas —
            de pie de frente/espaldas; de perfil se muestra la misma silueta
            apenas rotada, solo como referencia de encuadre completo. Marcas
            según género (14/09, pedido explícito) — puramente decorativas
            sobre este ícono genérico, no hay ninguna detección real de
            anatomía sobre la foto de la cámara. "otro"/sin especificar deja
            la figura tal cual, sin marcas. */}
        <g transform={isProfile ? 'rotate(8 100 140)' : undefined}>
          <ellipse cx="100" cy="26" rx="15" ry="17" {...common} />
          <path d="M65 48 Q100 40 135 48 L128 130 Q100 138 72 130 Z" {...common} />
          <path d="M65 48 Q54 72 58 122" {...common} />
          <path d="M135 48 Q146 72 142 122" {...common} />
          <path d="M85 130 Q75 192 67 253" {...common} />
          <path d="M115 130 Q125 192 133 253" {...common} />
          {gender === 'masculino' && <line x1="100" y1="130" x2="100" y2="150" {...common} strokeDasharray={undefined} />}
          {gender === 'femenino' && (
            <>
              <line x1="88" y1="132" x2="112" y2="132" {...common} strokeDasharray={undefined} />
              <circle cx="83" cy="76" r="7" {...common} />
              <circle cx="83" cy="76" r="1.6" fill={stroke} stroke="none" />
              <circle cx="117" cy="76" r="7" {...common} />
              <circle cx="117" cy="76" r="1.6" fill={stroke} stroke="none" />
            </>
          )}
        </g>
      </svg>
    );
  }

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
  patientGender,
}: {
  guide: CaptureGuide;
  label: string;
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallbackToFile: () => void;
  // Solo afecta la silueta genérica de cuerpo (marcas decorativas por
  // género) — no tiene ningún efecto sobre rostro ni sobre la detección.
  patientGender?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subjectDetected, setSubjectDetected] = useState(false);
  const [aligned, setAligned] = useState(false);
  // Cuerpo detectado y bien encuadrado, pero de espaldas/frente cuando la
  // ronda pedía perfil (o viceversa) — mensaje específico en vez del
  // genérico "ajusta la posición".
  const [orientationMismatch, setOrientationMismatch] = useState(false);
  const [aiStatus, setAiStatus] = useState<'loading' | 'active' | 'unavailable'>('loading');
  const [aiErrorDetail, setAiErrorDetail] = useState<string | null>(null);

  // Esqueleto de cuerpo en vivo (14/09, pedido explícito tras ver la silueta
  // genérica: "no es preciso") — a diferencia de la silueta estática de
  // rostro, para cuerpo se dibuja directamente sobre los puntos reales
  // detectados cada cuadro, actualizados por ref (no por estado de React,
  // que sería demasiado lento a 30-60 cuadros por segundo).
  const skeletonGroupRef = useRef<SVGGElement | null>(null);
  const skeletonLineRefs = useRef<(SVGLineElement | null)[]>([]);
  const headEllipseRef = useRef<SVGEllipseElement | null>(null);

  // El <video> se muestra con object-cover: si su relación de aspecto no
  // calza con el contenedor cuadrado, el navegador recorta el sobrante — sin
  // este cálculo, el esqueleto (que usa coordenadas normalizadas del cuadro
  // completo) quedaría desalineado respecto a lo que realmente se ve.
  function toContainerPercent(landmark: { x: number; y: number }, video: HTMLVideoElement) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;
    const scale = Math.max(cw / vw, ch / vh);
    const dispW = vw * scale;
    const dispH = vh * scale;
    const offsetX = (dispW - cw) / 2;
    const offsetY = (dispH - ch) / 2;
    return {
      x: ((landmark.x * dispW - offsetX) / cw) * 100,
      y: ((landmark.y * dispH - offsetY) / ch) * 100,
    };
  }

  function updateSkeletonOverlay(landmarks: { x: number; y: number }[], aligned: boolean) {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.clientWidth) return;
    POSE_CONNECTIONS.forEach(([a, b], i) => {
      const line = skeletonLineRefs.current[i];
      if (!line) return;
      const pa = toContainerPercent(landmarks[a], video);
      const pb = toContainerPercent(landmarks[b], video);
      line.setAttribute('x1', String(pa.x));
      line.setAttribute('y1', String(pa.y));
      line.setAttribute('x2', String(pb.x));
      line.setAttribute('y2', String(pb.y));
    });
    const nose = toContainerPercent(landmarks[0], video);
    const ls = toContainerPercent(landmarks[11], video);
    const rs = toContainerPercent(landmarks[12], video);
    const shoulderWidth = Math.hypot(ls.x - rs.x, ls.y - rs.y);
    const headR = Math.max(shoulderWidth * 0.32, 3);
    if (headEllipseRef.current) {
      headEllipseRef.current.setAttribute('cx', String(nose.x));
      headEllipseRef.current.setAttribute('cy', String(nose.y - headR * 0.6));
      headEllipseRef.current.setAttribute('rx', String(headR));
      headEllipseRef.current.setAttribute('ry', String(headR * 1.15));
    }
    if (skeletonGroupRef.current) {
      skeletonGroupRef.current.style.opacity = '1';
      skeletonGroupRef.current.setAttribute('stroke', aligned ? '#22c55e' : '#ffffff');
    }
  }

  function hideSkeletonOverlay() {
    if (skeletonGroupRef.current) skeletonGroupRef.current.style.opacity = '0';
  }

  // Óvalo de rostro en vivo — mismo principio que el esqueleto de cuerpo:
  // en vez de un óvalo genérico de tamaño fijo, se dibuja sobre el
  // recuadro real que detecta el modelo, cuadro a cuadro.
  const faceEllipseRef = useRef<SVGEllipseElement | null>(null);

  function updateFaceOverlay(box: { originX: number; originY: number; width: number; height: number }, aligned: boolean) {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.clientWidth) return;
    const tl = toContainerPercent({ x: box.originX / video.videoWidth, y: box.originY / video.videoHeight }, video);
    const br = toContainerPercent(
      { x: (box.originX + box.width) / video.videoWidth, y: (box.originY + box.height) / video.videoHeight },
      video
    );
    const w = br.x - tl.x;
    const h = br.y - tl.y;
    const el = faceEllipseRef.current;
    if (el) {
      el.setAttribute('cx', String((tl.x + br.x) / 2));
      el.setAttribute('cy', String((tl.y + br.y) / 2));
      el.setAttribute('rx', String(w * 0.62));
      el.setAttribute('ry', String(h * 0.78));
      el.style.opacity = '1';
      el.setAttribute('stroke', aligned ? '#22c55e' : '#ffffff');
    }
  }

  function hideFaceOverlay() {
    if (faceEllipseRef.current) faceEllipseRef.current.style.opacity = '0';
  }

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

      // La detección (rostro o cuerpo, según la toma) es un plus (guía
      // visual) — si el modelo no carga (WASM/GPU no soportado en este
      // navegador), la cámara sigue funcionando igual, solo sin el
      // indicador de "posición correcta".
      const REQUIRED_GOOD_FRAMES = 10;
      let goodFrameStreak = 0;

      try {
        if (isBodyGuide(guide)) {
          const landmarker = await withTimeout(getPoseLandmarker(), 15000);
          if (cancelled) return;
          setAiStatus('active');

          // Cuerpo completo bien encuadrado: nariz cerca de la parte
          // superior, ambos tobillos cerca de la parte inferior (o sea, se
          // ve desde la cabeza hasta los pies) y hombros centrados
          // horizontalmente. Visibility baja en algún punto clave (oclusión,
          // mala luz) invalida el cuadro igual que si no se detectara nada.
          const MIN_VISIBILITY = 0.5;
          // De frente/espaldas los hombros se ven bien separados en el
          // cuadro; de perfil, un hombro queda casi detrás del otro (poca
          // separación horizontal). Sin este chequeo, una pose de frente se
          // marcaba "correcta" aunque la ronda pidiera perfil (reportado por
          // Oscar: "es el perfil izquierdo y lo detecta frontalmente").
          const isProfileGuide = guide === 'corpPerfilIzquierdo' || guide === 'corpPerfilDerecho';
          const detectLoop = () => {
            const video = videoRef.current;
            if (video && video.readyState >= 2) {
              try {
                const result = landmarker.detectForVideo(video, performance.now());
                const landmarks = result.landmarks[0];
                const nose = landmarks?.[0];
                const leftShoulder = landmarks?.[11];
                const rightShoulder = landmarks?.[12];
                const leftAnkle = landmarks?.[27];
                const rightAnkle = landmarks?.[28];
                const keyPoints = [nose, leftShoulder, rightShoulder, leftAnkle, rightAnkle];
                const bodyOk = keyPoints.every((p) => p && (p.visibility ?? 0) >= MIN_VISIBILITY);
                if (bodyOk && nose && leftShoulder && rightShoulder && leftAnkle && rightAnkle) {
                  setSubjectDetected(true);
                  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
                  const centered = shoulderMidX > 0.3 && shoulderMidX < 0.7;
                  const headNearTop = nose.y < 0.3;
                  const feetNearBottom = leftAnkle.y > 0.7 && rightAnkle.y > 0.7;
                  const shoulderSeparation = Math.abs(leftShoulder.x - rightShoulder.x);
                  const orientationOk = isProfileGuide ? shoulderSeparation < 0.09 : shoulderSeparation > 0.14;
                  const frameOk = centered && headNearTop && feetNearBottom && orientationOk;
                  goodFrameStreak = frameOk ? goodFrameStreak + 1 : 0;
                  const isAligned = goodFrameStreak >= REQUIRED_GOOD_FRAMES;
                  setAligned(isAligned);
                  setOrientationMismatch(!orientationOk && centered && headNearTop && feetNearBottom);
                  updateSkeletonOverlay(landmarks, isAligned);
                } else {
                  goodFrameStreak = 0;
                  setSubjectDetected(false);
                  setAligned(false);
                  setOrientationMismatch(false);
                  hideSkeletonOverlay();
                }
              } catch {
                goodFrameStreak = 0;
                hideSkeletonOverlay();
              }
            }
            rafRef.current = requestAnimationFrame(detectLoop);
          };
          rafRef.current = requestAnimationFrame(detectLoop);
          return;
        }

        const detector = await withTimeout(getFaceDetector(), 8000);
        if (cancelled) return;
        setAiStatus('active');

        // Exige varios cuadros seguidos bien encuadrados antes de marcar
        // "posición correcta" — un solo cuadro con una lectura ruidosa (o un
        // falso positivo puntual) ya no alcanza para que se ponga verde, y
        // cualquier cuadro malo reinicia el contador de inmediato.
        const MIN_SCORE = 0.75;

        const detectLoop = () => {
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            try {
              const result = detector.detectForVideo(video, performance.now());
              const detection = result.detections[0];
              const score = detection?.categories?.[0]?.score ?? 0;
              if (detection && score >= MIN_SCORE) {
                setSubjectDetected(true);
                const box = detection.boundingBox;
                let frameOk = false;
                let mismatch = false;
                if (box) {
                  const cx = (box.originX + box.width / 2) / video.videoWidth;
                  const cy = (box.originY + box.height / 2) / video.videoHeight;
                  const sizeRatio = box.height / video.videoHeight;
                  const centered = cx > 0.35 && cx < 0.65 && cy > 0.25 && cy < 0.7;
                  // El acercamiento digital (ver FACE_ZOOM_SCALE) ya recorta
                  // la foto final — sin dividir el umbral por el mismo
                  // factor, había que acercarse mucho más de lo normal para
                  // que el rostro alcanzara a verse "bien encuadrado" en el
                  // cuadro completo sin recortar (reportado por Oscar).
                  const wellSized = sizeRatio > 0.28 / FACE_ZOOM_SCALE && sizeRatio < 0.65 / FACE_ZOOM_SCALE;

                  // BlazeFace entrega 6 puntos: 0 ojo derecho, 1 ojo
                  // izquierdo, 2 punta de la nariz (del propio paciente, no
                  // espejado). De frente la nariz queda centrada entre los
                  // ojos; al girar la cabeza se corre hacia un lado — sin
                  // este chequeo, "45° Derecha" y "45° Izquierda" aceptaban
                  // cualquier giro (o ninguno) como válido (reportado por
                  // Oscar: fotos a la derecha y a la izquierda "detectadas
                  // igual"). Signo por confirmar en terreno — si queda al
                  // revés, basta invertir NOSE_TURN_SIGN.
                  const keypoints = detection.keypoints;
                  const rightEye = keypoints?.[0];
                  const leftEye = keypoints?.[1];
                  const nose = keypoints?.[2];
                  let orientationOk = true;
                  if ((guide === '45derecha' || guide === '45izquierda') && rightEye && leftEye && nose) {
                    const eyeMidX = (rightEye.x + leftEye.x) / 2;
                    const NOSE_TURN_SIGN = 1;
                    const turn = (nose.x - eyeMidX) * NOSE_TURN_SIGN;
                    const TURN_THRESHOLD = 0.02;
                    orientationOk = guide === '45derecha' ? turn > TURN_THRESHOLD : turn < -TURN_THRESHOLD;
                    mismatch = !orientationOk && centered && wellSized;
                  }
                  frameOk = centered && wellSized && orientationOk;
                }
                goodFrameStreak = frameOk ? goodFrameStreak + 1 : 0;
                const isAligned = goodFrameStreak >= REQUIRED_GOOD_FRAMES;
                setAligned(isAligned);
                setOrientationMismatch(mismatch);
                if (box) updateFaceOverlay(box, isAligned);
              } else {
                goodFrameStreak = 0;
                setSubjectDetected(false);
                setAligned(false);
                setOrientationMismatch(false);
                hideFaceOverlay();
              }
            } catch {
              // Best-effort: si un frame puntual falla la detección, no
              // interrumpe el loop — solo se pierde ese cuadro.
              goodFrameStreak = 0;
              hideFaceOverlay();
            }
          }
          rafRef.current = requestAnimationFrame(detectLoop);
        };
        rafRef.current = requestAnimationFrame(detectLoop);
      } catch (err) {
        // Sin detección disponible en este navegador — se sigue mostrando
        // la cámara y la silueta guía, solo sin el indicador automático de
        // alineación. Se guarda el motivo real (temporal, para diagnóstico)
        // en vez de ocultarlo.
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
    // La foto guardada debe coincidir con el acercamiento que se ve en
    // pantalla (ver FACE_ZOOM_SCALE) — mismo recorte centrado, no solo un
    // efecto visual del preview.
    const zoom = isBodyGuide(guide) ? 1 : FACE_ZOOM_SCALE;
    const srcW = video.videoWidth / zoom;
    const srcH = video.videoHeight / zoom;
    const srcX = (video.videoWidth - srcW) / 2;
    const srcY = (video.videoHeight - srcH) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
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

        <div className="relative aspect-square w-full overflow-hidden bg-black">
          {/* El acercamiento (rostro) escala este contenedor completo — video
              y overlays juntos — para que la guía y el óvalo en vivo sigan
              coincidiendo exactamente con lo que se ve ampliado. */}
          <div
            className="absolute inset-0"
            style={!isBodyGuide(guide) ? { transform: `scale(${FACE_ZOOM_SCALE})` } : undefined}
          >
            {status !== 'error' && (
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            )}
            {status === 'ready' && !subjectDetected && (
              <GuideSilhouette guide={guide} aligned={aligned} gender={patientGender} />
            )}
            {status === 'ready' && isBodyGuide(guide) && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
                <g ref={skeletonGroupRef} stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" fill="none" style={{ opacity: 0 }}>
                  {POSE_CONNECTIONS.map((_, i) => (
                    <line
                      key={i}
                      ref={(el) => {
                        skeletonLineRefs.current[i] = el;
                      }}
                    />
                  ))}
                  <ellipse ref={headEllipseRef} />
                </g>
              </svg>
            )}
            {status === 'ready' && !isBodyGuide(guide) && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
                <ellipse ref={faceEllipseRef} fill="none" stroke="#ffffff" strokeWidth={1.6} style={{ opacity: 0 }} />
              </svg>
            )}
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
        </div>

        <div className="px-4 py-3">
          {status === 'ready' && aiStatus === 'active' && (
            <p className={`mb-3 text-center text-xs font-semibold ${aligned ? 'text-green-400' : 'text-amber-300'}`}>
              {aligned
                ? '✓ Posición correcta — puedes tomar la foto'
                : orientationMismatch
                  ? guide === 'corpPerfilIzquierdo' || guide === 'corpPerfilDerecho'
                    ? 'Gírate de perfil — se te detecta de frente'
                    : guide === '45derecha'
                      ? 'Gira la cabeza hacia su derecha — se te detecta de frente o al otro lado'
                      : guide === '45izquierda'
                        ? 'Gira la cabeza hacia su izquierda — se te detecta de frente o al otro lado'
                        : 'Ponte de frente — se te detecta de perfil'
                  : subjectDetected
                    ? 'Ajusta la posición según la guía'
                    : isBodyGuide(guide)
                      ? 'No se detecta el cuerpo completo — aléjate para que se vea de la cabeza a los pies'
                      : 'No se detecta un rostro — acércate y busca buena luz'}
            </p>
          )}
          {status === 'ready' && aiStatus === 'loading' && (
            <p className="mb-3 text-center text-xs font-semibold text-slate-400">
              {isBodyGuide(guide) ? 'Cargando detección de cuerpo...' : 'Cargando detección facial...'}
            </p>
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
