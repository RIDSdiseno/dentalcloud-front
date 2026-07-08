import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { CountrySelect } from '../../components/CountrySelect';
import { COUNTRIES } from '../../data/countries';
import { getErrorMessage } from '../../api/client';
import { createPatient, updatePatient, type Patient } from '../../api/patients';
import { formatRut, formatRutInput, isValidRut } from '../../utils/rut';

type PatientFormModalProps = {
  patient?: Patient | null;
  onClose: () => void;
  onSaved: (patient: Patient) => void;
};

function parsePhone(phone: string | null | undefined) {
  if (!phone) return { dialCode: '+34', local: '' };
  const match = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length).find((c) =>
    phone.startsWith(c.dialCode)
  );
  return match
    ? { dialCode: match.dialCode, local: phone.slice(match.dialCode.length).trim() }
    : { dialCode: '+34', local: phone };
}

export function PatientFormModal({ patient, onClose, onSaved }: PatientFormModalProps) {
  const isEditing = Boolean(patient);
  const initialPhone = parsePhone(patient?.phone);
  const [rut, setRut] = useState(patient ? formatRut(patient.rut) : '');
  const [firstName, setFirstName] = useState(patient?.firstName ?? '');
  const [lastName, setLastName] = useState(patient?.lastName ?? '');
  const [dialCode, setDialCode] = useState(initialPhone.dialCode);
  const [localPhone, setLocalPhone] = useState(initialPhone.local);
  const [email, setEmail] = useState(patient?.email ?? '');
  const [birthDate, setBirthDate] = useState(patient?.birthDate?.slice(0, 10) ?? '');
  const [address, setAddress] = useState(patient?.address ?? '');
  const [rutTouched, setRutTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rutIsValid = rut.trim() === '' ? true : isValidRut(rut);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setRutTouched(true);
    setError(null);

    if (!isValidRut(rut)) {
      setError('El RUT ingresado no es válido');
      return;
    }

    setIsSubmitting(true);
    try {
      const input = {
        rut,
        firstName,
        lastName,
        phone: localPhone.trim() ? `${dialCode} ${localPhone.trim()}` : undefined,
        email: email || undefined,
        birthDate: birthDate || undefined,
        address: address || undefined,
      };
      const saved =
        isEditing && patient ? await updatePatient(patient.id, input) : await createPatient(input);
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el paciente'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={isEditing ? 'Editar paciente' : 'Nuevo paciente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="rut" className="text-sm font-medium text-slate-700">
            RUT
          </label>
          <input
            id="rut"
            value={rut}
            onChange={(e) => setRut(formatRutInput(e.target.value))}
            onBlur={() => setRutTouched(true)}
            placeholder="12.345.678-9"
            inputMode="text"
            maxLength={12}
            required
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-3 ${
              rutTouched && !rutIsValid
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/15'
            }`}
          />
          {rutTouched && !rutIsValid && (
            <p className="mt-1 text-xs text-red-600">RUT inválido</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="text-sm font-medium text-slate-700">
              Nombre
            </label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="text-sm font-medium text-slate-700">
              Apellido
            </label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-slate-700">
              Teléfono
            </label>
            <div className="mt-1 flex">
              <CountrySelect value={dialCode} onChange={setDialCode} />
              <input
                id="phone"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                placeholder="9 1234 5678"
                className="w-full rounded-r-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
          </div>
          <div>
            <label htmlFor="birthDate" className="text-sm font-medium text-slate-700">
              Fecha de nacimiento
            </label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label htmlFor="address" className="text-sm font-medium text-slate-700">
            Dirección
          </label>
          <input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
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
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar paciente'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
