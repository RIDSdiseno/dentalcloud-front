import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createOpenSlot, type OpenSlot } from '../../api/openSlots';
import { fetchChairs, type Chair } from '../../api/chairs';
import { fetchUsers, type StaffUser } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { toDateParam } from './dateUtils';
import { roleLabel } from '../../utils/roles';

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

type NewOpenSlotModalProps = {
  defaultDate: Date;
  onClose: () => void;
  onCreated: (openSlot: OpenSlot) => void;
};

export function NewOpenSlotModal({ defaultDate, onClose, onCreated }: NewOpenSlotModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const stepMinutes = user?.slotDurationMinutes ?? 15;

  const [chairs, setChairs] = useState<Chair[]>([]);
  const [professionals, setProfessionals] = useState<StaffUser[]>([]);
  const [date, setDate] = useState(toDateParam(defaultDate));
  const [time, setTime] = useState('09:00');
  const [chairId, setChairId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [duration, setDuration] = useState(stepMinutes);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchChairs().then((data) => {
      setChairs(data);
      setChairId((current) => current || data[0]?.id || '');
    });
    if (isAdmin) {
      fetchUsers().then(setProfessionals).catch(() => undefined);
    }
  }, [isAdmin]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!chairId) {
      setError('Selecciona un sillón');
      return;
    }

    const startAt = new Date(`${date}T${time}:00`);
    const endAt = new Date(startAt.getTime() + duration * 60_000);

    setError(null);
    setIsSubmitting(true);
    try {
      const openSlot = await createOpenSlot({
        chairId,
        professionalId: isAdmin && professionalId ? professionalId : undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
      onCreated(openSlot);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo publicar la hora'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Agregar hora disponible" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          Esta hora va a quedar visible para que un paciente la agende él mismo desde el portal, o para que cualquiera del
          equipo se la asigne a un paciente desde "Nueva cita".
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="slot-date" className="text-sm font-medium text-slate-700">
              Fecha
            </label>
            <input
              id="slot-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label htmlFor="slot-time" className="text-sm font-medium text-slate-700">
              Hora
            </label>
            <input
              id="slot-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="slot-chair" className="text-sm font-medium text-slate-700">
              Sillón
            </label>
            <select
              id="slot-chair"
              value={chairId}
              onChange={(e) => setChairId(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              {chairs.map((chair) => (
                <option key={chair.id} value={chair.id}>
                  {chair.name || `Sillón ${chair.number}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="slot-duration" className="text-sm font-medium text-slate-700">
              Duración
            </label>
            <select
              id="slot-duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              {DURATION_OPTIONS.filter((minutes) => minutes % stepMinutes === 0).map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutos
                </option>
              ))}
            </select>
          </div>
        </div>

        {isAdmin && (
          <div>
            <label htmlFor="slot-professional" className="text-sm font-medium text-slate-700">
              Profesional
            </label>
            <select
              id="slot-professional"
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              <option value="">Yo mismo ({user?.name})</option>
              {professionals
                .filter((p) => p.id !== user?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({roleLabel(p.role)})
                  </option>
                ))}
            </select>
          </div>
        )}

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
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Publicando...' : 'Publicar hora'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
