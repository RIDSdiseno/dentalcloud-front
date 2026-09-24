import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { fetchPublicAppointment, confirmPublicAppointment, type PublicAppointment } from '../../api/publicAppointment';
import { CalendarIcon, ShieldIcon } from '../../components/icons';

type ViewState = 'loading' | 'ready' | 'confirming' | 'confirmed' | 'not_found' | 'cancelled' | 'error';

function statusFromError(err: unknown): ViewState {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 404) return 'not_found';
    if (err.response?.status === 410) return 'cancelled';
  }
  return 'error';
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 flex items-center gap-2 text-brand-600">
          <ShieldIcon className="h-6 w-6" />
          <span className="text-lg font-bold text-slate-900">fordentcloud</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ConfirmarCitaPublico() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [appointment, setAppointment] = useState<PublicAppointment | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPublicAppointment(token)
      .then((data) => {
        setAppointment(data);
        setState(data.alreadyConfirmed ? 'confirmed' : 'ready');
      })
      .catch((err) => setState(statusFromError(err)));
  }, [token]);

  async function handleConfirm() {
    if (!token) return;
    setState('confirming');
    try {
      await confirmPublicAppointment(token);
      setState('confirmed');
    } catch (err) {
      setState(statusFromError(err));
    }
  }

  if (state === 'loading') {
    return (
      <Shell>
        <p className="text-sm text-slate-500">Cargando...</p>
      </Shell>
    );
  }

  if (state === 'not_found') {
    return (
      <Shell>
        <p className="text-sm text-red-600">Este link no es válido. Verifica que copiaste la URL completa.</p>
      </Shell>
    );
  }

  if (state === 'cancelled') {
    return (
      <Shell>
        <p className="text-sm text-amber-600">Esta cita fue cancelada.</p>
      </Shell>
    );
  }

  if (state === 'error') {
    return (
      <Shell>
        <p className="text-sm text-red-600">Ocurrió un error inesperado. Intenta nuevamente más tarde.</p>
      </Shell>
    );
  }

  const dateLabel = appointment
    ? new Date(appointment.startAt).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const timeLabel = appointment
    ? new Date(appointment.startAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (state === 'confirmed') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-800">
            Gracias{appointment ? `, ${appointment.patientFirstName}` : ''} — quedó registrado que vas a venir a tu cita.
          </p>
          {appointment && (
            <p className="text-sm text-slate-500">
              {dateLabel} a las {timeLabel} con {appointment.professionalName}
            </p>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-1 text-lg font-bold text-slate-900">Confirma tu asistencia</h1>
      <p className="mb-5 text-sm text-slate-500">Hola {appointment?.patientFirstName}, tienes una cita agendada en {appointment?.clinicaNombre}.</p>

      <div className="mb-5 rounded-lg bg-slate-50 p-4 text-sm">
        <p className="mb-1"><strong>Día:</strong> {dateLabel}</p>
        <p className="mb-1"><strong>Hora:</strong> {timeLabel}</p>
        <p><strong>Profesional:</strong> {appointment?.professionalName}</p>
      </div>

      <button
        type="button"
        disabled={state === 'confirming'}
        onClick={handleConfirm}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'confirming' ? 'Confirmando...' : 'Confirmar mi asistencia'}
      </button>
    </Shell>
  );
}
