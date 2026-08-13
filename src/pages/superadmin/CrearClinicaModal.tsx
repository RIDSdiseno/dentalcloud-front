import { useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createClinica, type Clinica } from '../../api/clinicas';
import { CameraIcon } from '../../components/icons';
import { formatRutInput, isValidRut } from '../../utils/rut';
import { PAIS_OPTIONS, TIPO_LABELS } from './clinicaShared';

type CrearClinicaModalProps = {
  onClose: () => void;
  onCreated: (clinica: Clinica) => void;
};

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function CrearClinicaModal({ onClose, onCreated }: CrearClinicaModalProps) {
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [rutTouched, setRutTouched] = useState(false);
  const [tipo, setTipo] = useState<'dental' | 'estetica' | 'ambas'>('dental');
  const [pais, setPais] = useState(PAIS_OPTIONS[0]);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(file: File | null) {
    setError(null);
    if (file && file.size > MAX_LOGO_BYTES) {
      setError('El logo no puede pesar más de 5 MB');
      return;
    }
    setLogo(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  const rutIsValid = rut.trim() === '' ? true : isValidRut(rut);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setRutTouched(true);
    setError(null);

    if (rut.trim() && !isValidRut(rut)) {
      setError('El RUT ingresado no es válido');
      return;
    }

    setIsSubmitting(true);
    try {
      const clinica = await createClinica({
        name,
        rut: rut.trim() || undefined,
        tipo,
        pais,
        adminName,
        adminEmail,
        adminPassword,
        logo,
      });
      onCreated(clinica);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el holding'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Crear holding" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:text-brand-500"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Vista previa del logo" className="h-full w-full object-cover" />
            ) : (
              <CameraIcon className="h-6 w-6" />
            )}
          </button>
          <div>
            <p className="text-sm font-medium text-slate-700">Logo del holding</p>
            <p className="text-xs text-slate-400">Opcional. PNG o JPG, máximo 5 MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
          />
        </div>

        <div>
          <label htmlFor="clinica-name" className="text-sm font-medium text-slate-700">
            Nombre del holding
          </label>
          <input
            id="clinica-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label htmlFor="clinica-rut" className="text-sm font-medium text-slate-700">
            RUT
          </label>
          <input
            id="clinica-rut"
            value={rut}
            onChange={(e) => setRut(formatRutInput(e.target.value))}
            onBlur={() => setRutTouched(true)}
            placeholder="76.123.456-7"
            inputMode="text"
            maxLength={12}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-3 ${
              rutTouched && !rutIsValid
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/15'
            }`}
          />
          {rutTouched && !rutIsValid && <p className="mt-1 text-xs text-red-600">RUT inválido</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="clinica-tipo" className="text-sm font-medium text-slate-700">
              Tipo
            </label>
            <select
              id="clinica-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'dental' | 'estetica' | 'ambas')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              {Object.entries(TIPO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="clinica-pais" className="text-sm font-medium text-slate-700">
              País
            </label>
            <select
              id="clinica-pais"
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            >
              {PAIS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Administrador inicial</p>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="admin-name" className="text-sm font-medium text-slate-700">
                Nombre completo
              </label>
              <input
                id="admin-name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>

            <div>
              <label htmlFor="admin-email" className="text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                minLength={8}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
              />
              <p className="mt-1 text-xs text-slate-400">Mínimo 8 caracteres.</p>
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
            {isSubmitting ? 'Creando...' : 'Crear holding'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
