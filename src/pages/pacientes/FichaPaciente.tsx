import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPatient, type Patient } from '../../api/patients';
import { fetchPatientAppointments, deleteAppointment, type Appointment } from '../../api/appointments';
import { getErrorMessage } from '../../api/client';
import { formatRut } from '../../utils/rut';
import { formatLongDate, formatTime } from '../agenda/dateUtils';
import { NewAppointmentModal } from '../agenda/NewAppointmentModal';
import {
  ActivityIcon,
  ArrowLeftIcon,
  CakeIcon,
  CalendarIcon,
  ChairIcon,
  ChatIcon,
  ClipboardIcon,
  ClockIcon,
  EditIcon,
  FolderIcon,
  IdBadgeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  ReceiptIcon,
  UsersIcon,
  XrayIcon,
} from '../../components/icons';
import { PatientFormModal } from './PatientFormModal';
import { TreatmentPlanTab } from './TreatmentPlanTab';
import { EvolucionesTab } from './EvolucionesTab';
import { CartolaTab } from './CartolaTab';
import { ObservacionesTab } from './ObservacionesTab';
import { DocumentosClinicosTab } from './DocumentosClinicosTab';
import { RxTab } from './RxTab';

const TABS = [
  { key: 'datos', label: 'Datos paciente', icon: IdBadgeIcon },
  { key: 'horas', label: 'Horas', icon: ClockIcon },
  { key: 'tratamiento', label: 'Plan de tratamiento', icon: ClipboardIcon },
  { key: 'evoluciones', label: 'Evoluciones', icon: ActivityIcon },
  { key: 'cartola', label: 'Cartola', icon: ReceiptIcon },
  { key: 'observaciones', label: 'Observaciones', icon: ChatIcon },
  { key: 'documentos', label: 'Documentos clínicos', icon: FolderIcon },
  { key: 'rx', label: 'Módulo Rx', icon: XrayIcon },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function chairLabel(appointment: Appointment) {
  return appointment.chair
    ? appointment.chair.name || `Sillón ${appointment.chair.number}`
    : 'Sillón eliminado';
}

function InfoRow({ icon: Icon, value }: { icon: typeof PhoneIcon; value: string | null }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <span className={value ? 'text-slate-700' : 'text-slate-400'}>{value ?? 'No registrado'}</span>
    </div>
  );
}

