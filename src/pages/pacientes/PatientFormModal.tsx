import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Modal } from '../../components/Modal';
import { CountrySelect } from '../../components/CountrySelect';
import { COUNTRIES } from '../../data/countries';
import { ALLERGY_OPTIONS, type AllergyKey } from '../../data/allergies';
import { getErrorMessage } from '../../api/client';
import { createPatient, updatePatient, uploadPatientPhoto, type Patient } from '../../api/patients';
import { formatRut, formatRutInput, isValidRut } from '../../utils/rut';
import { CameraIcon } from '../../components/icons';

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
  const [gender, setGender] = useState(patient?.gender ?? '');
  const [nationality, setNationality] = useState(patient?.nationality ?? '');
  const [maritalStatus, setMaritalStatus] = useState(patient?.maritalStatus ?? '');
  const [occupation, setOccupation] = useState(patient?.occupation ?? '');
  const [heightCm, setHeightCm] = useState(patient?.heightCm != null ? String(patient.heightCm) : '');
  const [weightKg, setWeightKg] = useState(patient?.weightKg != null ? String(patient.weightKg) : '');
  const [allergies, setAllergies] = useState<AllergyKey[]>(patient?.allergies ?? []);
  const [allergyNotes, setAllergyNotes] = useState(patient?.allergyNotes ?? '');
  const [medicalConditions, setMedicalConditions] = useState(patient?.medicalConditions ?? '');
  const [currentMedications, setCurrentMedications] = useState(patient?.currentMedications ?? '');
  const [chronicDiseases, setChronicDiseases] = useState(patient?.chronicDiseases ?? '');
  const [dentalHistory, setDentalHistory] = useState(patient?.dentalHistory ?? '');
  const [emergencyContactName, setEmergencyContactName] = useState(patient?.emergencyContactName ?? '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(patient?.emergencyContactPhone ?? '');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(patient?.emergencyContactRelationship ?? '');
  const [healthInsurance, setHealthInsurance] = useState(patient?.healthInsurance ?? '');
  const [healthInsuranceDetail, setHealthInsuranceDetail] = useState(patient?.healthInsuranceDetail ?? '');
  const [bloodType, setBloodType] = useState(patient?.bloodType ?? '');
  const [tags, setTags] = useState<string[]>(patient?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(patient?.photoUrl ?? null);
  const photoInputRef = useRef<HTMLInputElement>(null);
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
        gender: gender || undefined,
        nationality: nationality || undefined,
        maritalStatus: maritalStatus || undefined,
        occupation: occupation || undefined,
        heightCm: heightCm.trim() ? Number(heightCm) : null,
        weightKg: weightKg.trim() ? Number(weightKg) : null,
        allergies,
        allergyNotes: allergyNotes || undefined,
        medicalConditions: medicalConditions || undefined,
        currentMedications: currentMedications || undefined,
        chronicDiseases: chronicDiseases || undefined,
        dentalHistory: dentalHistory || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        emergencyContactRelationship: emergencyContactRelationship || undefined,
        healthInsurance: healthInsurance || undefined,
        healthInsuranceDetail: healthInsuranceDetail || undefined,
        bloodType: bloodType || undefined,
        tags,
      };
      let saved =
        isEditing && patient ? await updatePatient(patient.id, input) : await createPatient(input);
      if (photoFile) {
        saved = await uploadPatientPhoto(saved.id, photoFile);
      }
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el paciente'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePhotoFileChange(file: File | null) {
    setPhotoFile(file);
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : patient?.photoUrl ?? null);
  }

  function toggleAllergy(key: AllergyKey) {
    setAllergies((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]));
  }

  function addTag() {
    const value = tagDraft.trim();
    if (!value) return;
    setTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setTagDraft('');
  }

  function removeTag(value: string) {
    setTags((prev) => prev.filter((t) => t !== value));
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  return (
    <Modal title={isEditing ? 'Editar paciente' : 'Nuevo paciente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex justify-center">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoFileChange(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-500"
          >
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="Vista previa" className="h-full w-full object-cover" />
            ) : (
              <>
                <CameraIcon className="h-6 w-6" />
                <span className="px-1 text-center text-[10px] font-medium leading-tight">
                  Fotografía del paciente (opcional)
                </span>
              </>
            )}
          </button>
        </div>

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
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Datos personales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="gender" className="text-sm font-medium text-slate-700">
                Género
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              >
                <option value="">No especificado</option>
                <option value="femenino">Femenino</option>
                <option value="masculino">Masculino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="maritalStatus" className="text-sm font-medium text-slate-700">
                Estado civil
              </label>
              <select
                id="maritalStatus"
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              >
                <option value="">No especificado</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="conviviente_civil">Conviviente civil</option>
                <option value="divorciado">Divorciado/a</option>
                <option value="viudo">Viudo/a</option>
              </select>
            </div>
            <div>
              <label htmlFor="nationality" className="text-sm font-medium text-slate-700">
                Nacionalidad
              </label>
              <input
                id="nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Ej. Chilena"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
            <div>
              <label htmlFor="occupation" className="text-sm font-medium text-slate-700">
                Ocupación
              </label>
              <input
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Ej. Profesor/a"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
            <div>
              <label htmlFor="healthInsurance" className="text-sm font-medium text-slate-700">
                Previsión de salud
              </label>
              <select
                id="healthInsurance"
                value={healthInsurance}
                onChange={(e) => setHealthInsurance(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              >
                <option value="">No especificada</option>
                <option value="fonasa">Fonasa</option>
                <option value="isapre">Isapre</option>
                <option value="particular">Particular</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="healthInsuranceDetail" className="text-sm font-medium text-slate-700">
                Plan / póliza
              </label>
              <input
                id="healthInsuranceDetail"
                value={healthInsuranceDetail}
                onChange={(e) => setHealthInsuranceDetail(e.target.value)}
                placeholder="Ej. Banmédica Plan 500"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Contacto de emergencia</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="emergencyContactName" className="text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="emergencyContactName"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
            <div>
              <label htmlFor="emergencyContactPhone" className="text-sm font-medium text-slate-700">
                Teléfono
              </label>
              <input
                id="emergencyContactPhone"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
            <div>
              <label htmlFor="emergencyContactRelationship" className="text-sm font-medium text-slate-700">
                Relación
              </label>
              <input
                id="emergencyContactRelationship"
                value={emergencyContactRelationship}
                onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                placeholder="Ej. Madre, cónyuge..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Antecedentes médicos</h3>

          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <label htmlFor="bloodType" className="text-sm font-medium text-slate-700">
                Grupo sanguíneo
              </label>
              <select
                id="bloodType"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              >
                <option value="">Desconocido</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
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
            <div>
              <label htmlFor="chronicDiseases" className="text-sm font-medium text-slate-700">
                Enfermedades crónicas
              </label>
              <textarea
                id="chronicDiseases"
                value={chronicDiseases}
                onChange={(e) => setChronicDiseases(e.target.value)}
                placeholder="Ej. diabetes tipo 2, hipotiroidismo..."
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
            <div>
              <label htmlFor="dentalHistory" className="text-sm font-medium text-slate-700">
                Antecedentes dentales
              </label>
              <textarea
                id="dentalHistory"
                value={dentalHistory}
                onChange={(e) => setDentalHistory(e.target.value)}
                placeholder="Ej. extracciones previas, tratamientos de conducto..."
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Etiquetas</h3>
          <p className="mb-2 text-xs text-slate-500">Marcas rápidas visibles en la ficha (ej. requiere sedación, paciente ansioso, moroso).</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Quitar etiqueta ${tag}`}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Escribe una etiqueta y presiona Enter"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
            <button
              type="button"
              onClick={addTag}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Agregar
            </button>
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
