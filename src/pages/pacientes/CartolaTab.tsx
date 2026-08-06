import { useEffect, useState, type ReactNode } from 'react';
import { getErrorMessage } from '../../api/client';
import {
  fetchLedgerSummary,
  deleteLedgerMovement,
  downloadLedgerPdf,
  sendCartolaEmail,
  type LedgerSummary,
  type LedgerMovementType,
} from '../../api/ledger';
import { formatCLP } from '../../utils/treatmentStatus';
import { ChevronDownIcon, DownloadIcon, MailIcon, PlusIcon, TrashIcon } from '../../components/icons';
import { LedgerMovementFormModal } from './LedgerMovementFormModal';
import { useAuth } from '../../context/AuthContext';

function CollapsibleSection({
  title,
  defaultOpen = false,
  onAdd,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  onAdd?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between px-5 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-slate-800"
        >
          <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          {title}
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Agregar ${title}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && <div className="border-t border-slate-100 px-5 py-4">{children}</div>}
    </div>
  );
}

export function CartolaTab({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<LedgerMovementType | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleDownloadPdf() {
    setError(null);
    setIsDownloading(true);
    try {
      const blob = await downloadLedgerPdf(patientId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo descargar el PDF'));
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSendEmail() {
    setError(null);
    setIsSendingEmail(true);
    try {
      await sendCartolaEmail(patientId);
      setEmailSent(true);
      window.setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar el correo'));
    } finally {
      setIsSendingEmail(false);
    }
  }

  function load() {
    setIsLoading(true);
    fetchLedgerSummary(patientId)
      .then(setSummary)
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar la cartola')))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleDeleteMovement(id: string) {
    const confirmed = window.confirm('¿Eliminar este movimiento?');
    if (!confirmed) return;
    try {
      await deleteLedgerMovement(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el movimiento'));
    }
  }

  if (isLoading || !summary) {
    return <p className="py-10 text-center text-sm text-slate-400">Cargando cartola...</p>;
  }

  const canDelete = (registeredById: string | undefined) => isAdmin || registeredById === user?.id;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleSendEmail}
          disabled={isSendingEmail}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MailIcon className="h-4 w-4" />
          {isSendingEmail ? 'Enviando...' : emailSent ? 'Enviado' : 'Enviar por correo'}
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <DownloadIcon className="h-4 w-4" />
          {isDownloading ? 'Generando...' : 'Descargar PDF'}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="px-5 py-3.5 text-sm font-semibold text-slate-800">Listado de presupuestos</div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">N°</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Profesional</th>
                <th className="px-4 py-2 text-right">Subtotal</th>
                <th className="px-4 py-2 text-right">Interés</th>
                <th className="px-4 py-2 text-right">Ajustes</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Abonado</th>
                <th className="px-4 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.plans.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                    Este paciente no tiene presupuestos registrados.
                  </td>
                </tr>
              )}
              {summary.plans.map((plan) => (
                <tr key={plan.id}>
                  <td className="px-4 py-2 font-medium text-slate-700">{plan.number}</td>
                  <td className="px-4 py-2 text-slate-500">{new Date(plan.createdAt).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-2 text-slate-500">{plan.professional ?? '—'}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{formatCLP(plan.subtotal)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{formatCLP(plan.interes)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{formatCLP(plan.ajustes)}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-700">{formatCLP(plan.total)}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{formatCLP(plan.abonado)}</td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      plan.saldo > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCLP(plan.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
            {summary.plans.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-slate-700">
                  <td className="px-4 py-2" colSpan={3}>
                    Totales
                  </td>
                  <td className="px-4 py-2 text-right">{formatCLP(summary.totals.subtotal)}</td>
                  <td className="px-4 py-2 text-right">{formatCLP(summary.totals.interes)}</td>
                  <td className="px-4 py-2 text-right">{formatCLP(summary.totals.ajustes)}</td>
                  <td className="px-4 py-2 text-right">{formatCLP(summary.totals.total)}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{formatCLP(summary.totals.abonado)}</td>
                  <td className="px-4 py-2 text-right">{formatCLP(summary.totals.saldo)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <CollapsibleSection title="Abonos libres" onAdd={() => setModalType('abono')}>
        {summary.abonosLibres.length === 0 ? (
          <p className="text-sm text-slate-400">Sin abonos libres registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {summary.abonosLibres.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700">{m.description || 'Abono libre'}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(m.createdAt).toLocaleDateString('es-CL')} · {m.paymentMethod ?? 'Sin forma de pago'} ·{' '}
                    {m.registeredBy.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-emerald-600">{formatCLP(m.haber)}</span>
                  {canDelete(m.registeredBy.id) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMovement(m.id)}
                      aria-label="Eliminar"
                      className="text-slate-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Intereses generados" onAdd={() => setModalType('interes')}>
        {summary.intereses.length === 0 ? (
          <p className="text-sm text-slate-400">Sin intereses generados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {summary.intereses.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700">
                    {m.description || 'Interés'} {m.treatmentPlan && `· Presupuesto N° ${m.treatmentPlan.number}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(m.createdAt).toLocaleDateString('es-CL')} · {m.registeredBy.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-amber-600">{formatCLP(m.debe)}</span>
                  {canDelete(m.registeredBy.id) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMovement(m.id)}
                      aria-label="Eliminar"
                      className="text-slate-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Ajustes" onAdd={() => setModalType('ajuste')}>
        {summary.ajustes.length === 0 ? (
          <p className="text-sm text-slate-400">Sin ajustes registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {summary.ajustes.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700">
                    {m.description || 'Ajuste'} {m.treatmentPlan && `· Presupuesto N° ${m.treatmentPlan.number}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(m.createdAt).toLocaleDateString('es-CL')} · {m.registeredBy.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${m.debe > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {m.debe > 0 ? formatCLP(m.debe) : `-${formatCLP(m.haber)}`}
                  </span>
                  {canDelete(m.registeredBy.id) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMovement(m.id)}
                      aria-label="Eliminar"
                      className="text-slate-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Saldo total" defaultOpen>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">Comprobante</th>
                <th className="px-2 py-2 text-left">N° Mov.</th>
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2 text-right">Debe</th>
                <th className="px-2 py-2 text-right">Haber</th>
                <th className="px-2 py-2 text-left">Presupuesto</th>
                <th className="px-2 py-2 text-left">Glosa</th>
                <th className="px-2 py-2 text-left">Descripción pago</th>
                <th className="px-2 py-2 text-left">N° documento</th>
                <th className="px-2 py-2 text-left">Observación</th>
                <th className="px-2 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.ledger.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-2 py-6 text-center text-slate-400">
                    Paciente sin movimientos.
                  </td>
                </tr>
              )}
              {summary.ledger.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-2 text-slate-600">{row.comprobante}</td>
                  <td className="px-2 py-2 text-slate-500">{row.number}</td>
                  <td className="px-2 py-2 text-slate-500">{new Date(row.createdAt).toLocaleDateString('es-CL')}</td>
                  <td className="px-2 py-2 text-right text-amber-600">{row.debe > 0 ? formatCLP(row.debe) : '—'}</td>
                  <td className="px-2 py-2 text-right text-emerald-600">{row.haber > 0 ? formatCLP(row.haber) : '—'}</td>
                  <td className="px-2 py-2 text-slate-500">{row.planNumber ?? '—'}</td>
                  <td className="px-2 py-2 text-slate-600">{row.description ?? '—'}</td>
                  <td className="px-2 py-2 text-slate-500">{row.paymentMethod ?? '—'}</td>
                  <td className="px-2 py-2 text-slate-500">{row.documentNumber ?? '—'}</td>
                  <td className="px-2 py-2 text-slate-500">{row.notes ?? '—'}</td>
                  <td className="px-2 py-2 text-right">
                    {row.deletable && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMovement(row.id)}
                        aria-label="Eliminar"
                        className="text-slate-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {summary.ledger.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-slate-700">
                  <td colSpan={10} className="px-2 py-2 text-right">
                    Saldo total
                  </td>
                  <td className="px-2 py-2 text-right text-brand-600">{formatCLP(summary.saldoTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CollapsibleSection>

      {modalType && (
        <LedgerMovementFormModal
          patientId={patientId}
          type={modalType}
          plans={summary.plans}
          onClose={() => setModalType(null)}
          onCreated={() => {
            setModalType(null);
            load();
          }}
        />
      )}
    </div>
  );
}
