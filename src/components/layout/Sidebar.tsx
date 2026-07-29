import { useState, type SVGProps } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ActivityIcon,
  CalendarIcon,
  ChatIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ClipboardIcon,
  CloseIcon,
  FolderIcon,
  IdBadgeIcon,
  ReceiptIcon,
  ShieldIcon,
  ToothCloudIcon,
  UsersIcon,
  XrayIcon,
} from '../icons';

type NavItem = {
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  to?: string;
  adminOnly?: boolean;
  basePath?: string;
  children?: { to: string; label: string }[];
};

type NavModuleKey = 'agenda' | 'pacientes';

const NAV_ITEMS: (NavItem & { moduleKey?: NavModuleKey })[] = [
  {
    label: 'Agenda',
    icon: CalendarIcon,
    basePath: '/agenda',
    moduleKey: 'agenda',
    children: [
      { to: '/agenda', label: 'General' },
      { to: '/agenda/sillones-libres', label: 'Sillones libres' },
      { to: '/agenda/diaria', label: 'Agenda diaria' },
    ],
  },
  { to: '/pacientes', label: 'Pacientes', icon: UsersIcon, moduleKey: 'pacientes' },
  { to: '/profesionales', label: 'Profesionales', icon: IdBadgeIcon, adminOnly: true },
  { to: '/terminos', label: 'Términos y políticas', icon: ShieldIcon },
];

const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/admin/clinicas', label: 'Resumen', icon: ToothCloudIcon },
  { to: '/admin/modulos/pacientes', label: 'Pacientes', icon: UsersIcon },
  { to: '/admin/modulos/agenda', label: 'Agenda y citas', icon: CalendarIcon },
  { to: '/admin/modulos/tratamientos', label: 'Planes de tratamiento', icon: ClipboardIcon },
  { to: '/admin/modulos/documentosClinicos', label: 'Documentos clínicos', icon: FolderIcon },
  { to: '/admin/modulos/cartola', label: 'Cartola', icon: ReceiptIcon },
  { to: '/admin/modulos/evoluciones', label: 'Evoluciones', icon: ActivityIcon },
  { to: '/admin/modulos/observaciones', label: 'Observaciones', icon: ChatIcon },
  { to: '/admin/modulos/consentimientos', label: 'Consentimientos', icon: ShieldIcon },
  { to: '/admin/modulos/rx', label: 'Módulo Rx', icon: XrayIcon },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const navItems = isSuperAdmin
    ? SUPER_ADMIN_NAV_ITEMS
    : NAV_ITEMS.filter(
        (item) =>
          (!item.adminOnly || user?.role === 'admin') &&
          (!item.moduleKey || user?.clinicaModules?.[item.moduleKey] !== false)
      );
  const [openGroup, setOpenGroup] = useState<string | null>(
    navItems.find((item) => item.basePath && location.pathname.startsWith(item.basePath))?.label ?? null
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-gradient-to-b from-[#0b3050] to-[#061524] text-white transition-transform duration-200 lg:static lg:translate-x-0 lg:transition-[width] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'}`}
      >
        <div className="flex h-16 items-center gap-2 px-4">
          <Link to="/" onClick={onCloseMobile} className="flex flex-1 items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400">
              <ToothCloudIcon className="h-5 w-5" />
            </div>
            {!collapsed && (
              <span className="truncate text-lg font-bold tracking-tight">
                fordent<span className="text-brand-400">cloud</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar menú"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 lg:hidden"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (!item.children) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to!}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-500/20 text-brand-300'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            }

            const isOpen = openGroup === item.label;
            const isGroupActive = location.pathname.startsWith(item.basePath!);

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : item.label)}
                  title={collapsed ? item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isGroupActive
                      ? 'text-brand-300'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      <ChevronDownIcon
                        className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="mt-1 flex flex-col gap-1 border-l border-white/10 pl-6">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-brand-500/20 text-brand-300'
                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="absolute top-16 -right-3 hidden h-6 w-6 items-center justify-center rounded-full bg-white text-brand-600 shadow-md ring-1 ring-black/5 hover:bg-brand-50 lg:flex"
        >
          <ChevronLeftIcon className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>
    </>
  );
}
