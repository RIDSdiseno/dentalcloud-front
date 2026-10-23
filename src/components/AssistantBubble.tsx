import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';

type Proposal = {
  tipo: string;
  resumen: string;
  paciente: string | null;
  contenido: string | null;
  fechaHora: string | null;
  campo: string | null;
  valor: string | null;
  rut: string | null;
  telefono: string | null;
  correo: string | null;
};
type PatientHit = { id: string; firstName: string; lastName: string; phone: string | null; email: string | null; rut: string };
type Cita = { fecha: string; estado: string; tipo: string };
type Presupuesto = { number: number; name: string | null; status: string; amount: number };
type Prof = { name: string; role: string; email: string | null; rut: string | null; colegiado: string | null };
type Evolucion = { fecha: string; texto: string };
type Documento = { categoria: string; nombre: string; fecha: string };
type Saldo = { cobrado: number; pagado: number; pendiente: number };
type Prestacion = { nombre: string; codigo: string | null; precio: number; categoria: string };
type AgendaItem = { hora: string; estado: string; paciente: string };
type Consentimiento = { nombre: string; estado: string; fecha: string | null };
type SegCita = { pacienteId: string; paciente: string; fecha: string; dias: number };
type SegPago = { pacienteId: string; paciente: string; pendiente: number };
type SegPlan = { pacienteId: string; paciente: string; numero: number; nombre: string | null; monto: number; dias: number };
type Seguimiento = { citas?: SegCita[] | null; pagos?: SegPago[] | null; planes?: SegPlan[] | null };
type Msg = {
  role: 'bot' | 'me';
  text?: string;
  proposal?: Proposal;
  patients?: PatientHit[];
  profesionales?: Prof[];
  citas?: Cita[];
  presupuestos?: Presupuesto[];
  evoluciones?: Evolucion[];
  documentos?: Documento[];
  saldo?: Saldo | null;
  prestaciones?: Prestacion[];
  agenda?: AgendaItem[];
  consentimientos?: Consentimiento[];
  seguimiento?: Seguimiento;
  paciente?: string | null;
  resolved?: boolean;
};

const GREETING =
  'Buenos días. Soy el Asistente de fordentcloud. Puedo apoyarle en la reactivación de pacientes, ' +
  'el seguimiento de presupuestos, la búsqueda de fichas y los recordatorios de citas. ¿En qué puedo ayudarle?';

/**
 * Asistente flotante — Etapa 1 (solo interfaz, sin IA conectada todavía).
 * Aparece en todas las pantallas autenticadas desde AppLayout.
 */
