import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type AiUsage = { limit: number; used: number; remaining: number | null };

const nf = new Intl.NumberFormat('es-CL');

// A partir de este % de consumo se considera "llegando al límite" y el ícono
// pasa a modo aviso (rojo). Ajustable.
const UMBRAL_AVISO = 0.9;

/**
 * Consumo mensual de tokens de IA de la clínica.
 *
 * SOLO lo ve el administrador de la clínica (role === 'admin'); para el resto
 * no se muestra absolutamente nada (y el backend tampoco se lo entrega).
 *
 * Aun para el admin, los números no están a la vista todo el tiempo: hay un
 * ícono discreto que, al clickear, abre el detalle (cuántos tokens quedan).
 * Cuando el consumo se acerca al límite, el ícono se vuelve un aviso rojo
 * ("IA por agotarse") para que el admin se entere sin tener que revisar.
 */
export function AiUsagePill() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    api
      .get('/assistant/usage')
      .then(({ data }) => {
        if (!active) return;
        setUsage({
          limit: Number(data?.limit ?? 0),
          used: Number(data?.used ?? 0),
          remaining: data?.remaining == null ? null : Number(data.remaining),
        });
      })
      .catch(() => {
        if (active) setUsage(null);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  // Cerrar el detalle al clickear fuera.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!isAdmin || !usage) return null;

  const unlimited = usage.limit <= 0;
  const ratio = unlimited ? 0 : usage.used / usage.limit;
  const agotado = !unlimited && (usage.remaining !== null ? usage.remaining <= 0 : ratio >= 1);
  const cerca = !unlimited && !agotado && ratio >= UMBRAL_AVISO;
  const alerta = cerca || agotado;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Uso de IA de la clínica"
        aria-label="Uso de IA de la clínica"
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm font-semibold transition ${
          alerta
            ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400'
            : 'border-slate-200 text-slate-400 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
        }`}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.4 2.4M16 16l2.4 2.4M5.6 18.4l2.4-2.4M16 8l2.4-2.4" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {alerta && <span className="hidden sm:inline">{agotado ? 'IA sin tokens' : 'IA por agotarse'}</span>}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Uso de IA este mes</div>
          {unlimited ? (
            <div className="text-slate-600 dark:text-slate-300">
              {nf.format(usage.used)} tokens usados <span className="opacity-70">· sin límite</span>
            </div>
          ) : (
            <>
              <div className="tabular-nums text-slate-500 dark:text-slate-400">
                {nf.format(usage.used)} / {nf.format(usage.limit)}
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full ${alerta ? 'bg-red-500' : 'bg-brand-600'}`}
                  style={{ width: `${Math.min(100, ratio * 100)}%` }}
                />
              </div>
              <div className={`mt-1.5 tabular-nums ${alerta ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                {agotado ? 'Se agotaron los tokens de este mes.' : `Quedan ${nf.format(usage.remaining ?? 0)} tokens este mes.`}
              </div>
              {alerta && (
                <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {agotado ? 'El superadmin puede ampliar el límite.' : 'Tus tokens están llegando al límite.'}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
