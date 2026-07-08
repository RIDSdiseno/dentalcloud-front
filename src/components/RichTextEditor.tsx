import { useEffect, useRef } from 'react';
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, BulletListIcon, NumberedListIcon } from './icons';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const TOOLBAR_BUTTONS = [
  { command: 'bold', label: 'B', className: 'font-bold' },
  { command: 'italic', label: 'I', className: 'italic' },
  { command: 'underline', label: 'U', className: 'underline' },
] as const;

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  function exec(command: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  const isEmpty = !value || value === '<p><br></p>' || value.replace(/<[^>]*>/g, '').trim() === '';
  const wordCount = value
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/15">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.command}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(btn.command)}
            className={`flex h-7 w-7 items-center justify-center rounded text-sm text-slate-600 hover:bg-slate-200 ${btn.className}`}
          >
            {btn.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertUnorderedList')}
          aria-label="Lista con viñetas"
          className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200"
        >
          <BulletListIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertOrderedList')}
          aria-label="Lista numerada"
          className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200"
        >
          <NumberedListIcon className="h-4 w-4" />
        </button>
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('justifyLeft')}
          aria-label="Alinear izquierda"
          className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200"
        >
          <AlignLeftIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('justifyCenter')}
          aria-label="Centrar"
          className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200"
        >
          <AlignCenterIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('justifyRight')}
          aria-label="Alinear derecha"
          className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200"
        >
          <AlignRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        {isEmpty && (
          <p className="pointer-events-none absolute left-3 top-3 text-sm text-slate-400">
            {placeholder ?? 'Clic aquí para editar'}
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
          className="min-h-[10rem] px-3 py-3 text-sm text-slate-700 outline-none"
          suppressContentEditableWarning
        />
      </div>

      <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-3 py-1 text-xs text-slate-400">
        {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}
      </div>
    </div>
  );
}
