import { CONSULTA_TIPO_LABELS, type ConsultaTipo } from '../../api/appointments';

// "Motivo de consulta" al agendar (reunión 30/09, tarea 21): un selector
// Primera vez / Tratamiento y, debajo, el motivo sólo cuando es tratamiento
// — en una primera vez todavía no hay nada que continuar. Lo usan los dos
// formularios desde los que se puede agendar (el modal de la agenda y el que
// sale al pinchar un hueco libre de la parrilla), para que no se desincronicen.
//
// Es opcional a propósito: dejarlo obligatorio frenaría a recepción cuando
// agenda por teléfono y todavía no sabe a qué viene el paciente.
export function ConsultaTipoField({
  idPrefix,
  consultaTipo,
  motivoConsulta,
  onConsultaTipoChange,
  onMotivoConsultaChange,
}: {
  idPrefix: string;
  consultaTipo: ConsultaTipo | null;
  motivoConsulta: string;
  onConsultaTipoChange: (value: ConsultaTipo | null) => void;
  onMotivoConsultaChange: (value: string) => void;
}) {
  const options = Object.keys(CONSULTA_TIPO_LABELS) as ConsultaTipo[];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Motivo de consulta</span>
      <div className="inline-flex w-fit rounded-lg bg-slate-100 p-0.5 text-sm font-semibold dark:bg-slate-800">
        {options.map((option) => {
          const active = consultaTipo === option;
          return (
            <button
              key={option}
              type="button"
              // Volver a pinchar la opción activa la deselecciona: así se puede
              // dejar en blanco si se agendó sin saber a qué viene.
              onClick={() => onConsultaTipoChange(active ? null : option)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                active
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {CONSULTA_TIPO_LABELS[option]}
            </button>
          );
        })}
      </div>

      {consultaTipo === 'tratamiento' && (
        <>
          <label htmlFor={`${idPrefix}-motivo`} className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            ¿Por qué viene?
          </label>
          <input
            id={`${idPrefix}-motivo`}
            value={motivoConsulta}
            onChange={(e) => onMotivoConsultaChange(e.target.value)}
            placeholder="Ej: control de ortodoncia, segunda sesión de botox."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </>
      )}
    </div>
  );
}
