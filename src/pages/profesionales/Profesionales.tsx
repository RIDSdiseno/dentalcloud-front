import { useEffect, useState } from 'react';
import { fetchUsers, updateUserRut, importProfessionalsFromDimage, type StaffUser } from '../../api/users';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ClockIcon, DownloadIcon, PlusIcon, ShieldIcon, UsersIcon } from '../../components/icons';
import { roleLabel } from '../../utils/roles';
import { formatRutInput } from '../../utils/rut';
import { ProfessionalFormModal } from './ProfessionalFormModal';
import { ScheduleModal } from './ScheduleModal';
import { PermisosPerfilPanel } from './PermisosPerfilPanel';
import { PermisosUsuarioModal } from './PermisosUsuarioModal';
import { GeneratedPasswordDialog } from './GeneratedPasswordDialog';

const SCHEDULABLE_ROLES = ['odontologo', 'radiologo', 'operador'];

function RutCell({
  user,
  onUpdated,
}: {
  user: StaffUser;
  onUpdated: (user: StaffUser, dimageGeneratedPassword?: string | null) => void;
}) {
  const [value, setValue] = useState(user.rut ? formatRutInput(user.rut) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBlur() {
    const trimmed = value.trim();
    if (trimmed === (user.rut ? formatRutInput(user.rut) : '')) return;
    setIsSaving(true);
    setError(null);
    try {
      const { user: updated, dimageGeneratedPassword } = await updateUserRut(user.id, trimmed || null);
      onUpdated(updated, dimageGeneratedPassword);
      setValue(updated.rut ? formatRutInput(updated.rut) : '');
    } catch (err) {
      setError(getErrorMessage(err, 'RUT inválido'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(formatRutInput(e.target.value))}
        onBlur={handleBlur}
        placeholder="Sin RUT"
        disabled={isSaving}
        className="w-32 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-slate-600 outline-none hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/15"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function Profesionales() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<StaffUser | null>(null);
  const [permissionsFor, setPermissionsFor] = useState<StaffUser | null>(null);
  const [passwordEntries, setPasswordEntries] = useState<{ label: string; password: string }[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar la lista de profesionales')))
      .finally(() => setIsLoading(false));
  }, []);

  function handleProfessionalSynced(user: StaffUser, dimageGeneratedPassword?: string | null) {
    setUsers((prev) => (prev.some((u) => u.id === user.id) ? prev.map((u) => (u.id === user.id ? user : u)) : [...prev, user]));
    if (dimageGeneratedPassword) {
      setPasswordEntries([{ label: `${user.name} (RIDS RX)`, password: dimageGeneratedPassword }]);
    }
  }

  async function handleImportFromDimage() {
    setError(null);
    setIsImporting(true);
    try {
      const imported = await importProfessionalsFromDimage();
      if (imported.length === 0) {
        setError('No hay profesionales nuevos para importar desde RIDS RX.');
      } else {
        const refreshed = await fetchUsers();
        setUsers(refreshed);
        setPasswordEntries(imported.map((i) => ({ label: `${i.name} (${roleLabel(i.role)})`, password: i.generatedPassword })));
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo importar desde RIDS RX'));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profesionales</h1>
          <p className="mt-1 text-sm text-slate-500">
            {users.length} usuario{users.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser?.role === 'admin' && currentUser?.rxEnabled && (
            <button
              type="button"
              onClick={handleImportFromDimage}
              disabled={isImporting}
              className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <DownloadIcon className="h-4 w-4" />
              {isImporting ? 'Importando...' : 'Importar desde RIDS RX'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar profesional
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {!isLoading && users.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <UsersIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500">Aún no hay profesionales registrados.</p>
          </div>
        )}

        {users.length > 0 && (
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">RUT</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                  <td className="px-4 py-3 text-slate-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <RutCell user={user} onUpdated={handleProfessionalSynced} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.role === 'admin'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPermissionsFor(user)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <ShieldIcon className="h-4 w-4" />
                        Permisos
                      </button>
                      {SCHEDULABLE_ROLES.includes(user.role) && (
                        <button
                          type="button"
                          onClick={() => setScheduleFor(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <ClockIcon className="h-4 w-4" />
                          Horario
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PermisosPerfilPanel />

      {showForm && (
        <ProfessionalFormModal
          onClose={() => setShowForm(false)}
          onCreated={(user, dimageGeneratedPassword) => {
            setUsers((prev) => [...prev, user]);
            setShowForm(false);
            if (dimageGeneratedPassword) {
              setPasswordEntries([{ label: `${user.name} (RIDS RX)`, password: dimageGeneratedPassword }]);
            }
          }}
        />
      )}

      {passwordEntries && (
        <GeneratedPasswordDialog entries={passwordEntries} onClose={() => setPasswordEntries(null)} />
      )}

      {scheduleFor && <ScheduleModal professional={scheduleFor} onClose={() => setScheduleFor(null)} />}

      {permissionsFor && <PermisosUsuarioModal user={permissionsFor} onClose={() => setPermissionsFor(null)} />}
    </div>
  );
}
