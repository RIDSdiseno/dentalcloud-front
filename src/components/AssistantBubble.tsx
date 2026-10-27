import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';

type Proposal = {
  tipo: string;
  resumen: string;
  paciente: string | null;
  contenido: string | null;
  fechaHora: string | null;
  fechaActual: string | null;
  campo: string | null;
  valor: string | null;
  rut: string | null;
  telefono: string | null;
  correo: string | null;
  monto: number | null;
  metodo: string | null;
  presupuesto: string | null;
  estado: string | null;
  insumo: string | null;
  cantidad: number | null;
  medicamentos: { medicamento: string; indicaciones: string }[] | null;
  observaciones: string | null;
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
type InventarioItem = { nombre: string; stock: number | null; minimo: number | null; unidad: string | null; estado: string; categoria: string | null };
type AlertaLote = { insumo: string | null; lote: string; cantidad: number; vence: string | null; estado: string; etiqueta: string; dias: number | null };
type AlertasInventario = { sinStock: number; stockBajo: number; vencidos: number; porVencer: number; items: AlertaLote[] };
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
  horasLibres?: { fecha: string; slots: string[] };
  consentimientos?: Consentimiento[];
  seguimiento?: Seguimiento;
  inventario?: InventarioItem[];
  alertasInventario?: AlertasInventario | null;
  query?: string;
  paciente?: string | null;
  resolved?: boolean;
};

const GREETING =
  'Buenos días. Soy el Asistente de fordentcloud. Puedo apoyarle en la reactivación de pacientes, ' +
  'el seguimiento de presupuestos, la búsqueda de fichas y los recordatorios de citas. ¿En qué puedo ayudarle?';

