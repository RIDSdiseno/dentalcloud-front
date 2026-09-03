import { useRef, useState } from 'react';
import { updatePatient, uploadExamPhoto, type ExamPhotoSlot, type Patient } from '../../api/patients';
import { getErrorMessage } from '../../api/client';
import { MicIcon } from '../../components/icons';

const SKIN_TYPE_OPTIONS = ['seca', 'mixta', 'grasa', 'sensible'] as const;
const SKIN_TYPE_LABEL: Record<string, string> = { seca: 'Seca', mixta: 'Mixta', grasa: 'Grasa', sensible: 'Sensible' };

const FITZPATRICK_OPTIONS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

const WRINKLES_OPTIONS = ['dinamicas', 'estaticas'] as const;
const WRINKLES_LABEL: Record<string, string> = { dinamicas: 'Dinámicas', estaticas: 'Estáticas' };

const FLACCIDITY_OPTIONS = ['leve', 'moderada', 'severa'] as const;
const FLACCIDITY_LABEL: Record<string, string> = { leve: 'Leve', moderada: 'Moderada', severa: 'Severa' };

const VOLUME_OPTIONS = ['deficit', 'normal', 'exceso'] as const;
const VOLUME_LABEL: Record<string, string> = { deficit: 'Déficit', normal: 'Normal', exceso: 'Exceso' };

const PHOTO_SLOTS: { key: ExamPhotoSlot; label: string; field: keyof Patient }[] = [
  { key: 'frontal', label: 'Frontal', field: 'examPhotoFrontalUrl' },
  { key: 'perfilDerecho', label: 'Perfil Derecho', field: 'examPhotoPerfilDerechoUrl' },
  { key: '45derecha', label: '45° Derecha', field: 'examPhoto45DerechaUrl' },
  { key: '45izquierda', label: '45° Izquierda', field: 'examPhoto45IzquierdaUrl' },
];

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

export function ExamenEsteticoTab({ patient, onUpdate }: { patient: Patient; onUpdate: (patient: Patient) => void }) {
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
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

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

  async function handlePhotoChange(slot: ExamPhotoSlot, file: File | null) {
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const updated = await uploadExamPhoto(patient.id, slot, file);
      onUpdate(updated);
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
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
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
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Registro fotográfico</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PHOTO_SLOTS.map((slot) => {
            const url = patient[slot.field] as string | null;
            return (
              <div key={slot.key} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputs.current[slot.key]?.click()}
                  disabled={uploadingSlot === slot.key}
                  className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                >
                  {uploadingSlot === slot.key ? (
                    <span className="text-xs">Subiendo...</span>
                  ) : url ? (
                    <img src={url} alt={slot.label} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs">Click para capturar</span>
                  )}
                </button>
                <span className="text-xs font-semibold text-slate-600">{slot.label}</span>
                <input
                  ref={(el) => {
                    fileInputs.current[slot.key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => handlePhotoChange(slot.key, e.target.files?.[0] ?? null)}
                />
              </div>
            );
          })}
        </div>
      </div>

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
