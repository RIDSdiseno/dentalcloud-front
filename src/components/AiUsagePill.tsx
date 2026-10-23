import { useEffect, useState } from 'react';
import { api } from '../api/client';

type AiUsage = { limit: number; used: number; remaining: number | null };

const nf = new Intl.NumberFormat('es-CL');

/**
 * Indicador compacto del consumo mensual de tokens de IA de la clínica.
 * Se muestra en la Topbar para que esté siempre visible. Lee del mismo
 * endpoint que la burbuja del asistente (GET /assistant/usage).
 */
export function AiUsagePill() {
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed || !usage) return null;

  const unlimited = usage.limit <= 0;
  const ratio = unlimited ? 0 : usage.used / usage.limit;
  const danger = !unlimited && ratio >= 0.9;

  const title = unlimited
    ? `IA: ${nf.format(usage.used)} tokens usados este mes (sin límite)`
    : usage.remaining !== null && usage.remaining > 0
      ? `IA: ${nf.format(usage.used)} de ${nf.format(usage.limit)} tokens este mes. Quedan ${nf.format(usage.remaining)}.`
      : `IA: se agotaron los ${nf.format(usage.limit)} tokens de este mes. El superadmin puede ampliar el límite.`;

  return (
    <div
      title={title}
      className={`hidden shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold sm:flex ${
        danger
          ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400'
          : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
      }`}
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.4 2.4M16 16l2.4 2.4M5.6 18.4l2.4-2.4M16 8l2.4-2.4" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="tabular-nums">
        {unlimited ? (
          <>{nf.format(usage.used)} <span className="font-normal opacity-70">tokens</span></>
        ) : (
          <>{nf.format(usage.used)}<span className="font-normal opacity-70">/{nf.format(usage.limit)}</span></>
        )}
      </span>
    </div>
  );
}
