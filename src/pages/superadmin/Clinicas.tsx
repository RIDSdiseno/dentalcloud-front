import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClinicas, type Clinica } from '../../api/clinicas';
import { getErrorMessage } from '../../api/client';
import { formatCLP } from '../../utils/treatmentStatus';
import { formatRut } from '../../utils/rut';
import { CrearClinicaModal } from './CrearClinicaModal';
import { TIPO_LABELS } from './clinicaShared';
import { PlusIcon, StarIcon, ToothCloudIcon, UsersIcon } from '../../components/icons';


export default function Clinicas() {
  const navigate = useNavigate();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchClinicas()
      .then(setClinicas)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los holdings')))
      .finally(() => setIsLoading(false));
  }, []);

  function handleCreated(created: Clinica) {
    setClinicas((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setShowCreateModal(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Holdings</h1>
          <p className="mt-1 text-sm text-slate-500">
            {clinicas.length} holding{clinicas.length === 1 ? '' : 's'} en la plataforma
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" />
          Crear holding
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!isLoading && clinicas.length === 0 && (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-400">Aún no hay holdings registrados.</p>
        </div>
      )}

      {clinicas.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Holding</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">RUT</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Pacientes</th>
                <th className="px-4 py-3 text-right">Monto total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clinicas.map((clinica) => (
                <tr
                  key={clinica.id}
                  onClick={() => navigate(`/admin/clinicas/${clinica.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-500/10 text-brand-600">
                        {clinica.logoUrl ? (
                          <img
                            src={clinica.logoUrl}
                            alt={`Logo de ${clinica.name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : clinica.tipo === 'estetica' ? (
                          <StarIcon className="h-4 w-4" />
                        ) : (
                          <ToothCloudIcon className="h-4 w-4" />
                        )}
                      </span>
                      <span className="font-medium text-slate-800">{clinica.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {TIPO_LABELS[clinica.tipo] ?? clinica.tipo}
                    <span className="text-slate-400"> · {clinica.pais}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{clinica.rut ? formatRut(clinica.rut) : '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                        clinica.active
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-red-50 text-red-700 ring-red-200'
                      }`}
                    >
                      {clinica.active ? 'Activa' : 'Desactivada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <UsersIcon className="h-3.5 w-3.5 text-slate-400" />
                      {clinica.patientsCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {formatCLP(clinica.treatmentPlansAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CrearClinicaModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
