import { useEffect, useRef, useState } from 'react';
import {
  updatePatient,
  uploadExamPhoto,
  fetchExamPhotos,
  type ExamPhoto,
  type ExamPhotoMoment,
  type ExamPhotoSlot,
  type Patient,
} from '../../api/patients';
import { getErrorMessage } from '../../api/client';
import { MicIcon, CameraIcon, LockIcon, ChevronDownIcon } from '../../components/icons';
import { CameraCaptureModal, type CaptureGuide } from '../../components/CameraCaptureModal';
import { fetchConsentTypes, fetchPatientConsents } from '../../api/dataConsents';

// Mismo code que usa el backend (ver src/lib/consentTypes.ts) para exigir
// este consentimiento antes de subir cualquier foto del examen estético.
const PHOTO_USAGE_CONSENT_CODE = 'uso_imagenes';

const SKIN_TYPE_OPTIONS = ['seca', 'mixta', 'grasa', 'sensible'] as const;
const SKIN_TYPE_LABEL: Record<string, string> = { seca: 'Seca', mixta: 'Mixta', grasa: 'Grasa', sensible: 'Sensible' };

const FITZPATRICK_OPTIONS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

const WRINKLES_OPTIONS = ['dinamicas', 'estaticas'] as const;
const WRINKLES_LABEL: Record<string, string> = { dinamicas: 'Dinámicas', estaticas: 'Estáticas' };

const FLACCIDITY_OPTIONS = ['leve', 'moderada', 'severa'] as const;
const FLACCIDITY_LABEL: Record<string, string> = { leve: 'Leve', moderada: 'Moderada', severa: 'Severa' };

const VOLUME_OPTIONS = ['deficit', 'normal', 'exceso'] as const;
const VOLUME_LABEL: Record<string, string> = { deficit: 'Déficit', normal: 'Normal', exceso: 'Exceso' };

const PHOTO_SLOTS: { key: ExamPhotoSlot; label: string; guide: CaptureGuide }[] = [
  { key: 'frontal', label: 'Frontal', guide: 'frontal' },
  { key: 'perfilDerecho', label: 'Perfil Derecho', guide: 'perfil' },
  { key: '45derecha', label: '45° Derecha', guide: '45derecha' },
  { key: '45izquierda', label: '45° Izquierda', guide: '45izquierda' },
];

// Última foto de cada ángulo para una ronda puntual (moment + round) — si se
// retoma un ángulo dentro de la misma ronda, se usa la más reciente.
function latestBySlot(photos: ExamPhoto[], moment: ExamPhotoMoment, round: number) {
  const map = new Map<ExamPhotoSlot, ExamPhoto>();
  for (const p of photos) {
    if (p.moment !== moment || p.round !== round) continue;
    const existing = map.get(p.slot);
    if (!existing || new Date(p.createdAt) > new Date(existing.createdAt)) map.set(p.slot, p);
  }
  return map;
}

function roundComplete(photos: ExamPhoto[], moment: ExamPhotoMoment, round: number) {
  const map = latestBySlot(photos, moment, round);
  return PHOTO_SLOTS.every((s) => map.has(s.key));
}

