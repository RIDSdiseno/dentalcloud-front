import { useState } from 'react';
import { Modal } from '../../components/Modal';
import type { ExamPhoto, EvolutionExamRoundRef, ExamRoundSource } from '../../api/patients';
import { SLOT_LABEL, latestBySlot, sortedBySlot } from './examRounds';

const ROUND_SOURCE_LABEL: Record<ExamRoundSource, string> = {
  facial: 'Registro fotográfico',
  corporal: 'Avances corporal',
  facialAvanzado: 'Fotográfico avanzado',
  video: 'Video',
};

export function roundLabel(ref: EvolutionExamRoundRef) {
  const momento = ref.moment === 'antes' ? 'Antes' : `Avance ${ref.round}`;
  return `${ROUND_SOURCE_LABEL[ref.source]} · ${momento}`;
}

// Las fotos del avance viven en el Examen Estético; acá sólo se filtran por la
// referencia (registro + antes/avance + número).
export function photosFor(ref: EvolutionExamRoundRef, photos: ExamPhoto[]): ExamPhoto[] {
  // El registro de video no tiene fotos: se rotula y ya.
  if (ref.source === 'video') return [];
  return photos.filter((p) => p.area === ref.source && p.moment === ref.moment && p.round === ref.round);
}

// Ver las fotos de un avance en grande. Se usa tanto desde la evolución ya
// grabada como desde el selector de avances, para no tener que elegir a ciegas.
export function AvanceViewerModal({
  avance,
  photos,
  onClose,
}: {
  avance: EvolutionExamRoundRef;
  photos: ExamPhoto[];
  onClose: () => void;
}) {
  // Por defecto sólo la última foto de cada ángulo: al retomar, el registro
  // guarda la nueva sin borrar la vieja, y mostrarlas todas llena la pantalla
  // de descartes (hay rondas con 9 frontales de una misma sesión de pruebas).
  const [verTodas, setVerTodas] = useState(false);
  const todas = photosFor(avance, photos);
  const ultimas = latestBySlot(todas);
  const fotos = verTodas ? sortedBySlot(todas) : ultimas;
  const repetidas = todas.length - ultimas.length;

  return (
    <Modal title={roundLabel(avance)} onClose={onClose} maxWidth="max-w-5xl">
      {repetidas > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {verTodas
              ? `Mostrando las ${todas.length} capturas, incluidas las que se retomaron.`
              : `Mostrando la última foto de cada ángulo. Hay ${repetidas} ${
                  repetidas === 1 ? 'captura anterior guardada' : 'capturas anteriores guardadas'
                }.`}
          </span>
          <button
            type="button"
            onClick={() => setVerTodas((prev) => !prev)}
            className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
          >
            {verTodas ? 'Ver sólo las últimas' : `Ver las ${todas.length} capturas`}
          </button>
        </div>
      )}

      {fotos.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Este avance no tiene fotos para mostrar.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fotos.map((foto) => (
            <figure key={foto.id} className="flex flex-col gap-1">
              {/* El enlace lleva a la imagen original, por si necesitan verla
                  al 100% o guardarla. */}
              <a href={foto.url} target="_blank" rel="noreferrer">
                <img
                  src={foto.url}
                  alt={SLOT_LABEL[foto.slot] ?? foto.slot}
                  className="w-full rounded-xl object-contain ring-1 ring-slate-200 dark:ring-slate-700"
                />
              </a>
              <figcaption className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {SLOT_LABEL[foto.slot] ?? foto.slot}
                {verTodas &&
                  ` · ${new Date(foto.createdAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}`}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </Modal>
  );
}
