import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { getErrorMessage } from '../../api/client';
import {
  fetchUserPermissions,
  updateUserPermissionOverrides,
  type StaffUser,
  type UserPermissionsInfo,
} from '../../api/users';
import { PERMISSION_LABELS } from './PermisosPerfilPanel';
import type { PermissionKey } from '../../api/clinicaSettings';
import type { ClinicaModuleKey } from '../../api/clinicas';

// Mismas 8 pantallas de `PERMISSION_LABELS`, pero a nivel de plan de la
// clínica (`Clinica.modules`) en vez de perfil — por eso no incluyen 'rx'.
const MODULE_LABELS: Record<ClinicaModuleKey, string> = {
  pacientes: 'Pacientes',
  documentosClinicos: 'Documentos clínicos',
  cartola: 'Cartola',
  evoluciones: 'Evoluciones',
  observaciones: 'Observaciones administrativas',
  agenda: 'Agenda y citas',
  tratamientos: 'Planes de tratamiento',
  consentimientos: 'Consentimientos informados',
};

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

const MODULE_ORDER: ClinicaModuleKey[] = [
  'pacientes',
  'agenda',
  'tratamientos',
  'documentosClinicos',
  'cartola',
  'evoluciones',
  'observaciones',
  'consentimientos',
];

type OverrideValue = boolean | undefined;

function OverrideToggle({
  value,
  defaultValue,
  disabled,
  onChange,
}: {
  value: OverrideValue;
  defaultValue: boolean;
  disabled: boolean;
  onChange: (value: boolean | null) => void;
}) {
  const options: { key: 'inherit' | 'on' | 'off'; label: string; onClick: () => void }[] = [
    { key: 'inherit', label: `Hereda (${defaultValue ? 'sí' : 'no'})`, onClick: () => onChange(null) },
    { key: 'on', label: 'Sí', onClick: () => onChange(true) },
    { key: 'off', label: 'No', onClick: () => onChange(false) },
  ];
  const active = value === undefined ? 'inherit' : value ? 'on' : 'off';

  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={disabled}
          onClick={opt.onClick}
          className={`rounded-md px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            active === opt.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PermisosUsuarioModal({ user, onClose }: { user: StaffUser; onClose: () => void }) {
  const [info, setInfo] = useState<UserPermissionsInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    fetchUserPermissions(user.id)
      .then(setInfo)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los permisos')))
      .finally(() => setIsLoading(false));
  }, [user.id]);

  async function handlePermissionChange(key: PermissionKey, value: boolean | null) {
    setBusyKey(`p-${key}`);
    setError(null);
    try {
      const { permissionOverrides } = await updateUserPermissionOverrides(user.id, {
        permissionOverrides: { [key]: value },
      });
      setInfo((prev) => (prev ? { ...prev, permissionOverrides } : prev));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el permiso'));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleModuleChange(key: ClinicaModuleKey, value: boolean | null) {
    setBusyKey(`m-${key}`);
    setError(null);
    try {
      const { moduleOverrides } = await updateUserPermissionOverrides(user.id, {
        moduleOverrides: { [key]: value },
      });
      setInfo((prev) => (prev ? { ...prev, moduleOverrides } : prev));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el módulo'));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Modal title={`Permisos individuales · ${user.name}`} onClose={onClose} maxWidth="max-w-2xl">
      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {info && (
        <div className="flex flex-col gap-6">
          <p className="text-xs text-slate-500">
            Excepciones sólo para <span className="font-semibold">{user.name}</span>, por encima del default de su
            perfil y del plan de la clínica. "Hereda" quita la excepción.
          </p>

          {info.isPermissionedRole ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Pantallas (dentro de la clínica)</h3>
              <div className="flex flex-col divide-y divide-slate-100">
                {PERMISSION_ORDER.map((key) => (
                  <div key={key} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm text-slate-700">{PERMISSION_LABELS[key]}</span>
                    <OverrideToggle
                      value={info.permissionOverrides[key]}
                      defaultValue={info.permissionDefaults[key]}
                      disabled={busyKey === `p-${key}`}
                      onChange={(value) => handlePermissionChange(key, value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Este rol siempre tiene acceso completo a todas las pantallas; no admite excepciones de permisos.
            </p>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Módulos (plan de la clínica)</h3>
            <div className="flex flex-col divide-y divide-slate-100">
              {MODULE_ORDER.map((key) => (
                <div key={key} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-slate-700">{MODULE_LABELS[key]}</span>
                  <OverrideToggle
                    value={info.moduleOverrides[key]}
                    defaultValue={info.moduleDefaults[key]}
                    disabled={busyKey === `m-${key}`}
                    onChange={(value) => handleModuleChange(key, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
