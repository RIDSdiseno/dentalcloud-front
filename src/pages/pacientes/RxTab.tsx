import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import {
  fetchPatientRxStatus,
  syncPatientToRx,
  fetchRxOrders,
  sendRxOrder,
  fetchRxOrderPdfUrl,
  type RxOrder,
  type DimagePatient,
} from '../../api/rx';
import { fetchSucursales, updateSucursal, type Sucursal } from '../../api/catalogs';
import type { Patient } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';
import { CalendarIcon, DownloadIcon, EyeIcon, MailIcon, PlusIcon, XrayIcon } from '../../components/icons';
import { CreateRxOrderModal } from './CreateRxOrderModal';
import { RxOrderDetailModal } from './RxOrderDetailModal';

function isNotConfiguredError(message: string) {
  return message.toLowerCase().includes('no está configurada');
}

export function RxTab({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [status, setStatus] = useState<{ synced: boolean; patient: DimagePatient | null } | null>(null);
  const [orders, setOrders] = useState<RxOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([fetchPatientRxStatus(patient.id), fetchRxOrders(patient.id)])
      .then(([statusData, ordersData]) => {
        setStatus(statusData);
        setOrders(ordersData);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el módulo Rx')))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
    if (isAdmin) fetchSucursales().then(setSucursales).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  async function handleSync() {
    setIsSyncing(true);
    setError(null);
    try {
      const synced = await syncPatientToRx(patient.id);
      setStatus({ synced: true, patient: synced });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar los datos en la plataforma'));
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleSend(orderId: number) {
    try {
      await sendRxOrder(orderId);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar la orden al radiólogo'));
    }
  }

  async function handleViewPdf(orderId: number) {
    try {
      const url = await fetchRxOrderPdfUrl(orderId);
      window.open(url, '_blank');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo generar el PDF'));
    }
  }

  async function handleUpdateClinicId(sucursalId: string, dimageClinicId: string) {
    try {
      const updated = await updateSucursal(sucursalId, { dimageClinicId: dimageClinicId || null });
      setSucursales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el ID de clínica'));
    }
  }

  const notConfigured = error && isNotConfiguredError(error);

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-slate-400">Cargando módulo Rx...</p>;
  }

  if (notConfigured) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-10 py-16 text-center shadow-sm ring-1 ring-slate-200">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
          <XrayIcon className="h-7 w-7" />
        </span>
        <h3 className="text-base font-semibold text-slate-800">Integración Rx no configurada</h3>
        <p className="max-w-md text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && !notConfigured && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {isAdmin && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="w-full px-5 py-3 text-left text-sm font-semibold text-slate-700"
          >
            Configuración de integración Dimage {showConfig ? '▲' : '▼'}
          </button>
          {showConfig && (
            <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4">
              {sucursales.map((s) => (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="w-48 shrink-0 text-slate-600">{s.name}</span>
                  <input
                    defaultValue={s.dimageClinicId ?? ''}
                    onBlur={(e) => handleUpdateClinicId(s.id, e.target.value.trim())}
                    placeholder="ID clínica en Dimage"
                    className="w-48 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Datos en Plataforma</h2>
          {status?.synced && status.patient ? (
            <dl className="flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Nombre</dt>
                <dd className="text-slate-700">{status.patient.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Identificación</dt>
                <dd className="text-slate-700">{status.patient.rut}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Email</dt>
                <dd className="text-slate-700">{status.patient.email || 'No registrado'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Fecha de Nacimiento</dt>
                <dd className="text-slate-700">{status.patient.dateofbirth || 'No registrada'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-400">Este paciente aún no está sincronizado con la plataforma Rx.</p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSyncing ? 'Actualizando...' : 'Actualizar datos en Plataforma'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateOrder(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              <PlusIcon className="h-4 w-4" />
              Crear Orden
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarIcon className="h-4 w-4 text-brand-500" />
            Órdenes
          </h2>

          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Este paciente no tiene órdenes Rx registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Id</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Odontólogo</th>
                    <th className="px-3 py-2 text-left">Radiólogos</th>
                    <th className="px-3 py-2 text-left">Exámenes</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-3 py-2 font-medium text-slate-700">{order.id}</td>
                      <td className="px-3 py-2 text-slate-600">{order.estado_texto}</td>
                      <td className="px-3 py-2 text-slate-600">{(order.odontologo as string) ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{order.radiologos_asignados || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{order.examenes_orden || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailOrderId(order.id)}
                            aria-label="Ver detalle"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {order.editable && (
                            <button
                              type="button"
                              onClick={() => handleSend(order.id)}
                              aria-label="Enviar a radiólogo"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                            >
                              <MailIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleViewPdf(order.id)}
                            aria-label="Descargar PDF"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateOrder && (
        <CreateRxOrderModal
          patient={patient}
          onClose={() => setShowCreateOrder(false)}
          onCreated={() => {
            setShowCreateOrder(false);
            load();
          }}
        />
      )}

      {detailOrderId !== null && (
        <RxOrderDetailModal
          orderId={detailOrderId}
          onClose={() => {
            setDetailOrderId(null);
            load();
          }}
        />
      )}
    </div>
  );
}
