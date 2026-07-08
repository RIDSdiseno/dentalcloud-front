import { useEffect, useState } from 'react';
import { fetchPatients, type Patient } from '../../api/patients';
import { CloseIcon, SearchIcon } from '../../components/icons';
import { PatientFormModal } from '../pacientes/PatientFormModal';
import { formatRut } from '../../utils/rut';

type PatientPickerProps = {
  value: Patient | null;
  onChange: (patient: Patient | null) => void;
};

export function PatientPicker({ value, onChange }: PatientPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [showPatientForm, setShowPatientForm] = useState(false);

  useEffect(() => {
    if (value || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const patients = await fetchPatients(query);
        setResults(patients);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, value]);

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">Paciente</label>

      {value ? (
        <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {value.firstName} {value.lastName}
            </p>
            <p className="text-xs text-slate-500">{formatRut(value.rut)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Quitar paciente seleccionado"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative mt-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o RUT..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {results.map((patient) => (
                <button
                  type="button"
                  key={patient.id}
                  onClick={() => {
                    onChange(patient);
                    setQuery('');
                    setResults([]);
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-800">
                    {patient.firstName} {patient.lastName}
                  </span>
                  <span className="text-xs text-slate-500">{formatRut(patient.rut)}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowPatientForm(true)}
            className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + Crear nuevo paciente
          </button>
        </div>
      )}

      {showPatientForm && (
        <PatientFormModal
          onClose={() => setShowPatientForm(false)}
          onSaved={(patient) => {
            onChange(patient);
            setShowPatientForm(false);
          }}
        />
      )}
    </div>
  );
}
