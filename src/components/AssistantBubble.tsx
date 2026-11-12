import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AssistantMascot, mascotVariantFrom, type MascotState } from './AssistantMascot';

type Proposal = {
  tipo: string;
  resumen: string;
  paciente: string | null;
  pacienteId?: string | null;
  pacienteRut?: string | null;
  contenido: string | null;
  fechaHora: string | null;
  fechaActual: string | null;
  sillon?: string | null;
  duracionMin?: number | null;
  profesional?: string | null;
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
  lote: string | null;
  vencimiento: string | null;
  cantidad: number | null;
  medicamentos: { medicamento: string; indicaciones: string }[] | null;
  observaciones: string | null;
  items: { descripcion: string; precio: number | null; cantidad: number | null }[] | null;
  consentimiento: string | null;
  titulo: string | null;
  procedimiento: string | null;
};
// Una clave fija por tarjeta (09-11-2026): si la misma tarjeta se confirma dos
// veces (doble clic, reintento), el servidor ejecuta la acción una sola vez.
const proposalKeys = new WeakMap<object, string>();
function idempotencyKeyFor(prop: object) {
  let key = proposalKeys.get(prop);
  if (!key) {
    key = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    proposalKeys.set(prop, key);
  }
  return key;
}

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
type Reporte = {
  tipo: string;
  periodoTxt?: string;
  total?: number;
  movimientos?: number;
  count?: number;
  deudores?: { paciente: string; monto: number }[];
  sinIniciar?: number;
  enTratamiento?: number;
  terminados?: number;
  pagos?: { paciente: string; monto: number; metodo?: string | null; fecha?: string }[];
};
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
  agendaTitulo?: string;
  agendaVariosDias?: boolean;
  horasLibres?: { fecha: string; slots: string[] };
  consentimientos?: Consentimiento[];
  seguimiento?: Seguimiento;
  inventario?: InventarioItem[];
  alertasInventario?: AlertasInventario | null;
  reporte?: Reporte;
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
  if (d.agenda) return { role: 'bot', agenda: d.agenda as AgendaItem[], agendaTitulo: typeof d.agendaTitulo === 'string' ? d.agendaTitulo : undefined, agendaVariosDias: Boolean(d.agendaVariosDias) };
  if (d.slots) return { role: 'bot', horasLibres: { fecha: d.fecha as string, slots: d.slots as string[] } };
  if (d.consentimientos) return { role: 'bot', consentimientos: d.consentimientos as Consentimiento[], paciente: d.paciente ?? null };
  if (d.seguimiento) return { role: 'bot', seguimiento: d.seguimiento as Seguimiento };
  if (d.inventario) return { role: 'bot', inventario: d.inventario as InventarioItem[], query: (d.query as string) ?? '' };
  if (d.alertasInventario !== undefined) return { role: 'bot', alertasInventario: d.alertasInventario as AlertasInventario | null };
  if (d.reporte) return { role: 'bot', reporte: d.reporte as Reporte };
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
  // Voz (Web Speech API del navegador: gratis, sin backend, mejor en Chrome/Edge).
  const [voiceOn, setVoiceOn] = useState(false); // leer las respuestas en voz alta
  const [listening, setListening] = useState(false); // micrófono activo (Web Speech API)
  const recognitionRef = useRef<any>(null);
  const spokenRef = useRef(0); // cuántos mensajes ya se leyeron en voz alta
  // Dictado por grabación (iPad/iPhone): esos equipos NO soportan la Web Speech
  // API, así que se graba el audio y se transcribe en el backend (Whisper).
  const [recording, setRecording] = useState(false); // grabando audio
  const [transcribing, setTranscribing] = useState(false); // enviando audio a transcribir
  const mediaRecorderRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  // Reconocimiento de voz nativo del navegador (Chrome/Edge/Android): gratis e
  // instantáneo. Es el camino preferido cuando existe.
  const voiceSupported =
    typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  // Grabación de audio: existe en iPad/iPhone (y casi todos). Es el plan B para
  // dictar cuando no hay reconocimiento nativo.
  const mediaSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof (window as any).MediaRecorder !== 'undefined';
  // Se muestra el micrófono si cualquiera de los dos caminos está disponible.
  const micSupported = voiceSupported || mediaSupported;
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'bot', text: GREETING }]);
  // ---- Personaje animado (solo presentación) ----
  const { user } = useAuth();
  const mascotVariant = mascotVariantFrom(user?.clinicaTipo);
  const [speaking, setSpeaking] = useState(false); // leyendo una respuesta en voz alta
  const [happy, setHappy] = useState(false); // acaba de responder
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      setHappy(true);
      const t = setTimeout(() => setHappy(false), 1400);
      wasLoadingRef.current = loading;
      return () => clearTimeout(t);
    }
    wasLoadingRef.current = loading;
  }, [loading]);
  const mascotState: MascotState =
    listening || recording
      ? 'listening'
      : loading || transcribing
        ? 'thinking'
        : speaking
          ? 'speaking'
          : happy
            ? 'happy'
            : open && input.trim().length > 0
              ? 'typing'
              : open
                ? 'attentive'
                : 'idle';
  const bodyRef = useRef<HTMLDivElement>(null);
  // Propuestas en curso: evita que un doble click rápido en "Confirmar"
  // dispare DOS /execute con el mismo payload (doble pago, doble descuento de
  // stock, doble receta). El guardado de `resolved` en el estado es asíncrono,
  // así que acá se bloquea de forma SÍNCRONA por índice.
  const resolvingRef = useRef<Set<number>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, loading, open]);

  // El consumo de tokens ya NO se muestra en la burbuja (lo ve solo el admin
  // de la clínica, de forma discreta, en AiUsagePill de la Topbar).

  async function send(e: FormEvent) {
    e.preventDefault();
    await sendText(input);
  }

  async function sendText(raw: string) {
    const text = raw.trim();
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
        if (!text && m.reporte) text = '(Le mostré un reporte de la clínica.)';
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
    }
  }

  // ---- Voz: escuchar (hablar→texto) y hablar (texto→voz) ----
  function getRecognition(): any {
    if (recognitionRef.current) return recognitionRef.current;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = 'es-CL';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev: any) => {
      const t = String(ev?.results?.[0]?.[0]?.transcript ?? '').trim();
      setListening(false);
      if (t) void sendText(t); // auto-envía lo dictado (efecto "Jarvis")
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return rec;
  }
  function toggleMic() {
    const rec = getRecognition();
    if (!rec) return;
    if (listening) {
      try { rec.stop(); } catch { /* noop */ }
      setListening(false);
      return;
    }
    try { rec.start(); setListening(true); } catch { /* ya estaba activo */ }
  }

  // ---- Dictado por grabación (iPad/iPhone y cualquiera sin Web Speech API) ----
  // Elige el formato de audio que el dispositivo sí sabe grabar. iOS graba en
  // audio/mp4; Chrome/Android en audio/webm. Whisper acepta ambos.
  function pickAudioMime(): string {
    const MR = (window as any).MediaRecorder;
    const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
    for (const c of cands) {
      try { if (MR?.isTypeSupported?.(c)) return c; } catch { /* noop */ }
    }
    return '';
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime = pickAudioMime();
      const mr = mime ? new (window as any).MediaRecorder(stream, { mimeType: mime }) : new (window as any).MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e: any) => { if (e?.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        // Soltar el micrófono (apaga el indicador del sistema).
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        const type = mr.mimeType || mime || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type });
        audioChunksRef.current = [];
        if (blob.size > 0) void transcribeAndSend(blob, type);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setRecording(false);
      setMessages((m) => [...m, { role: 'bot', text: 'No pude usar el micrófono. Revisa el permiso del navegador y vuelve a intentar.' }]);
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    setRecording(false);
    if (mr && mr.state !== 'inactive') {
      try { mr.stop(); } catch { /* el onstop igual limpia */ }
    }
  }

  async function transcribeAndSend(blob: Blob, type: string) {
    setTranscribing(true);
    try {
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      const fd = new FormData();
      fd.append('audio', blob, `dictado.${ext}`);
      const { data } = await api.post('/assistant/transcribe', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const t = String(data?.text ?? '').trim();
      if (t) await sendText(t); // mismo flujo que escribir: respeta permisos y pide confirmación
      else setMessages((m) => [...m, { role: 'bot', text: 'No te entendí bien. ¿Puedes repetirlo más claro?' }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: getErrorMessage(err, 'No pude transcribir el audio. Intenta de nuevo o escribe el mensaje.') }]);
    } finally {
      setTranscribing(false);
    }
  }

  // Un solo botón de micrófono: usa el reconocimiento nativo si existe (gratis,
  // instantáneo) y si no, cae a grabar + transcribir (iPad/iPhone).
  function handleMic() {
    if (voiceSupported) { toggleMic(); return; }
    if (recording) stopRecording();
    else void startRecording();
  }

  // Lee en voz alta las respuestas NUEVAS del bot cuando la voz está activa.
  useEffect(() => {
    if (!voiceOn) {
      spokenRef.current = messages.length;
      return;
    }
    if (messages.length <= spokenRef.current) return;
    const nuevos = messages.slice(spokenRef.current);
    spokenRef.current = messages.length;
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) return;
    for (const m of nuevos) {
      if (m.role !== 'bot') continue;
      const txt =
        m.text ||
        (m.reporte ? 'Le mostré un reporte de la clínica.' : m.proposal ? `Le propongo: ${m.proposal.resumen}. ¿La confirmo?` : '');
      if (!txt) continue;
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'es-CL';
      // El personaje mueve la boca mientras el navegador lee.
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(synth.speaking);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    }
  }, [messages, voiceOn]);

  async function resolveProposal(index: number, confirmed: boolean) {
    // Guardia síncrona: si esta propuesta ya se está procesando (doble click),
    // no la ejecutes de nuevo.
    if (resolvingRef.current.has(index)) return;
    resolvingRef.current.add(index);
    const prop = messages[index]?.proposal;
    setMessages((m) => m.map((msg, idx) => (idx === index ? { ...msg, resolved: true } : msg)));
    if (!confirmed) {
      setMessages((m) => [...m, { role: 'bot', text: 'Acción cancelada. No se hizo nada.' }]);
      return;
    }
    if (!prop) return;
    try {
      const { data } = await api.post('/assistant/execute', {
        idempotencyKey: idempotencyKeyFor(prop),
        tipo: prop.tipo,
        paciente: prop.paciente,
        pacienteId: prop.pacienteId ?? null,
        contenido: prop.contenido,
        fechaHora: prop.fechaHora,
        fechaActual: prop.fechaActual,
        sillon: prop.sillon ?? null,
        duracionMin: prop.duracionMin ?? null,
        profesional: prop.profesional ?? null,
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
        lote: prop.lote,
        vencimiento: prop.vencimiento,
        cantidad: prop.cantidad,
        medicamentos: prop.medicamentos,
        observaciones: prop.observaciones,
        items: prop.items,
        consentimiento: prop.consentimiento,
        titulo: prop.titulo,
        procedimiento: prop.procedimiento,
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
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm">
              <AssistantMascot variant={mascotVariant} state={mascotState} size={30} ground={false} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Asistente de fordentcloud</div>
              <div className="text-[11px] text-white/85">Gestión clínica</div>
            </div>
            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Beta
            </span>
          </div>

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
                    <div className="text-slate-600 dark:text-slate-300">{m.agendaTitulo && m.agendaTitulo !== 'Agenda de hoy' ? `No hay citas agendadas (${m.agendaTitulo.replace(/^Agenda /, '')}).` : 'No hay citas para hoy.'}</div>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">{m.agendaTitulo || 'Agenda de hoy'}</div>
                      <ul className="mt-1.5 space-y-1.5">
                        {m.agenda.map((a, j) => (
                          <li key={j} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {m.agendaVariosDias ? new Date(a.hora).toLocaleString('es-CL', { timeZone: 'America/Santiago', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : new Date(a.hora).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' })}
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
              ) : m.reporte ? (
                <div key={i} className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Reporte</div>
                  {m.reporte.tipo === 'facturacion' && (
                    <div className="mt-1">
                      <div className="text-slate-600 dark:text-slate-300">Facturación {m.reporte.periodoTxt}</div>
                      <div className="mt-0.5 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">${(m.reporte.total ?? 0).toLocaleString('es-CL')}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{m.reporte.movimientos ?? 0} abonos recibidos</div>
                    </div>
                  )}
                  {(m.reporte.tipo === 'pacientes_nuevos' || m.reporte.tipo === 'citas') && (
                    <div className="mt-1">
                      <div className="text-slate-600 dark:text-slate-300">{m.reporte.tipo === 'citas' ? 'Citas' : 'Pacientes nuevos'} {m.reporte.periodoTxt}</div>
                      <div className="mt-0.5 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{m.reporte.count ?? 0}</div>
                    </div>
                  )}
                  {m.reporte.tipo === 'presupuestos' && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900/40">Sin iniciar: <b>{m.reporte.sinIniciar ?? 0}</b></span>
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900/40">En tratamiento: <b>{m.reporte.enTratamiento ?? 0}</b></span>
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900/40">Terminados: <b>{m.reporte.terminados ?? 0}</b></span>
                    </div>
                  )}
                  {m.reporte.tipo === 'deudores' &&
                    (m.reporte.deudores && m.reporte.deudores.length > 0 ? (
                      <>
                        <div className="mt-1 text-slate-600 dark:text-slate-300">Quién debe más · total ${(m.reporte.total ?? 0).toLocaleString('es-CL')}</div>
                        <ul className="mt-1.5 space-y-1">
                          {m.reporte.deudores.map((d, j) => (
                            <li key={j} className="flex justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                              <span className="text-slate-700 dark:text-slate-200">{d.paciente}</span>
                              <span className="font-medium tabular-nums text-slate-800 dark:text-slate-100">${d.monto.toLocaleString('es-CL')}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <div className="mt-1 text-slate-600 dark:text-slate-300">Nadie tiene saldo pendiente. 🎉</div>
                    ))}
                  {m.reporte.tipo === 'pagos_consulta' && (
                    <div className="mt-1">
                      <div className="text-slate-600 dark:text-slate-300">Pagos de consulta {m.reporte.periodoTxt}</div>
                      <div className="mt-0.5 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">${(m.reporte.total ?? 0).toLocaleString('es-CL')}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{m.reporte.count ?? 0} pago(s)</div>
                      {m.reporte.pagos && m.reporte.pagos.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {m.reporte.pagos.map((p, j) => (
                            <li key={j} className="flex justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900/40">
                              <span className="text-slate-700 dark:text-slate-200">
                                {p.paciente}
                                {p.fecha ? <span className="text-slate-400"> · {new Date(p.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</span> : null}
                                {p.metodo ? <span className="text-slate-400"> · {p.metodo}</span> : null}
                              </span>
                              <span className="font-medium tabular-nums text-slate-800 dark:text-slate-100">${p.monto.toLocaleString('es-CL')}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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
                        <div>Paciente: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.paciente}{m.proposal.pacienteRut ? ` · RUT ${m.proposal.pacienteRut}` : ''}</span></div>
                      )}
                      {m.proposal.insumo && (
                        <div>
                          {m.proposal.tipo === 'ingresar_stock' ? 'Ingresar' : 'Descontar'}:{' '}
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {m.proposal.cantidad ?? ''} de {m.proposal.insumo}
                            {m.proposal.tipo === 'ingresar_stock' && m.proposal.lote ? ` · lote ${m.proposal.lote}` : ''}
                            {m.proposal.tipo === 'ingresar_stock' && m.proposal.vencimiento ? ` · vence ${m.proposal.vencimiento}` : ''}
                          </span>
                        </div>
                      )}
                      {m.proposal.campo && (
                        <div>{m.proposal.campo}: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.valor}</span></div>
                      )}
                      {m.proposal.consentimiento && (
                        <div>Consentimiento: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.consentimiento}</span></div>
                      )}
                      {m.proposal.titulo && (
                        <div>Documento: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.titulo}</span></div>
                      )}
                      {m.proposal.procedimiento && (
                        <div>Procedimiento: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.procedimiento}{m.proposal.presupuesto ? ` · presup. #${m.proposal.presupuesto.replace(/\D/g, '') || m.proposal.presupuesto}` : ''}</span></div>
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
                        <div>{m.proposal.tipo === 'reagendar_cita' ? 'Nueva hora' : m.proposal.tipo === 'cancelar_cita' ? 'Cita' : m.proposal.tipo === 'publicar_horas' ? 'Desde' : 'Fecha'}: <span className="font-medium text-slate-700 dark:text-slate-200">{new Date(m.proposal.fechaHora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                      )}
                      {m.proposal.tipo === 'agendar_cita' && (
                        <>
                          <div>Duración: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.duracionMin ?? 30} min</span></div>
                          <div>Sillón: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.sillon || 'el primero libre'}</span></div>
                          {m.proposal.profesional && (
                            <div>Profesional: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.profesional}</span></div>
                          )}
                        </>
                      )}
                      {m.proposal.tipo === 'publicar_horas' && (
                        <>
                          <div>Horas: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.cantidad ?? 1} de {m.proposal.duracionMin ?? 30} min seguidas</span></div>
                          <div>Sillón: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.sillon || 'el primero libre'}</span></div>
                          <div>Profesional: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.profesional || 'usted'}</span></div>
                          <div>Se verán en: <span className="font-medium text-slate-700 dark:text-slate-200">el Portal de Pacientes</span></div>
                        </>
                      )}
                      {m.proposal.tipo === 'registrar_pago_consulta' && m.proposal.correo && (
                        <div>Correo: <span className="font-medium text-slate-700 dark:text-slate-200">{m.proposal.correo}</span></div>
                      )}
                      {m.proposal.tipo === 'enviar_cartola' && (
                        <div>Se envía: <span className="font-medium text-slate-700 dark:text-slate-200">la cartola en PDF al correo del paciente</span></div>
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
                  {m.proposal.items && m.proposal.items.length > 0 && (
                    <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-2 dark:border-slate-600 dark:bg-slate-900/40">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Presupuesto</div>
                      <ul className="mt-1 space-y-1">
                        {m.proposal.items.map((it, k) => (
                          <li key={k} className="flex justify-between gap-2 text-xs text-slate-700 dark:text-slate-200">
                            <span>
                              {it.cantidad && it.cantidad > 1 ? `${it.cantidad}× ` : ''}
                              {it.descripcion}
                            </span>
                            {it.precio != null ? (
                              <span className="font-medium tabular-nums">${(it.precio * (it.cantidad ?? 1)).toLocaleString('es-CL')}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">precio del catálogo</span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">El total y el número los calcula el sistema al crear.</div>
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
            <button
              type="button"
              onClick={() => { const n = !voiceOn; setVoiceOn(n); if (!n) window.speechSynthesis?.cancel(); }}
              aria-label={voiceOn ? 'Silenciar respuestas' : 'Leer respuestas en voz alta'}
              title={voiceOn ? 'Respuestas habladas: activadas' : 'Leer respuestas en voz alta'}
              className={`grid w-10 shrink-0 place-items-center rounded-xl border transition ${voiceOn ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-900/50 dark:bg-brand-950/30' : 'border-slate-300 text-slate-500 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M11 5 6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
                {voiceOn && <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" strokeLinecap="round" />}
              </svg>
            </button>
            {micSupported && (
              <button
                type="button"
                onClick={handleMic}
                disabled={loading || transcribing}
                aria-label={listening || recording ? 'Detener dictado' : 'Hablar'}
                title={transcribing ? 'Transcribiendo…' : recording ? 'Grabando… toca para enviar' : 'Hablar'}
                className={`grid w-10 shrink-0 place-items-center rounded-xl border transition disabled:opacity-50 ${listening || recording ? 'animate-pulse border-red-300 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400' : 'border-slate-300 text-slate-500 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400'}`}
              >
                {transcribing ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )}
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
        className="fdcm-hover group fixed bottom-4 left-3 z-50 grid h-16 w-16 place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <AssistantMascot variant={mascotVariant} state={mascotState} size={60} />
        {open && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-slate-800 text-white shadow ring-2 ring-white dark:bg-slate-200 dark:text-slate-900 dark:ring-slate-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3 w-3">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </span>
        )}
      </button>
    </>
  );
}