// Grid de 4 casillas (Frontal/Perfil Derecho/45°/45°) para una ronda puntual
// — se reutiliza tal cual para "Antes" y para cada ronda de "Avance".
function PhotoRoundGrid({
  moment,
  round,
  photos,
  uploadingSlot,
  fileInputs,
  onOpenCamera,
  onFileChange,
  disabled,
}: {
  moment: ExamPhotoMoment;
  round: number;
  photos: ExamPhoto[];
  uploadingSlot: ExamPhotoSlot | null;
  fileInputs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onOpenCamera: (slot: ExamPhotoSlot) => void;
  onFileChange: (slot: ExamPhotoSlot, file: File | null) => void;
  disabled?: boolean;
}) {
  const bySlot = latestBySlot(photos, moment, round);
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {PHOTO_SLOTS.map((slot) => {
        const url = bySlot.get(slot.key)?.url ?? null;
        const inputKey = `${moment}-${round}-${slot.key}`;
        return (
          <div key={slot.key} className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenCamera(slot.key)}
              disabled={disabled || uploadingSlot === slot.key}
              className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            >
              {uploadingSlot === slot.key ? (
                <span className="text-xs">Subiendo...</span>
              ) : url ? (
                <img src={url} alt={slot.label} className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-slate-400">
                  <CameraIcon className="h-6 w-6" />
                  <span className="text-xs">Click para capturar</span>
                </span>
              )}
            </button>
            <span className="text-xs font-semibold text-slate-600">{slot.label}</span>
            <input
              ref={(el) => {
                fileInputs.current[inputKey] = el;
              }}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => onFileChange(slot.key, e.target.files?.[0] ?? null)}
            />
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10';

export function ExamenEsteticoTab({
  patient,
  onUpdate,
  onGoToConsents,
}: {
  patient: Patient;
  onUpdate: (patient: Patient) => void;
  onGoToConsents: () => void;
}) {
  const [skinType, setSkinType] = useState(patient.examSkinType ?? '');
  const [fitzpatrick, setFitzpatrick] = useState(patient.examFitzpatrick ?? '');
  const [wrinkles, setWrinkles] = useState(patient.examWrinkles ?? '');
  const [flaccidity, setFlaccidity] = useState(patient.examFlaccidity ?? '');
  const [volume, setVolume] = useState(patient.examVolume ?? '');
  const [asymmetries, setAsymmetries] = useState(patient.examAsymmetries ?? null);
  const [asymmetryNotes, setAsymmetryNotes] = useState(patient.examAsymmetryNotes ?? '');
  const [diagnosis, setDiagnosis] = useState(patient.examDiagnosis ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<ExamPhotoSlot | null>(null);
  const [dictating, setDictating] = useState(false);
  const [examPhotos, setExamPhotos] = useState<ExamPhoto[]>([]);
  // Ronda de "Avance" que el doctor eligió empezar recién ahora, antes de que
  // tenga ninguna foto propia — así el grid vacío ya aparece al tocar el
  // botón, en vez de esperar a la primera foto para existir.
  const [pendingAvanceRound, setPendingAvanceRound] = useState<number | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ slot: ExamPhotoSlot; moment: ExamPhotoMoment; round: number } | null>(
    null
  );
  const [showOlderPhotos, setShowOlderPhotos] = useState(false);
  const [photoConsentChecked, setPhotoConsentChecked] = useState(false);
  const [photoConsentSigned, setPhotoConsentSigned] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchExamPhotos(patient.id)
      .then(setExamPhotos)
      .catch((err) => setSaveError(getErrorMessage(err, 'No se pudo cargar el registro fotográfico')));
  }, [patient.id]);

  useEffect(() => {
    let cancelled = false;
    async function checkConsent() {
      try {
        const types = await fetchConsentTypes();
        const photoType = types.find((t) => t.code === PHOTO_USAGE_CONSENT_CODE);
        if (!photoType) {
          if (!cancelled) setPhotoConsentSigned(false);
          return;
        }
        const consents = await fetchPatientConsents(patient.id);
        const signed = consents.some((c) => c.consentTypeId === photoType.id && c.status === 'firmado');
        if (!cancelled) setPhotoConsentSigned(signed);
      } catch {
        if (!cancelled) setPhotoConsentSigned(false);
      } finally {
        if (!cancelled) setPhotoConsentChecked(true);
      }
    }
    checkConsent();
    return () => {
      cancelled = true;
    };
  }, [patient.id]);

  const antesDone = roundComplete(examPhotos, 'antes', 1);
  const avanceRoundsWithPhotos = Array.from(
    new Set(examPhotos.filter((p) => p.moment === 'avance').map((p) => p.round))
  ).sort((a, b) => a - b);
  const lastAvanceRound = avanceRoundsWithPhotos[avanceRoundsWithPhotos.length - 1] ?? 0;
  const lastAvanceDone = lastAvanceRound > 0 ? roundComplete(examPhotos, 'avance', lastAvanceRound) : true;
  const visibleAvanceRounds = pendingAvanceRound
    ? Array.from(new Set([...avanceRoundsWithPhotos, pendingAvanceRound])).sort((a, b) => a - b)
    : avanceRoundsWithPhotos;
  const canStartNewAvance = antesDone && lastAvanceDone && !pendingAvanceRound;

  // Orden de despliegue: lo más nuevo arriba, lo más viejo abajo. "Antes" es
  // siempre lo más antiguo — solo queda primero cuando todavía no existe
  // ningún Avance.
  const allRounds: { moment: ExamPhotoMoment; round: number; label: string }[] = [
    ...visibleAvanceRounds
      .slice()
      .reverse()
      .map((round) => ({ moment: 'avance' as const, round, label: `Avance ${round}` })),
    { moment: 'antes' as const, round: 1, label: 'Antes' },
  ];
  const [latestRound, ...olderRounds] = allRounds;

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updatePatient(patient.id, {
        examSkinType: skinType,
        examFitzpatrick: fitzpatrick,
        examWrinkles: wrinkles,
        examFlaccidity: flaccidity,
        examVolume: volume,
        examAsymmetries: asymmetries,
        examAsymmetryNotes: asymmetryNotes,
        examDiagnosis: diagnosis,
      });
      onUpdate(updated);
    } catch (err) {
      setSaveError(getErrorMessage(err, 'No se pudo guardar el examen estético'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(
    slot: ExamPhotoSlot,
    moment: ExamPhotoMoment,
    round: number,
    file: File | null
  ) {
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const updated = await uploadExamPhoto(patient.id, slot, file, moment, round);
      setExamPhotos(updated);
      if (moment === 'avance') setPendingAvanceRound(null);
    } catch (err) {
      setSaveError(getErrorMessage(err, 'No se pudo subir la foto'));
    } finally {
      setUploadingSlot(null);
    }
  }

  function handleDictate() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSaveError('Este navegador no soporta dictado por voz.');
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'es-CL';
    recognition.interimResults = false;
    recognition.onstart = () => setDictating(true);
    recognition.onend = () => setDictating(false);
    recognition.onerror = () => setDictating(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setDiagnosis((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.start();
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div id="examen-estetico-card" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Evaluación estética</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tipo de piel">
            <select className={selectClass} value={skinType} onChange={(e) => setSkinType(e.target.value)}>
              <option value="">No especificado</option>
              {SKIN_TYPE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {SKIN_TYPE_LABEL[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fototipo Fitzpatrick">
            <select className={selectClass} value={fitzpatrick} onChange={(e) => setFitzpatrick(e.target.value)}>
              <option value="">No especificado</option>
              {FITZPATRICK_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Arrugas">
            <select className={selectClass} value={wrinkles} onChange={(e) => setWrinkles(e.target.value)}>
              <option value="">No especificado</option>
              {WRINKLES_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {WRINKLES_LABEL[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Flacidez">
            <select className={selectClass} value={flaccidity} onChange={(e) => setFlaccidity(e.target.value)}>
              <option value="">No especificado</option>
              {FLACCIDITY_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {FLACCIDITY_LABEL[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Volumen">
            <select className={selectClass} value={volume} onChange={(e) => setVolume(e.target.value)}>
              <option value="">No especificado</option>
              {VOLUME_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {VOLUME_LABEL[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Asimetrías">
            <select
              className={selectClass}
              value={asymmetries === null ? '' : asymmetries ? 'si' : 'no'}
              onChange={(e) => setAsymmetries(e.target.value === '' ? null : e.target.value === 'si')}
            >
              <option value="">No especificado</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Otros hallazgos">
            <textarea
              rows={2}
              value={asymmetryNotes}
              onChange={(e) => setAsymmetryNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Registro fotográfico</h2>
        <p className="mb-4 text-xs text-slate-500">
          Máximo 4 fotos por ronda: Frontal, Perfil Derecho, 45° Derecha y 45° Izquierda.
        </p>

        {!photoConsentChecked ? (
          <p className="mb-4 text-xs text-slate-400">Verificando consentimiento...</p>
        ) : !photoConsentSigned ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold">
                El paciente debe firmar el consentimiento de uso de fotografías antes de poder tomar fotos.
              </p>
              <button type="button" onClick={onGoToConsents} className="mt-1.5 font-semibold underline">
                Ir a Consentimientos
              </button>
            </div>
          </div>
        ) : null}

        <div className="mb-2">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{latestRound.label}</h3>
          <PhotoRoundGrid
            moment={latestRound.moment}
            round={latestRound.round}
            photos={examPhotos}
            uploadingSlot={uploadingSlot}
            fileInputs={fileInputs}
            disabled={!photoConsentSigned}
            onOpenCamera={(slot) => setCameraTarget({ slot, moment: latestRound.moment, round: latestRound.round })}
            onFileChange={(slot, file) => handlePhotoChange(slot, latestRound.moment, latestRound.round, file)}
          />
        </div>

        {olderRounds.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowOlderPhotos((v) => !v)}
              className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showOlderPhotos ? 'rotate-180' : ''}`} />
              {showOlderPhotos ? 'Ocultar fotos anteriores' : `Desplegar fotos anteriores (${olderRounds.length})`}
            </button>
            {showOlderPhotos && (
              <div className="mt-4 flex flex-col gap-6 border-t border-slate-100 pt-4">
                {olderRounds.map((r) => (
                  <div key={`${r.moment}-${r.round}`}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{r.label}</h3>
                    <PhotoRoundGrid
                      moment={r.moment}
                      round={r.round}
                      photos={examPhotos}
                      uploadingSlot={uploadingSlot}
                      fileInputs={fileInputs}
                      disabled={!photoConsentSigned}
                      onOpenCamera={(slot) => setCameraTarget({ slot, moment: r.moment, round: r.round })}
                      onFileChange={(slot, file) => handlePhotoChange(slot, r.moment, r.round, file)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
        {canStartNewAvance ? (
          <button
            type="button"
            onClick={() => setPendingAvanceRound(lastAvanceRound + 1)}
            disabled={!photoConsentSigned}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-300 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CameraIcon className="h-4 w-4" />
            + Agregar Avance {lastAvanceRound + 1}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-400">
            <LockIcon className="h-4 w-4" />
            {antesDone
              ? 'Completa las 4 fotos del Avance actual para poder agregar uno nuevo'
              : 'Completa las 4 fotos de "Antes" primero para desbloquear el Avance'}
          </div>
        )}
      </div>

      {cameraTarget && (
        <CameraCaptureModal
          guide={PHOTO_SLOTS.find((s) => s.key === cameraTarget.slot)!.guide}
          label={`${PHOTO_SLOTS.find((s) => s.key === cameraTarget.slot)!.label} — ${
            cameraTarget.moment === 'antes' ? 'Antes' : `Avance ${cameraTarget.round}`
          }`}
          onClose={() => setCameraTarget(null)}
          onFallbackToFile={() => {
            const target = cameraTarget;
            setCameraTarget(null);
            fileInputs.current[`${target.moment}-${target.round}-${target.slot}`]?.click();
          }}
          onCapture={(file) => {
            const target = cameraTarget;
            setCameraTarget(null);
            handlePhotoChange(target.slot, target.moment, target.round, file);
          }}
        />
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Diagnóstico</h2>
          <button
            type="button"
            onClick={handleDictate}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${dictating ? 'animate-pulse bg-red-600' : 'bg-brand-600 hover:bg-brand-700'}`}
            aria-label="Dictar diagnóstico por voz"
          >
            <MicIcon className="h-4 w-4" />
          </button>
        </div>
        <textarea
          rows={4}
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Escribe o dicta el diagnóstico con el micrófono..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? 'Guardando...' : 'Guardar examen'}
          </button>
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
        </div>
      </div>
    </div>
  );
}
