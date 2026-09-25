import { useState } from 'react';
import { FormatosPanel } from './FormatosPanel';
import { EmailSettingsPanel } from './EmailSettingsPanel';
import { CompaniaPanel } from './CompaniaPanel';

const SECTIONS = [
  { key: 'compania', label: 'Compañía' },
  { key: 'negocio', label: 'Negocio' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'horario', label: 'Horario' },
  { key: 'privacidad', label: 'Privacidad y Seguridad' },
  { key: 'notificaciones', label: 'Notificaciones' },
  { key: 'formatos', label: 'Formatos' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

function StubSection({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Esta sección está en construcción.</p>
      <p className="text-sm text-slate-400 dark:text-slate-500">Muy pronto vas a poder gestionar {label.toLowerCase()} desde aquí.</p>
    </div>
  );
}

export default function Configuracion() {
  const [section, setSection] = useState<SectionKey>('formatos');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configuración</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <nav id="configuracion-nav" className="flex flex-col gap-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${
                section === s.key ? 'bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div id="configuracion-contenido">
          {section === 'formatos' ? (
            <FormatosPanel />
          ) : section === 'notificaciones' ? (
            <EmailSettingsPanel />
          ) : section === 'compania' ? (
            <CompaniaPanel />
          ) : (
            <StubSection label={SECTIONS.find((s) => s.key === section)!.label} />
          )}
        </div>
      </div>
    </div>
  );
}