function GlanceCard({
  title,
  icon: Icon,
  appointment,
  emptyLabel,
}: {
  title: string;
  icon: typeof ClockIcon;
  appointment: Appointment | null;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-brand-500" />
        {title}
      </h3>
      {!appointment ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <div>
          <p className="text-xl font-bold text-brand-700">{formatTime(new Date(appointment.startAt))}</p>
          <p className="text-sm text-slate-600 capitalize">{formatLongDate(new Date(appointment.startAt))}</p>
          <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <UsersIcon className="h-3.5 w-3.5" />
              {appointment.professional?.name ?? 'Sin profesional asignado'}
            </span>
            <span className="flex items-center gap-1.5">
              <ChairIcon className="h-3.5 w-3.5" />
              {chairLabel(appointment)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FichaPaciente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('datos');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([fetchPatient(id), fetchPatientAppointments(id)])
      .then(([patientData, appointmentsData]) => {
        setPatient(patientData);
        setAppointments(appointmentsData);
        setError(null);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar la ficha del paciente')))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleCancelAppointment(appointment: Appointment) {
    const confirmed = window.confirm(
      `¿Cancelar la cita del ${formatLongDate(new Date(appointment.startAt))}?`
    );
    if (!confirmed) return;

    try {
      await deleteAppointment(appointment.id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? { ...a, status: 'cancelada' } : a))
      );
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cancelar la cita'));
    }
  }

  if (isLoading) return null;

  if (error || !patient) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate('/pacientes')}
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a pacientes
        </button>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error ?? 'Paciente no encontrado'}
        </p>
      </div>
    );
  }

  const age = calculateAge(patient.birthDate);
  const now = new Date();
  const active = appointments.filter((a) => a.status !== 'cancelada');
  const nextAppointment =
    active
      .filter((a) => new Date(a.startAt) > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null;
  const lastAttended =
    active
      .filter((a) => new Date(a.startAt) <= now)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0] ?? null;
  const cancelledCount = appointments.length - active.length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/pacientes')}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver a pacientes
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-xl font-bold text-white">
            {patient.firstName[0]}
            {patient.lastName[0]}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {formatRut(patient.rut)}
              {age !== null && ` · ${age} años`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewAppointment(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Nueva cita
          </button>
          <button
            type="button"
            onClick={() => setShowEditForm(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <EditIcon className="h-4 w-4" />
            Editar
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'datos' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-slate-800">Datos de contacto</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow icon={PhoneIcon} value={patient.phone} />
              <InfoRow icon={MailIcon} value={patient.email} />
              <InfoRow
                icon={CakeIcon}
                value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('es-CL') : null}
              />
              <InfoRow icon={MapPinIcon} value={patient.address} />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <IdBadgeIcon className="h-4 w-4 text-brand-500" />
              Resumen
            </h3>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Citas totales</dt>
                <dd className="font-semibold text-slate-800">{appointments.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Canceladas</dt>
                <dd className="font-semibold text-slate-800">{cancelledCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Paciente desde</dt>
                <dd className="font-semibold text-slate-800">
                  {new Date(patient.createdAt).toLocaleDateString('es-CL')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'horas' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CalendarIcon className="h-5 w-5 text-brand-500" />
                Historial de citas
              </h2>
              <span className="text-xs text-slate-400">{appointments.length} en total</span>
            </div>

            {appointments.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">Sin citas registradas.</p>
            )}

            <div className="flex max-h-[30rem] flex-col gap-3 overflow-y-auto pr-1">
              {appointments.map((appointment) => {
                const isCancelled = appointment.status === 'cancelada';
                const isPast = new Date(appointment.startAt) <= now;
                return (
                  <div
                    key={appointment.id}
                    className={`flex items-center justify-between gap-4 rounded-xl border-l-4 p-3.5 ${
                      isCancelled ? 'border-slate-300 bg-slate-50' : 'border-brand-500 bg-brand-50/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold capitalize ${
                          isCancelled ? 'text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {formatLongDate(new Date(appointment.startAt))}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTime(new Date(appointment.startAt))} – {formatTime(new Date(appointment.endAt))}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="h-3.5 w-3.5" />
                          {appointment.professional?.name ?? 'Sin profesional asignado'}
                        </span>
                        <span className="flex items-center gap-1">
                          <ChairIcon className="h-3.5 w-3.5" />
                          {chairLabel(appointment)}
                        </span>
                      </div>
                    </div>
                    {isCancelled ? (
                      <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Cancelada
                      </span>
                    ) : (
                      !isPast && (
                        <button
                          type="button"
                          onClick={() => handleCancelAppointment(appointment)}
                          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          Cancelar
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <GlanceCard
              title="Próxima cita"
              icon={ClockIcon}
              appointment={nextAppointment}
              emptyLabel="Sin próxima cita agendada."
            />
            <GlanceCard
              title="Última cita atendida"
              icon={CalendarIcon}
              appointment={lastAttended}
              emptyLabel="Sin citas anteriores."
            />
          </div>
        </div>
      )}

      {activeTab === 'tratamiento' && <TreatmentPlanTab patientId={patient.id} />}
      {activeTab === 'evoluciones' && <EvolucionesTab patient={patient} />}
      {activeTab === 'cartola' && <CartolaTab patientId={patient.id} />}
      {activeTab === 'observaciones' && <ObservacionesTab patientId={patient.id} />}
      {activeTab === 'documentos' && <DocumentosClinicosTab patientId={patient.id} />}
      {activeTab === 'rx' && <RxTab patient={patient} />}

      {showEditForm && (
        <PatientFormModal
          patient={patient}
          onClose={() => setShowEditForm(false)}
          onSaved={(updated) => {
            setPatient(updated);
            setShowEditForm(false);
          }}
        />
      )}

      {showNewAppointment && (
        <NewAppointmentModal
          defaultDate={new Date()}
          initialPatient={patient}
          onClose={() => setShowNewAppointment(false)}
          onCreated={(appointment) => {
            setAppointments((prev) =>
              [...prev, appointment].sort(
                (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
              )
            );
            setShowNewAppointment(false);
          }}
        />
      )}
    </div>
  );
}