export function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'bot', text: GREETING }]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [usage, setUsage] = useState<{ limit: number; used: number; remaining: number | null } | null>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, loading, open]);

  async function loadUsage() {
    try {
      const { data } = await api.get('/assistant/usage');
      setUsage({
        limit: Number(data.limit ?? 0),
        used: Number(data.used ?? 0),
        remaining: data.remaining === null || data.remaining === undefined ? null : Number(data.remaining),
      });
    } catch {
      /* silencioso */
    }
  }

  useEffect(() => {
    if (open) loadUsage();
  }, [open]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const history = messages
      .slice(-10)
      .map((m) => {
        let text = m.text ?? '';
        if (!text && m.patients) text = '(Le mostré los resultados de la búsqueda de pacientes.)';
        if (!text && m.profesionales) text = '(Le mostré los profesionales encontrados.)';
        if (!text && m.citas) text = `(Le mostré las citas de ${m.paciente ?? 'el paciente'}.)`;
        if (!text && m.presupuestos) text = `(Le mostré los presupuestos de ${m.paciente ?? 'el paciente'}.)`;
        if (!text && m.seguimiento) text = '(Le mostré el seguimiento de pendientes de la clínica: citas vencidas, pagos pendientes y planes sin avanzar.)';
        if (!text && m.proposal) text = '(Le propuse una acción al usuario para que la confirme.)';
        return { role: m.role === 'me' ? 'user' : 'assistant', text };
      })
      .filter((h) => h.text.length > 0);
    setInput('');
    setMessages((m) => [...m, { role: 'me', text }]);
    setLoading(true);
    try {
      const { data } = await api.post('/assistant/chat', { message: text, history });
      if (data.navigate) {
        setMessages((m) => [...m, { role: 'bot', text: `Le llevo a ${data.seccion ?? 'la sección'}.` }]);
        setOpen(false);
        navigate(data.navigate as string);
      } else if (data.denied) {
        setMessages((m) => [...m, { role: 'bot', text: `Usted no tiene permiso para ver «${data.permiso ?? 'estos datos'}».` }]);
      } else if (data.patients) {
        setMessages((m) => [...m, { role: 'bot', patients: data.patients as PatientHit[] }]);
      } else if (data.profesionales) {
        setMessages((m) => [...m, { role: 'bot', profesionales: data.profesionales as Prof[] }]);
      } else if (data.citas) {
        setMessages((m) => [...m, { role: 'bot', citas: data.citas as Cita[], paciente: data.paciente ?? null }]);
      } else if (data.presupuestos) {
        setMessages((m) => [...m, { role: 'bot', presupuestos: data.presupuestos as Presupuesto[], paciente: data.paciente ?? null }]);
      } else if (data.evoluciones) {
        setMessages((m) => [...m, { role: 'bot', evoluciones: data.evoluciones as Evolucion[], paciente: data.paciente ?? null }]);
      } else if (data.documentos) {
        setMessages((m) => [...m, { role: 'bot', documentos: data.documentos as Documento[], paciente: data.paciente ?? null }]);
      } else if (data.saldo !== undefined) {
        setMessages((m) => [...m, { role: 'bot', saldo: data.saldo as Saldo | null, paciente: data.paciente ?? null }]);
      } else if (data.prestaciones) {
        setMessages((m) => [...m, { role: 'bot', prestaciones: data.prestaciones as Prestacion[] }]);
      } else if (data.agenda) {
        setMessages((m) => [...m, { role: 'bot', agenda: data.agenda as AgendaItem[] }]);
      } else if (data.consentimientos) {
        setMessages((m) => [...m, { role: 'bot', consentimientos: data.consentimientos as Consentimiento[], paciente: data.paciente ?? null }]);
      } else if (data.seguimiento) {
        setMessages((m) => [...m, { role: 'bot', seguimiento: data.seguimiento as Seguimiento }]);
      } else if (data.proposal) {
        setMessages((m) => [...m, { role: 'bot', proposal: data.proposal as Proposal }]);
      } else {
        setMessages((m) => [...m, { role: 'bot', text: String(data.reply ?? '') }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: getErrorMessage(err, 'No se pudo contactar al asistente.') }]);
    } finally {
      setLoading(false);
      loadUsage();
    }
  }

  async function resolveProposal(index: number, confirmed: boolean) {
    const prop = messages[index]?.proposal;
    setMessages((m) => m.map((msg, idx) => (idx === index ? { ...msg, resolved: true } : msg)));
    if (!confirmed) {
      setMessages((m) => [...m, { role: 'bot', text: 'Acción cancelada. No se hizo nada.' }]);
      return;
    }
    if (!prop) return;
    try {
      const { data } = await api.post('/assistant/execute', {
        tipo: prop.tipo,
        paciente: prop.paciente,
        contenido: prop.contenido,
        fechaHora: prop.fechaHora,
        campo: prop.campo,
        valor: prop.valor,
        rut: prop.rut,
        telefono: prop.telefono,
        correo: prop.correo,
      });
      setMessages((m) => [...m, { role: 'bot', text: String(data.mensaje ?? (data.ejecutado ? 'Hecho.' : 'No se pudo ejecutar.')) }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: getErrorMessage(err, 'No se pudo ejecutar la acción.') }]);
    }
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Asistente"
          className="fixed bottom-24 left-4 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-lg">👑</span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Asistente de fordentcloud</div>
              <div className="text-[11px] text-white/85">Gestión clínica</div>
            </div>
            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Beta
            </span>
          </div>

          {usage && (
            <div className="border-b border-slate-200 bg-white px-4 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Uso de IA este mes</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {usage.limit === 0
                    ? `${usage.used.toLocaleString('es-CL')} · sin límite`
                    : `${usage.used.toLocaleString('es-CL')} / ${usage.limit.toLocaleString('es-CL')}`}
                </span>
              </div>
              {usage.limit > 0 && (
                <>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${usage.used / usage.limit >= 0.9 ? 'bg-red-500' : 'bg-brand-600'}`}
                      style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                    />
                  </div>
                  {usage.remaining !== null && (
                    <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                      Quedan {usage.remaining.toLocaleString('es-CL')} tokens este mes
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div ref={bodyRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3 dark:bg-slate-950/40">
            {messages.map((m, i) =>
              m.seguimiento ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Seguimiento · pendientes</div>

                  {m.seguimiento.citas !== undefined && (
                    <div className="mt-2">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Citas vencidas sin reagendar</div>
                      {m.seguimiento.citas === null ? (
                        <div className="mt-0.5 text-xs text-slate-400">Sin permiso para ver la agenda.</div>
                      ) : m.seguimiento.citas.length === 0 ? (
                        <div className="mt-0.5 text-xs text-slate-400">Nada pendiente 👍</div>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {m.seguimiento.citas.map((c, j) => (
                            <li key={j}>
                              <button
                                type="button"
                                onClick={() => { setOpen(false); navigate(`/pacientes/${c.pacienteId}`); }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:bg-slate-700"
                              >
                                <span className="font-medium text-slate-800 dark:text-slate-100">{c.paciente}</span>
                                <span className="text-slate-500 dark:text-slate-400"> · faltó hace {c.dias} {c.dias === 1 ? 'día' : 'días'}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {m.seguimiento.pagos !== undefined && (
                    <div className="mt-2">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pagos pendientes</div>
                      {m.seguimiento.pagos === null ? (
                        <div className="mt-0.5 text-xs text-slate-400">Sin permiso para ver la cartola.</div>
                      ) : m.seguimiento.pagos.length === 0 ? (
                        <div className="mt-0.5 text-xs text-slate-400">Nada pendiente 👍</div>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {m.seguimiento.pagos.map((p, j) => (
                            <li key={j}>
                              <button
                                type="button"
                                onClick={() => { setOpen(false); navigate(`/pacientes/${p.pacienteId}`); }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:bg-slate-700"
                              >
                                <span className="font-medium text-slate-800 dark:text-slate-100">{p.paciente}</span>
                                <span className="text-slate-500 dark:text-slate-400"> · debe ${p.pendiente.toLocaleString('es-CL')}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {m.seguimiento.planes !== undefined && (
                    <div className="mt-2">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Presupuestos sin avanzar</div>
                      {m.seguimiento.planes === null ? (
                        <div className="mt-0.5 text-xs text-slate-400">Sin permiso para ver los presupuestos.</div>
                      ) : m.seguimiento.planes.length === 0 ? (
                        <div className="mt-0.5 text-xs text-slate-400">Nada pendiente 👍</div>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {m.seguimiento.planes.map((pl, j) => (
                            <li key={j}>
                              <button
                                type="button"
                                onClick={() => { setOpen(false); navigate(`/pacientes/${pl.pacienteId}`); }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:bg-slate-700"
                              >
                                <span className="font-medium text-slate-800 dark:text-slate-100">{pl.paciente}</span>
                                <span className="text-slate-500 dark:text-slate-400"> · #{pl.numero}{pl.nombre ? ` ${pl.nombre}` : ''} · ${pl.monto.toLocaleString('es-CL')} · hace {pl.dias} días</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : m.profesionales ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {m.profesionales.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">No encontré ese profesional en tu clínica.</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Profesionales encontrados</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.profesionales.map((pr, j) => (
                          <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-600 dark:bg-slate-900/40">
                            <div className="font-medium text-slate-800 dark:text-slate-100">
                              {pr.name} <span className="text-xs font-normal text-slate-400">· {pr.role}</span>
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {pr.rut ?? 'Sin RUT'} · {pr.email ?? 'Sin correo'}{pr.colegiado ? ` · Col. ${pr.colegiado}` : ''}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.citas ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {m.citas.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">{m.paciente ? `${m.paciente} no tiene citas registradas.` : 'No encontré ese paciente en tu clínica.'}</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Citas de {m.paciente}</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.citas.map((c, j) => (
                          <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              {new Date(c.fecha).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400"> · {c.estado}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.presupuestos ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {m.presupuestos.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">{m.paciente ? `${m.paciente} no tiene presupuestos.` : 'No encontré ese paciente en tu clínica.'}</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Presupuestos de {m.paciente}</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.presupuestos.map((p, j) => (
                          <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                            <span className="font-medium text-slate-800 dark:text-slate-100">#{p.number} {p.name ?? ''}</span>
                            <div className="text-slate-500 dark:text-slate-400">{p.status} · ${p.amount.toLocaleString('es-CL')}</div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.prestaciones ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {m.prestaciones.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">No encontré prestaciones con ese nombre.</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Prestaciones</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.prestaciones.map((pr, j) => (
                          <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{pr.nombre}</span>
                            <span className="text-slate-500 dark:text-slate-400"> · ${pr.precio.toLocaleString('es-CL')}{pr.codigo ? ` · ${pr.codigo}` : ''}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.agenda ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {m.agenda.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">No hay citas para hoy.</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Agenda de hoy</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.agenda.map((a, j) => (
                          <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {new Date(a.hora).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400"> · {a.paciente} · {a.estado}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.consentimientos ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {m.consentimientos.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">{m.paciente ? `${m.paciente} no tiene consentimientos.` : 'No encontré ese paciente en tu clínica.'}</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Consentimientos de {m.paciente}</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.consentimientos.map((c, j) => (
                          <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{c.nombre}</span>
                            <span className="text-slate-500 dark:text-slate-400"> · {c.estado}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.evoluciones ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {m.evoluciones.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">{m.paciente ? `${m.paciente} no tiene evoluciones.` : 'No encontré ese paciente en tu clínica.'}</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Evoluciones de {m.paciente}</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.evoluciones.map((e, j) => (
                          <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{new Date(e.fecha).toLocaleDateString('es-CL')}</span>
                            <div className="mt-0.5 text-slate-600 dark:text-slate-300">{e.texto}</div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.documentos ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {m.documentos.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">{m.paciente ? `${m.paciente} no tiene documentos.` : 'No encontré ese paciente en tu clínica.'}</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Documentos de {m.paciente}</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.documentos.map((d, j) => (
                          <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{d.nombre}</span>
                            <span className="text-slate-500 dark:text-slate-400"> · {d.categoria} · {new Date(d.fecha).toLocaleDateString('es-CL')}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.saldo !== undefined ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {!m.saldo ? (
                    <div className="text-slate-600 dark:text-slate-300">No encontré ese paciente en tu clínica.</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Saldo de {m.paciente}</div>
                      <div className="mt-1 space-y-0.5 text-slate-700 dark:text-slate-200">
                        <div>Cobrado: ${m.saldo.cobrado.toLocaleString('es-CL')}</div>
                        <div>Pagado: ${m.saldo.pagado.toLocaleString('es-CL')}</div>
                        <div className="font-semibold">Pendiente: ${m.saldo.pendiente.toLocaleString('es-CL')}</div>
                      </div>
                    </>
                  )}
                </div>
              ) : m.patients ? (
                <div
                  key={i}
                  className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  {m.patients.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">No encontré pacientes con ese nombre en tu clínica.</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Pacientes encontrados</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.patients.map((p, j) => (
                          <li key={j}>
                            <button
                              type="button"
                              onClick={() => {
                                setOpen(false);
                                navigate(`/pacientes/${p.id}`);
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:bg-slate-700"
                            >
                              <div className="font-medium text-slate-800 dark:text-slate-100">
                                {p.firstName} {p.lastName}{' '}
                                <span className="text-xs font-normal text-brand-600">· abrir ficha →</span>
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {p.phone ?? 'Sin teléfono'} · {p.email ?? 'Sin correo'} · {p.rut}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.proposal ? (
                <div
                  key={i}
                  className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Propuesta · confírmala</div>
                  <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">{m.proposal.resumen}</div>
                  {(m.proposal.paciente || m.proposal.campo || m.proposal.fechaHora) && (
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {m.proposal.paciente && (
                        <div>Paciente: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.paciente}</span></div>
                      )}
                      {m.proposal.campo && (
                        <div>{m.proposal.campo}: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.valor}</span></div>
                      )}
                      {m.proposal.fechaHora && (
                        <div>Fecha: <span className="font-medium text-slate-700 dark:text-slate-200">{new Date(m.proposal.fechaHora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                      )}
                    </div>
                  )}
                  {m.proposal.contenido && (
                    <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-2 text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                      {m.proposal.contenido}
                    </div>
                  )}
                  {!m.resolved && (
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => resolveProposal(i, true)}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveProposal(i, false)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  key={i}
                  className={
                    m.role === 'me'
                      ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm leading-relaxed text-white'
                      : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }
                >
                  {m.text}
                </div>
              )
            )}
            {loading && (
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                Escribiendo…
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-2.5 dark:border-slate-700">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escriba lo que necesita..."
              aria-label="Mensaje para el asistente"
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-brand-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={loading}
              className="grid w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
        className="group fixed bottom-5 left-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-2xl shadow-lg shadow-brand-500/40 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-6 w-6">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <span>👑</span>
        )}
      </button>
    </>
  );
}
