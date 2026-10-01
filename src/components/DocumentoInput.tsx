import { useEffect, useRef, useState } from 'react';
import {
  DOCUMENT_HELP,
  DOCUMENT_LABELS,
  documentPlaceholder,
  formatDocumentInput,
  isValidDocument,
  type DocumentType,
} from '../utils/documento';

// Campo de documento de identidad: el tipo va al lado del número porque el
// mismo texto puede ser válido como un tipo e inválido como otro — sin elegir
// cuál es, no hay nada que verificar. Antes el campo era solo "RUT" y eso
// dejaba fuera a las clínicas de España.
export function DocumentoInput({
  id,
  type,
  value,
  types,
  onTypeChange,
  onValueChange,
  required,
  disabled,
  onBlur,
  label = 'Documento',
}: {
  id: string;
  type: DocumentType;
  value: string;
  /** Tipos ofrecidos: de persona o de empresa según a quién identifique. */
  types: DocumentType[];
  onTypeChange: (type: DocumentType) => void;
  onValueChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Se dispara al salir del campo del número (ej. autocompletar por documento). */
  onBlur?: () => void;
  label?: string;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement | null>(null);

  // La ayuda se cierra al tocar fuera o con Escape: es informativa y no debe
  // quedar tapando el formulario.
  useEffect(() => {
    if (!helpOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setHelpOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [helpOpen]);

  const isValid = value.trim() === '' ? true : isValidDocument(type, value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div ref={helpRef} className="relative">
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            aria-label="Qué significa cada tipo de documento"
            aria-expanded={helpOpen}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500 hover:border-brand-500 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:text-brand-400"
          >
            ?
          </button>
          {helpOpen && (
            <div className="absolute left-0 top-6 z-50 w-80 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                Tipos de documento
              </p>
              <dl className="flex flex-col gap-2">
                {DOCUMENT_HELP.map((item) => (
                  <div key={item.term}>
                    <dt className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{item.term}</dt>
                    <dd className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{item.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={type}
          disabled={disabled}
          aria-label="Tipo de documento"
          onChange={(e) => {
            const next = e.target.value as DocumentType;
            onTypeChange(next);
            // Se reformatea lo ya escrito al formato del tipo nuevo: si venía
            // un RUT con puntos y se pasa a DNI, los separadores sobran.
            onValueChange(formatDocumentInput(next, value));
          }}
          className="w-32 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {DOCUMENT_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          id={id}
          value={value}
          disabled={disabled}
          required={required}
          placeholder={documentPlaceholder(type)}
          onChange={(e) => onValueChange(formatDocumentInput(type, e.target.value))}
          onBlur={onBlur}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 dark:bg-slate-800 dark:text-slate-100 ${
            isValid ? 'border-slate-200 dark:border-slate-700' : 'border-red-400 dark:border-red-500'
          }`}
        />
      </div>

      {!isValid && (
        <p className="text-xs text-red-600 dark:text-red-400">
          El {DOCUMENT_LABELS[type]} ingresado no es válido.
        </p>
      )}
    </div>
  );
}
