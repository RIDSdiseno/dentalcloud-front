import { useEffect, useState } from 'react';
import {
  fetchRolePermissions,
  updateRolePermissions,
  PERMISSIONED_ROLES,
  type PermissionKey,
  type PermissionedRole,
  type RolePermissions,
} from '../../api/clinicaSettings';
import { getErrorMessage } from '../../api/client';
import { roleLabel } from '../../utils/roles';

const PERMISSION_ORDER: PermissionKey[] = [
  'pacientes',
  'agenda',
  'tratamientos',
  'documentosClinicos',
  'cartola',
  'evoluciones',
  'observaciones',
  'consentimientos',
  'rx',
];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  pacientes: 'Pacientes',
  agenda: 'Agenda y citas',
  tratamientos: 'Planes de tratamiento',
  documentosClinicos: 'Documentos clínicos',
  cartola: 'Cartola',
  evoluciones: 'Evoluciones',
  observaciones: 'Observaciones',
  consentimientos: 'Consentimientos',
  rx: 'Módulo Rx',
};

export function PermisosPerfilPanel() {
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCell, setBusyCell] = useState<string | null>(null);

  useEffect(() => {
    fetchRolePermissions()
      .then(setPermissions)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los permisos')))
      .finally(() => setIsLoading(false));
  }, []);

  async function toggle(role: PermissionedRole, key: PermissionKey, value: boolean) {
    const cellId = `${role}-${key}`;
    setBusyCell(cellId);
    setError(null);
    try {
      setPermissions(await updateRolePermissions({ [role]: { [key]: value } }));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el permiso'));
    } finally {
      setBusyCell(null);
    }
  }

  if (isLoading) return null;
  if (!permissions) return null;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Permisos por perfil</h2>
      <p className="mb-4 text-xs text-slate-500">
        Qué puede ver cada perfil dentro de esta clínica. Los administradores siempre tienen acceso completo.
      </p>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="py-2 pr-3">Módulo</th>
              {PERMISSIONED_ROLES.map((role) => (
                <th key={role} className="px-3 py-2 text-center">
                  {roleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PERMISSION_ORDER.map((key) => (
              <tr key={key}>
                <td className="py-2 pr-3 text-slate-700">{PERMISSION_LABELS[key]}</td>
                {PERMISSIONED_ROLES.map((role) => {
                  const cellId = `${role}-${key}`;
                  return (
                    <td key={role} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={permissions[role][key]}
                        disabled={busyCell === cellId}
                        onChange={(e) => toggle(role, key, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
