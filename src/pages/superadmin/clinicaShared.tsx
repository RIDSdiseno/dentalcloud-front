import type { ClinicaModuleKey } from '../../api/clinicas';
import {
  ActivityIcon,
  CalendarIcon,
  ChatIcon,
  ClipboardIcon,
  FolderIcon,
  ReceiptIcon,
  ShieldIcon,
  UsersIcon,
} from '../../components/icons';

export const TIPO_LABELS: Record<string, string> = {
  dental: 'Dental',
  estetica: 'Estética facial',
  ambas: 'Dental y estética',
};

export const PAIS_OPTIONS = [
  'Chile',
  'Argentina',
  'Perú',
  'Colombia',
  'México',
  'Bolivia',
  'Ecuador',
  'Uruguay',
  'Paraguay',
  'Venezuela',
  'España',
  'Estados Unidos',
  'Otro',
];

export const MODULE_LABELS: Record<ClinicaModuleKey, string> = {
  pacientes: 'Pacientes',
  agenda: 'Agenda y citas',
  tratamientos: 'Planes de tratamiento',
  documentosClinicos: 'Documentos clínicos',
  cartola: 'Cartola',
  evoluciones: 'Evoluciones',
  observaciones: 'Observaciones',
  consentimientos: 'Consentimientos',
};

export const MODULE_ICONS: Record<ClinicaModuleKey, typeof FolderIcon> = {
  pacientes: UsersIcon,
  agenda: CalendarIcon,
  tratamientos: ClipboardIcon,
  documentosClinicos: FolderIcon,
  cartola: ReceiptIcon,
  evoluciones: ActivityIcon,
  observaciones: ChatIcon,
  consentimientos: ShieldIcon,
};

export const MODULE_ORDER: ClinicaModuleKey[] = [
  'pacientes',
  'agenda',
  'tratamientos',
  'documentosClinicos',
  'cartola',
  'evoluciones',
  'observaciones',
  'consentimientos',
];

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-brand-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function StatTile({ icon: Icon, label, value }: { icon: typeof UsersIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-slate-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
