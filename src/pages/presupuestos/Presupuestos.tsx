import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTreatmentPlansForClinic, type TreatmentPlanSummary, type TreatmentPlan } from '../../api/treatmentPlans';
import { getErrorMessage } from '../../api/client';
import { formatCLP, TREATMENT_STATUS_CLASSES, TREATMENT_STATUS_LABELS } from '../../utils/treatmentStatus';
import { formatRut } from '../../utils/rut';
import { Modal } from '../../components/Modal';
import { PatientPicker } from '../agenda/PatientPicker';
import { TreatmentPlanFormModal } from '../pacientes/TreatmentPlanFormModal';
import type { Patient } from '../../api/patients';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Presupuestos() {
  const [plans, setPlans] = useState<TreatmentPlanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickedPatient, setPickedPatient] = useState<Patient | null>(null);
  const [newPatientForPlan, setNewPatientForPlan] = useState<Patient | null>(null);

  function load() {
    setIsLoading(true);
    fetchTreatmentPlansForClinic()
      .then(setPlans)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los presupuestos')))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function handlePlanSaved(plan: TreatmentPlan) {
    setNewPatientForPlan(null);
    setPlans((prev) => [
      {
        id: plan.id,
        number: plan.number,
        patientId: plan.patientId,
        name: plan.name,
        status: plan.status,
        amount: plan.amount,
        paymentMethod: plan.paymentMethod,
        createdAt: plan.createdAt,
        patient: {
          id: newPatientForPlan?.id ?? plan.patientId,
          firstName: newPatientForPlan?.firstName ?? '',
          lastName: newPatientForPlan?.lastName ?? '',
          rut: newPatientForPlan?.rut ?? '',
        },
        professional: plan.professional,
        createdBy: plan.createdBy,
      },
      ...prev,
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div id="presupuestos-header" className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Presupuesto</h1>
        <button
          id="presupuestos-nuevo-btn"
          type="button"
          onClick={() => setShowPicker(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Nuevo presupuesto
        </button>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Todos los presupuestos creados en esta clínica, de cualquier paciente y cualquier profesional.
      </p>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      {isLoading && <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>}

      {!isLoading && plans.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800">
          Todavía no hay presupuestos creados en esta clínica.
        </div>
      )}

      {plans.length > 0 && (
        <div id="presupuestos-tabla" className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
              <tr>
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Profesional</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">#{plan.number}</td>
                  <td className="px-4 py-3">
                    <Link to={`/pacientes/${plan.patientId}`} className="font-medium text-brand-600 hover:underline">
                      {plan.patient.firstName} {plan.patient.lastName}
                    </Link>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{formatRut(plan.patient.rut)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{plan.professional?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{formatCLP(plan.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TREATMENT_STATUS_CLASSES[plan.status]}`}>
                      {TREATMENT_STATUS_LABELS[plan.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(plan.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPicker && (
        <Modal title="Elige el paciente" onClose={() => setShowPicker(false)}>
          <div className="flex flex-col gap-4">
            <PatientPicker value={pickedPatient} onChange={setPickedPatient} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPicker(false);
                  setPickedPatient(null);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!pickedPatient}
                onClick={() => {
                  setNewPatientForPlan(pickedPatient);
                  setShowPicker(false);
                  setPickedPatient(null);
                }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continuar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {newPatientForPlan && (
        <TreatmentPlanFormModal
          patient={newPatientForPlan}
          onClose={() => setNewPatientForPlan(null)}
          onSaved={handlePlanSaved}
        />
      )}
    </div>
  );
}
