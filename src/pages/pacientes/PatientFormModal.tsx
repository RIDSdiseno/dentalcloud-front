import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { CountrySelect } from '../../components/CountrySelect';
import { COUNTRIES } from '../../data/countries';
import { ALLERGY_OPTIONS, type AllergyKey } from '../../data/allergies';
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
  const [heightCm, setHeightCm] = useState(patient?.heightCm != null ? String(patient.heightCm) : '');
  const [weightKg, setWeightKg] = useState(patient?.weightKg != null ? String(patient.weightKg) : '');
  const [allergies, setAllergies] = useState<AllergyKey[]>(patient?.allergies ?? []);
  const [allergyNotes, setAllergyNotes] = useState(patient?.allergyNotes ?? '');
  const [medicalConditions, setMedicalConditions] = useState(patient?.medicalConditions ?? '');
  const [currentMedications, setCurrentMedications] = useState(patient?.currentMedications ?? '');
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
        heightCm: heightCm.trim() ? Number(heightCm) : null,
        weightKg: weightKg.trim() ? Number(weightKg) : null,
        allergies,
        allergyNotes: allergyNotes || undefined,
        medicalConditions: medicalConditions || undefined,
        currentMedications: currentMedications || undefined,
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

  function toggleAllergy(key: AllergyKey) {
    setAllergies((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]));
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

        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Antecedentes médicos</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="heightCm" className="text-sm font-medium text-slate-700">
                Altura (cm)
              </label>
              <input
                id="heightCm"
                type="number"
                min={0}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="170"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
            <div>
              <label htmlFor="weightKg" className="text-sm font-medium text-slate-700">
                Peso (kg)
              </label>
              <input
                id="weightKg"
                type="number"
                min={0}
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="70"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700">Alergias</p>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {ALLERGY_OPTIONS.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={allergies.includes(opt.key)}
                    onChange={() => toggleAllergy(opt.key)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <textarea
              value={allergyNotes}
              onChange={(e) => setAllergyNotes(e.target.value)}
              placeholder="Detalle de alergias (ej. reacción específica, otra alergia no listada...)"
              rows={2}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="medicalConditions" className="text-sm font-medium text-slate-700">
                Condiciones médicas relevantes
              </label>
              <textarea
                id="medicalConditions"
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                placeholder="Ej. diabetes, hipertensión, embarazo..."
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
            <div>
              <label htmlFor="currentMedications" className="text-sm font-medium text-slate-700">
                Medicamentos actuales
              </label>
              <textarea
                id="currentMedications"
                value={currentMedications}
                onChange={(e) => setCurrentMedications(e.target.value)}
                placeholder="Ej. anticoagulantes, antihipertensivos..."
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
          </div>
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
