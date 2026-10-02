import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import {
  fetchExamPhotos,
  fetchExamVideos,
  type ExamPhoto,
  type ExamVideo,
  type EvolutionExamRoundRef,
  type ExamRoundSource,
} from '../../api/patients';
import { CheckIcon, EyeIcon } from '../../components/icons';
import { latestBySlot } from './examRounds';
import { AvanceViewerModal } from './AvanceViewerModal';

// Elegir qué avances del Examen Estético muestra una evolución (reunión
// 30/09, tarea 18). Dos pasos, como pidió el cliente: primero de qué registro
// se quieren ver los avances, y después cuáles — con las fotos de muestra y
// selección múltiple.
//
// No sube ni saca fotos: las fotos ya se tomaron en Examen Estético, acá sólo
// se enlazan.

const SOURCES: { key: ExamRoundSource; label: string; hint: string }[] = [
  { key: 'facial', label: 'Registro fotográfico', hint: 'Avances del rostro' },
  { key: 'corporal', label: 'Avances corporal', hint: 'Avances de cuerpo completo' },
  { key: 'facialAvanzado', label: 'Fotográfico avanzado', hint: 'Escaneo guiado del rostro' },
  { key: 'video', label: 'Video', hint: 'Registro de video' },
];

type Round = {
  source: ExamRoundSource;
  moment: 'antes' | 'avance';
  round: number;
  label: string;
  /** Miniaturas, una por ángulo (vacío en video, que no las tiene). */
  thumbs: string[];
  /** Ángulos distintos y capturas totales: no coinciden cuando se retomó
   *  alguna toma, porque el registro guarda la nueva sin borrar la vieja. */
  angulos: number;
  count: number;
  createdAt: string | null;
};

function roundKey(r: { source: string; moment: string; round: number }) {
  return `${r.source}|${r.moment}|${r.round}`;
}

// Un "avance" es el conjunto de capturas que comparten registro + momento +
// número: "Antes", "Avance 1", "Avance 2"... Es el mismo criterio con el que
// el Examen Estético los agrupa en pantalla.
function groupRounds(
  source: ExamRoundSource,
  photos: ExamPhoto[],
  videos: ExamVideo[]
): Round[] {
  const porRonda = new Map<string, { moment: 'antes' | 'avance'; round: number; fotos: ExamPhoto[]; fechas: string[] }>();

  const bucket = (moment: 'antes' | 'avance', round: number) => {
    const key = `${moment}|${round}`;
    let entry = porRonda.get(key);
    if (!entry) {
      entry = { moment, round, fotos: [], fechas: [] };
      porRonda.set(key, entry);
    }
    return entry;
  };

  if (source === 'video') {
    for (const v of videos) bucket(v.moment, v.round).fechas.push(v.createdAt);
  } else {
    for (const p of photos.filter((x) => x.area === source)) {
      const entry = bucket(p.moment, p.round);
      entry.fotos.push(p);
      entry.fechas.push(p.createdAt);
    }
  }

  return [...porRonda.values()]
    .map(({ moment, round, fotos, fechas }) => {
      // Una miniatura por ángulo: si se retomó la frontal nueve veces, la
      // ronda no debe verse como nueve fotos iguales.
      const ultimas = latestBySlot(fotos);
      return {
        source,
        moment,
        round,
        label: moment === 'antes' ? 'Antes' : `Avance ${round}`,
        thumbs: ultimas.slice(0, 4).map((f) => f.url),
        angulos: ultimas.length,
        count: fechas.length,
        createdAt: fechas.length ? fechas.slice().sort()[0] : null,
      };
    })
    .sort((a, b) => {
      if (a.moment !== b.moment) return a.moment === 'antes' ? -1 : 1;
      return a.round - b.round;
    });
}

