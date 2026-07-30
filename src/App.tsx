import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import Agenda from './pages/agenda/Agenda';
import SillonesLibres from './pages/agenda/SillonesLibres';
import AgendaDiaria from './pages/agenda/AgendaDiaria';
import Pacientes from './pages/pacientes/Pacientes';
import FichaPaciente from './pages/pacientes/FichaPaciente';
import Profesionales from './pages/profesionales/Profesionales';
import ConsentimientoPublico from './pages/consentimiento/ConsentimientoPublico';
import Clinicas from './pages/superadmin/Clinicas';
import ClinicaDetail from './pages/superadmin/ClinicaDetail';
import ModuloConsumo from './pages/superadmin/ModuloConsumo';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { SuperAdminRoute } from './components/SuperAdminRoute';
import { AppLayout } from './components/layout/AppLayout';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/consentimiento/:token" element={<ConsentimientoPublico />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/agenda/sillones-libres" element={<SillonesLibres />} />
          <Route path="/agenda/diaria" element={<AgendaDiaria />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/pacientes/:id" element={<FichaPaciente />} />
          <Route path="/terminos" element={<ComingSoon title="Términos y políticas" />} />
          <Route element={<AdminRoute />}>
            <Route path="/profesionales" element={<Profesionales />} />
          </Route>
          <Route element={<SuperAdminRoute />}>
            <Route path="/admin/clinicas" element={<Clinicas />} />
            <Route path="/admin/clinicas/:id" element={<ClinicaDetail />} />
            <Route path="/admin/modulos/:moduleKey" element={<ModuloConsumo />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
