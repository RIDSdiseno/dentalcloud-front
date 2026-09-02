import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createUrgencyAppointment, type Appointment, type TriageLevel } from '../../api/appointments';
import { fetchUsers, type StaffUser } from '../../api/users';
import type { Patient } from '../../api/patients';
import { useAuth } from '../../context/AuthContext';
import { PatientPicker } from './PatientPicker';
import { roleLabel } from '../../utils/roles';

type UrgencyAppointmentModalProps = {
  onClose: () => void;
  onCreated: (appointment: Appointment) => void;
};

const TRIAGE_OPTIONS: { value: TriageLevel; label: string }[] = [
  { value: 'leve', label: 'Leve' },
  { value: 'moderada', label: 'Moderada' },
  { value: 'grave', label: 'Grave' },
];

export function UrgencyAppointmentModal({ onClose, onCreated }: UrgencyAppointmentModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [professionals, setProfessionals] = useState<StaffUser[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [professionalId, setProfessionalId] = useState('');
  const [motivoUrgencia, setMotivoUrgencia] = useState('');
  const [triageLevel, setTriageLevel] = useState<TriageLevel | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers().then(setProfessionals).catch(() => undefined);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Selecciona o crea un paciente para atender la urgencia');
      return;
    }
    if (!motivoUrgencia.trim()) {
      setError('Indica el motivo de la urgencia');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const appointment = await createUrgencyAppointment({
        patientId: selectedPatient.id,
        professionalId: professionalId || undefined,
        motivoUrgencia: motivoUrgencia.trim(),
        triageLevel: triageLevel || undefined,
      });
      onCreated(appointment);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar la urgencia'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Atender urgencia" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Se asigna automáticamente el primer sillón disponible ahora mismo — no hace falta elegir horario ni
          sillón.
        </p>

        <PatientPicker value={selectedPatient} onChange={setSelectedPatient} />

        <div>
          <label htmlFor="urgency-motivo" className="text-sm font-medium text-slate-700">
            Motivo de la urgencia
          </label>
          <input
            id="urgency-motivo"
            type="text"
            value={motivoUrgencia}
            onChange={(e) => setMotivoUrgencia(e.target.value)}
            placeholder="Ej. Dolor agudo, trauma dental, reacción alérgica..."
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label htmlFor="urgency-triage" className="text-sm font-medium text-slate-700">
            Nivel de gravedad
          </label>
          <select
            id="urgency-triage"
            value={triageLevel}
            onChange={(e) => setTriageLevel(e.target.value as TriageLevel | '')}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          >
            <option value="">Sin especificar</option>
            {TRIAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="urgency-professional" className="text-sm font-medium text-slate-700">
            Profesional
          </label>
          <select
            id="urgency-professional"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          >
            <option value="">Por asignar</option>
            {!isAdmin && user && (
              <option value={user.id}>Yo mismo ({user.name})</option>
            )}
            {professionals
              .filter((p) => p.id !== user?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({roleLabel(p.role)})
                </option>
              ))}
          </select>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Registrando...' : 'Atender urgencia'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