export function AvancesPickerModal({
  patientId,
  selected,
  onClose,
  onConfirm,
}: {
  patientId: string;
  selected: EvolutionExamRoundRef[];
  onClose: () => void;
  onConfirm: (rounds: EvolutionExamRoundRef[]) => void;
}) {
  const [source, setSource] = useState<ExamRoundSource | null>(null);
  const [photos, setPhotos] = useState<ExamPhoto[]>([]);
  const [videos, setVideos] = useState<ExamVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(selected.map(roundKey)));
  // Ver un avance en grande antes de marcarlo: con miniaturas de 40px no se
  // alcanza a distinguir una toma de otra.
  const [viewing, setViewing] = useState<EvolutionExamRoundRef | null>(null);

  useEffect(() => {
    Promise.all([fetchExamPhotos(patientId), fetchExamVideos(patientId).catch(() => [])])
      .then(([photosData, videosData]) => {
        setPhotos(photosData);
        setVideos(videosData);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los avances')))
      .finally(() => setIsLoading(false));
  }, [patientId]);

  const rounds = useMemo(
    () => (source ? groupRounds(source, photos, videos) : []),
    [source, photos, videos]
  );

  // Cuántos hay por registro, para no hacer entrar a uno que está vacío.
  const countBySource = useMemo(() => {
    const result = {} as Record<ExamRoundSource, number>;
    for (const s of SOURCES) result[s.key] = groupRounds(s.key, photos, videos).length;
    return result;
  }, [photos, videos]);

  function toggle(round: Round) {
    const key = roundKey(round);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleConfirm() {
    // Se recorren todos los registros para no perder lo marcado en otro paso.
    const all = SOURCES.flatMap((s) => groupRounds(s.key, photos, videos));
    onConfirm(
      all
        .filter((r) => picked.has(roundKey(r)))
        .map(({ source: src, moment, round }) => ({ source: src, moment, round }))
    );
  }

  const title = source
    ? `${SOURCES.find((s) => s.key === source)!.label} · elige los avances`
    : '¿Qué avances quieres ver?';

  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-4xl">
      {isLoading && <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Cargando avances...</p>}
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {!isLoading && !source && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SOURCES.map((s) => {
            const total = countBySource[s.key] ?? 0;
            return (
              <button
                key={s.key}
                type="button"
                disabled={total === 0}
                onClick={() => setSource(s.key)}
                className="flex flex-col items-start rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-transparent dark:border-slate-700 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
              >
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{s.hint}</span>
                <span className="mt-1 text-xs font-medium text-brand-700 dark:text-brand-400">
                  {total === 0 ? 'Sin avances todavía' : `${total} ${total === 1 ? 'avance' : 'avances'}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!isLoading && source && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rounds.map((round) => {
              const isPicked = picked.has(roundKey(round));
              return (
                <div
                  key={roundKey(round)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                    isPicked
                      ? 'border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(round)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isPicked
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isPicked && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>

                    {/* `shrink-0`: sin esto las miniaturas se desbordaban por
                        encima del nombre del avance cuando la fila quedaba
                        angosta. */}
                    <span className="flex shrink-0 -space-x-2">
                      {round.thumbs.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover ring-2 ring-white dark:ring-slate-900"
                        />
                      ))}
                      {round.thumbs.length === 0 && (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                          Video
                        </span>
                      )}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {round.label}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {round.angulos > 0 && `${round.angulos} ${round.angulos === 1 ? 'ángulo' : 'ángulos'} · `}
                        {round.count} {round.count === 1 ? 'captura' : 'capturas'}
                        {round.createdAt && ` · ${new Date(round.createdAt).toLocaleDateString('es-CL')}`}
                      </span>
                    </span>
                  </button>

                  {round.thumbs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setViewing(round)}
                      title={`Ver ${round.label} en grande`}
                      aria-label={`Ver ${round.label} en grande`}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-brand-600 dark:hover:bg-slate-900 dark:hover:text-brand-400"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSource(null)}
            className="self-start text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
          >
            ← Ver otro registro
          </button>
        </div>
      )}

      {viewing && (
        <AvanceViewerModal avance={viewing} photos={photos} onClose={() => setViewing(null)} />
      )}

      {!isLoading && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {picked.size === 0
              ? 'Ningún avance seleccionado'
              : `${picked.size} ${picked.size === 1 ? 'avance seleccionado' : 'avances seleccionados'}`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
