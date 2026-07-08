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
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AppLayout } from './components/layout/AppLayout';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
