import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPatients, type Patient } from '../../api/patients';
import { getErrorMessage } from '../../api/client';
import { MailIcon, PhoneIcon, PlusIcon, SearchIcon, UsersIcon } from '../../components/icons';
import { PatientFormModal } from './PatientFormModal';
import { formatRut } from '../../utils/rut';

function formatBirthDate(birthDate: string | null) {
  if (!birthDate) return '—';
  return new Date(birthDate).toLocaleDateString('es-CL');
}

export default function Pacientes() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await fetchPatients(search || undefined);
        if (!controller.signal.aborted) {
          setPatients(data);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(getErrorMessage(err, 'No se pudo cargar la lista de pacientes'));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [search]);

  function handleCreated(patient: Patient) {
    setPatients((prev) => [...prev, patient].sort((a, b) => a.lastName.localeCompare(b.lastName)));
    setShowCreateForm(false);
    navigate(`/pacientes/${patient.id}`);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pacientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {patients.length} paciente{patients.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo paciente
        </button>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, apellido o RUT..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {error && <p className="p-6 text-sm text-red-600">{error}</p>}

        {!error && !isLoading && patients.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <UsersIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500">
              {search ? 'No se encontraron pacientes.' : 'Aún no hay pacientes registrados.'}
            </p>
          </div>
        )}

        {!error && patients.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">RUT</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Nacimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => navigate(`/pacientes/${patient.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {patient.firstName} {patient.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatRut(patient.rut)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <div className="flex flex-col gap-0.5">
                      {patient.phone && (
                        <span className="flex items-center gap-1.5">
                          <PhoneIcon className="h-3.5 w-3.5" /> {patient.phone}
                        </span>
                      )}
                      {patient.email && (
                        <span className="flex items-center gap-1.5">
                          <MailIcon className="h-3.5 w-3.5" /> {patient.email}
                        </span>
                      )}
                      {!patient.phone && !patient.email && '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatBirthDate(patient.birthDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateForm && (
        <PatientFormModal onClose={() => setShowCreateForm(false)} onSaved={handleCreated} />
      )}
    </div>
  );
}
