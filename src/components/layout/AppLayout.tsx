import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TourButton } from '../TourButton';
import { useModuleTour } from '../../lib/moduleTours';
import { useAuth } from '../../context/AuthContext';
import { applyTenantTheme, resetTenantTheme } from '../../theme';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const moduleTour = useModuleTour();

  useEffect(() => {
    applyTenantTheme(user?.clinicaTipo);
    return () => {
      resetTenantTheme();
    };
  }, [user?.clinicaTipo]);

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        {user && !user.active && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 sm:px-6">
            Tu cuenta está inactiva: puedes seguir viendo tu historial, pero no crear ni modificar nada nuevo.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      {moduleTour && (
        <TourButton key={moduleTour.storageKey} steps={moduleTour.steps} storageKey={moduleTour.storageKey} floating />
      )}
    </div>
  );
}