// Convierte UN resultado del backend (una tarjeta) en un mensaje del bot. Se usa
// tanto para una respuesta simple como para cada ítem de una respuesta
// multi-intención. No cubre "navegar" con redirección: eso solo aplica al caso
// simple (cambiaría de página), y acá se muestra como texto.
function msgFromResult(d: any): Msg {
  if (d.denied) return { role: 'bot', text: `Usted no tiene permiso para ver «${d.permiso ?? 'estos datos'}».` };
  if (d.navigate) return { role: 'bot', text: `Le llevo a ${d.seccion ?? 'la sección'}.` };
  if (d.patients) return { role: 'bot', patients: d.patients as PatientHit[] };
  if (d.profesionales) return { role: 'bot', profesionales: d.profesionales as Prof[] };
  if (d.citas) return { role: 'bot', citas: d.citas as Cita[], paciente: d.paciente ?? null };
  if (d.presupuestos) return { role: 'bot', presupuestos: d.presupuestos as Presupuesto[], paciente: d.paciente ?? null };
  if (d.evoluciones) return { role: 'bot', evoluciones: d.evoluciones as Evolucion[], paciente: d.paciente ?? null };
  if (d.documentos) return { role: 'bot', documentos: d.documentos as Documento[], paciente: d.paciente ?? null };
  if (d.saldo !== undefined) return { role: 'bot', saldo: d.saldo as Saldo | null, paciente: d.paciente ?? null };
  if (d.prestaciones) return { role: 'bot', prestaciones: d.prestaciones as Prestacion[] };
  if (d.agenda) return { role: 'bot', agenda: d.agenda as AgendaItem[] };
  if (d.slots) return { role: 'bot', horasLibres: { fecha: d.fecha as string, slots: d.slots as string[] } };
  if (d.consentimientos) return { role: 'bot', consentimientos: d.consentimientos as Consentimiento[], paciente: d.paciente ?? null };
  if (d.seguimiento) return { role: 'bot', seguimiento: d.seguimiento as Seguimiento };
  if (d.inventario) return { role: 'bot', inventario: d.inventario as InventarioItem[], query: (d.query as string) ?? '' };
  if (d.alertasInventario !== undefined) return { role: 'bot', alertasInventario: d.alertasInventario as AlertasInventario | null };
  if (d.proposal) return { role: 'bot', proposal: d.proposal as Proposal };
  return { role: 'bot', text: String(d.reply ?? '') };
}

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
        if (!text && m.inventario) text = '(Le mostré el inventario de insumos con su stock.)';
        if (!text && m.alertasInventario) text = '(Le mostré las alertas de inventario: stock bajo y lotes por vencer.)';
        if (!text && m.proposal) text = '(Le propuse una acción al usuario para que la confirme.)';
        return { role: m.role === 'me' ? 'user' : 'assistant', text };
      })
      .filter((h) => h.text.length > 0);
    setInput('');
    setMessages((m) => [...m, { role: 'me', text }]);
    setLoading(true);
    try {
      const { data } = await api.post('/assistant/chat', { message: text, history });
      // Multi-intención: el backend puede devolver varios resultados (uno por
      // pedido) en `multi`. Se muestra una tarjeta por cada uno. Un solo
      // resultado mantiene el comportamiento de siempre (incluida la
      // redirección de "navegar", que acá no aplica porque cambiaría de página).
      if (Array.isArray(data.multi)) {
        setMessages((m) => [...m, ...(data.multi as unknown[]).map((r) => msgFromResult(r))]);
      } else if (data.navigate) {
        setMessages((m) => [...m, { role: 'bot', text: `Le llevo a ${data.seccion ?? 'la sección'}.` }]);
        setOpen(false);
        navigate(data.navigate as string);
      } else {
        setMessages((m) => [...m, msgFromResult(data)]);
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
        fechaActual: prop.fechaActual,
        campo: prop.campo,
        valor: prop.valor,
        rut: prop.rut,
        telefono: prop.telefono,
        correo: prop.correo,
        monto: prop.monto,
        metodo: prop.metodo,
        presupuesto: prop.presupuesto,
        estado: prop.estado,
        insumo: prop.insumo,
        cantidad: prop.cantidad,
        medicamentos: prop.medicamentos,
        observaciones: prop.observaciones,
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
            <img src="/favicon.svg" alt="fordentcloud" className="h-7 w-7 [filter:brightness(0)_invert(1)]" />
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
              ) : m.horasLibres ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                    Horas libres · {new Date(m.horasLibres.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'short' })}
                  </div>
                  {m.horasLibres.slots.length === 0 ? (
                    <div className="mt-1 text-slate-600 dark:text-slate-300">No hay horas libres ese día.</div>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.horasLibres.slots.map((h, j) => (
                        <span key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : m.inventario ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {m.inventario.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-300">{m.query ? `No encontré insumos para «${m.query}».` : 'No hay insumos en el inventario.'}</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Inventario{m.query ? ` · ${m.query}` : ''}</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.inventario.map((s, j) => {
                          const out = s.estado === 'OUT_OF_STOCK';
                          const low = s.estado === 'LOW_STOCK';
                          const estadoTxt = out ? 'sin stock' : low ? 'stock bajo' : s.estado === 'ARCHIVED' ? 'archivado' : 'ok';
                          const estadoCls = out
                            ? 'text-rose-600 dark:text-rose-400'
                            : low
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400';
                          return (
                            <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                              <span className="font-medium text-slate-700 dark:text-slate-200">{s.nombre}</span>
                              <span className="text-slate-500 dark:text-slate-400"> · {s.stock ?? 0}{s.unidad ? ` ${s.unidad}` : ''}{s.minimo != null ? ` (mín. ${s.minimo})` : ''}</span>
                              <span className={`font-medium ${estadoCls}`}> · {estadoTxt}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              ) : m.alertasInventario !== undefined ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  {!m.alertasInventario ? (
                    <div className="text-slate-600 dark:text-slate-300">No pude leer el inventario.</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Alertas de inventario</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">Sin stock: {m.alertasInventario.sinStock}</span>
                        <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Stock bajo: {m.alertasInventario.stockBajo}</span>
                        <span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">Vencidos: {m.alertasInventario.vencidos}</span>
                        <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Por vencer: {m.alertasInventario.porVencer}</span>
                      </div>
                      {m.alertasInventario.items.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {m.alertasInventario.items.map((l, j) => (
                            <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                              <span className="font-medium text-slate-700 dark:text-slate-200">{l.insumo ?? 'Insumo'}</span>
                              <span className="text-slate-500 dark:text-slate-400"> · lote {l.lote} · {l.cantidad} u.</span>
                              <span className={`font-medium ${l.estado === 'EXPIRED' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}> · {l.etiqueta}{l.dias != null ? (l.estado === 'EXPIRED' ? ` (hace ${Math.abs(l.dias)} d)` : ` (${l.dias} d)`) : ''}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {m.alertasInventario.sinStock === 0 && m.alertasInventario.stockBajo === 0 && m.alertasInventario.vencidos === 0 && m.alertasInventario.porVencer === 0 && (
                        <div className="mt-2 text-slate-600 dark:text-slate-300">Todo en orden: sin quiebres de stock ni vencimientos próximos.</div>
                      )}
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
                  {(m.proposal.paciente || m.proposal.campo || m.proposal.fechaHora || m.proposal.fechaActual || m.proposal.insumo) && (
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {m.proposal.paciente && (
                        <div>Paciente: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.paciente}</span></div>
                      )}
                      {m.proposal.insumo && (
                        <div>Descontar: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.cantidad ?? ''} de {m.proposal.insumo}</span></div>
                      )}
                      {m.proposal.campo && (
                        <div>{m.proposal.campo}: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.valor}</span></div>
                      )}
                      {m.proposal.monto != null && (
                        <div>Monto: <span className="font-medium text-slate-700 dark:text-slate-200">${m.proposal.monto.toLocaleString('es-CL')}{m.proposal.metodo ? ` · ${m.proposal.metodo}` : ''}{m.proposal.presupuesto ? ` · presup. #${m.proposal.presupuesto.replace(/\D/g, '') || m.proposal.presupuesto}` : ''}</span></div>
                      )}
                      {m.proposal.estado && (
                        <div>
                          Presupuesto{m.proposal.presupuesto ? ` #${m.proposal.presupuesto.replace(/\D/g, '') || m.proposal.presupuesto}` : ''}:{' '}
                          <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.estado === 'alta' ? 'de alta' : m.proposal.estado.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {m.proposal.fechaActual && (
                        <div>Cita actual: <span className="font-medium text-slate-700 dark:text-slate-200">{new Date(m.proposal.fechaActual).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                      )}
                      {m.proposal.fechaHora && (
                        <div>{m.proposal.tipo === 'reagendar_cita' ? 'Nueva hora' : m.proposal.tipo === 'cancelar_cita' ? 'Cita' : 'Fecha'}: <span className="font-medium text-slate-700 dark:text-slate-200">{new Date(m.proposal.fechaHora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                      )}
                    </div>
                  )}
                  {m.proposal.medicamentos && m.proposal.medicamentos.length > 0 && (
                    <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-2 dark:border-slate-600 dark:bg-slate-900/40">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Receta</div>
                      <ul className="mt-1 space-y-1">
                        {m.proposal.medicamentos.map((med, k) => (
                          <li key={k} className="text-xs text-slate-700 dark:text-slate-200">
                            <span className="font-medium">{med.medicamento}</span>
                            {med.indicaciones ? <span className="text-slate-500 dark:text-slate-400"> · {med.indicaciones}</span> : null}
                          </li>
                        ))}
                      </ul>
                      {m.proposal.observaciones && (
                        <div className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">{m.proposal.observaciones}</div>
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
          <img src="/favicon.svg" alt="fordentcloud" className="h-7 w-7 [filter:brightness(0)_invert(1)]" />
        )}
      </button>
    </>
  );
}
