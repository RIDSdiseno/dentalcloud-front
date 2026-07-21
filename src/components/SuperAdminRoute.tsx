import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function SuperAdminRoute() {
  const { user } = useAuth();

  if (user?.role !== 'super_admin') return <Navigate to="/" replace />;

  return <Outlet />;
}
