import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import { createUser, type StaffUser } from '../../api/users';
import { formatRutInput, isValidRut } from '../../utils/rut';
import { SignaturePad } from '../../components/SignaturePad';

type ProfessionalFormModalProps = {
  onClose: () => void;
  onCreated: (user: StaffUser, dimageGeneratedPassword?: string | null) => void;
};

export function ProfessionalFormModal({ onClose, onCreated }: ProfessionalFormModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'odontologo' | 'admin' | 'radiologo' | 'operador'>('odontologo');
  const [rut, setRut] = useState('');
  const [rutTouched, setRutTouched] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const { user, dimageGeneratedPassword } = await createUser({
        name,
        email,
        password,
        role,
        rut: rut.trim() || undefined,
        signatureDataUrl,
      });
      onCreated(user, dimageGeneratedPassword);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el usuario'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Agregar profesional" onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="prof-name" className="text-sm font-medium text-slate-700">
            Nombre completo
          </label>
          <input
            id="prof-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label htmlFor="prof-email" className="text-sm font-medium text-slate-700">
            Correo electrónico
          </label>
          <input
            id="prof-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>

        <div>
          <label htmlFor="prof-password" className="text-sm font-medium text-slate-700">
            Contraseña
          </label>
          <input
            id="prof-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
          <p className="mt-1 text-xs text-slate-400">Mínimo 8 caracteres.</p>
        </div>

        <div>
          <label htmlFor="prof-role" className="text-sm font-medium text-slate-700">
            Rol
          </label>
          <select
            id="prof-role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'odontologo' | 'admin' | 'radiologo' | 'operador')}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          >
            <option value="odontologo">Odontólogo</option>
            <option value="radiologo">Radiólogo</option>
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div>
          <label htmlFor="prof-rut" className="text-sm font-medium text-slate-700">
            RUT
          </label>
          <input
            id="prof-rut"
            value={rut}
            onChange={(e) => setRut(formatRutInput(e.target.value))}
            onBlur={() => setRutTouched(true)}
            placeholder="76.123.456-7"
            maxLength={12}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-3 ${
              rutTouched && !rutIsValid
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
                : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/15'
            }`}
          />
          {rutTouched && !rutIsValid && <p className="mt-1 text-xs text-red-600">RUT inválido</p>}
          {(role === 'odontologo' || role === 'radiologo') && (
            <p className="mt-1 text-xs text-slate-400">
              Opcional, pero si tu clínica tiene el módulo Rx habilitado y lo completas ahora, este profesional queda
              sincronizado con RIDS RX de inmediato.
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Firma</label>
          <p className="mt-0.5 text-xs text-slate-400">
            Opcional — se usa para identificar al profesional en informes y documentos que genere. Puedes dejarla en
            blanco y agregarla después desde su perfil.
          </p>
          <div className="mt-1">
            <SignaturePad onChange={setSignatureDataUrl} height={120} />
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
            {isSubmitting ? 'Creando...' : 'Crear profesional'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
