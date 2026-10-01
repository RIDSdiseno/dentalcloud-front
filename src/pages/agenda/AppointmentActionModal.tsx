import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import {
  markAppointmentArrival,
  startAppointmentAttention,
  finishAppointmentAttention,
  cancelAppointment,
  CONSULTA_TIPO_LABELS,
  type Appointment,
} from '../../api/appointments';
import { ReasonModal } from '../../components/ReasonModal';
import { MOTIVOS_CANCELACION } from './motivosCancelacion';
import { AlertTriangleIcon, ChairIcon, CheckIcon, ClockIcon, UsersIcon } from '../../components/icons';
import { formatTime } from './dateUtils';
import { STATUS_LABEL, STATUS_BADGE_CLASS } from './appointmentStatusStyles';

type AppointmentActionModalProps = {
  appointment: Appointment;
  onClose: () => void;
  onUpdated: (appointment: Appointment) => void;
  onCancelled: (appointment: Appointment) => void;
};

export function AppointmentActionModal({
  appointment,
  onClose,
  onUpdated,
  onCancelled,
}: AppointmentActionModalProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const status = appointment.status;
  const statusLabel = STATUS_LABEL[status] ?? status;
  const statusBadgeClass = STATUS_BADGE_CLASS[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

  async function handleMarkArrival() {
    setError(null);
    setIsSubmitting(true);
    try {
      const updated = await markAppointmentArrival(appointment.id);
      onUpdated(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo marcar la llegada'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStartAttention() {
    setError(null);
    setIsSubmitting(true);
    try {
      const updated = await startAppointmentAttention(appointment.id);
      onUpdated(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo pasar la cita a atención'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoToEvolucionar() {
    navigate(`/pacientes/${appointment.patientId}`, { state: { tab: 'evoluciones' } });
  }

  async function handleFinish() {
    setError(null);
    setIsSubmitting(true);
    try {
      const updated = await finishAppointmentAttention(appointment.id);
      onUpdated(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo terminar la cita'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Cancelar ya no es un confirm: pide el motivo, que queda guardado con la
  // cita (reunión 30/09). La cita no desaparece, se marca como cancelada.
  async function handleCancel(reason: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      const cancelled = await cancelAppointment(appointment.id, reason);
      onCancelled(cancelled);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cancelar la cita'));
      setIsSubmitting(false);
    }
  }

  // Pedir el motivo reemplaza a este modal en vez de apilarse encima: dos
  // modales superpuestos en un iPad dejan sin salida visible al de atrás.
  if (isCancelling) {
    return (
      <ReasonModal
        title="Cancelar cita"
        description={`¿Cancelar la cita de ${appointment.patient.firstName} ${appointment.patient.lastName}? La cita no se borra: queda registrada como cancelada con el motivo que indiques.`}
        placeholder="Ej: el paciente no contestó."
        acceptLabel="Cancelar cita"
        suggestions={MOTIVOS_CANCELACION}
        onClose={() => setIsCancelling(false)}
        onAccept={handleCancel}
      />
    );
  }

  return (
    <Modal title="Cita" onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-slate-900 uppercase dark:text-slate-100">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </p>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass}`}>
              {statusLabel}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {formatTime(new Date(appointment.startAt))}–{formatTime(new Date(appointment.endAt))}
            </span>
            <span className="flex items-center gap-1">
              <UsersIcon className="h-3.5 w-3.5" />
              {appointment.professional?.name ?? 'Sin profesional asignado'}
            </span>
            <span className="flex items-center gap-1">
              <ChairIcon className="h-3.5 w-3.5" />
              {appointment.chair?.name || `Sillón ${appointment.chair?.number ?? '—'}`}
            </span>
          </div>

          <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${appointment.patientConfirmedAt ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
            <CheckIcon className="h-3.5 w-3.5" />
            {appointment.patientConfirmedAt
              ? `El paciente confirmó su asistencia (${new Date(appointment.patientConfirmedAt).toLocaleDateString('es-CL')})`
              : 'El paciente aún no confirmó su asistencia por correo'}
          </p>

          {appointment.consultaTipo && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {CONSULTA_TIPO_LABELS[appointment.consultaTipo]}
              </span>
              {appointment.motivoConsulta && <> &middot; {appointment.motivoConsulta}</>}
            </p>
          )}

          {status === 'cancelada' && appointment.cancelacionMotivo && (
            <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Cancelada
              {appointment.canceladaPor && <> por {appointment.canceladaPor.name}</>}
              {appointment.canceladaAt && <> el {new Date(appointment.canceladaAt).toLocaleDateString('es-CL')}</>}
              {' '}&middot; Motivo: {appointment.cancelacionMotivo}
            </p>
          )}

          {appointment.type === 'urgencia' && (
            <div className="mt-2 flex flex-col gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
              <span className="flex items-center gap-1 font-semibold">
                <AlertTriangleIcon className="h-3.5 w-3.5" />
                Urgencia
                {appointment.triageLevel && ` · ${appointment.triageLevel.charAt(0).toUpperCase()}${appointment.triageLevel.slice(1)}`}
              </span>
              {appointment.motivoUrgencia && <span>{appointment.motivoUrgencia}</span>}
            </div>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

        <div className="flex flex-col gap-2">
          {status === 'agendada' && (
            <button
              type="button"
              onClick={handleMarkArrival}
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Guardando...' : 'Marcar llegada'}
            </button>
          )}

          {status === 'llego' && (
            <button
              type="button"
              onClick={handleStartAttention}
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Guardando...' : 'Pasar a atención'}
            </button>
          )}

          {status === 'en_atencion' && (
            <>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Guardando...' : 'Terminar cita'}
              </button>
              <button
                type="button"
                onClick={handleGoToEvolucionar}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Ir a evolucionar
              </button>
            </>
          )}

          {status !== 'cancelada' && status !== 'finalizada' && (
            <button
              type="button"
              onClick={() => setIsCancelling(true)}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              Cancelar cita
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
