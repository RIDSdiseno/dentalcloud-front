import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchPatients, type Patient } from '../../api/patients';
import { formatRut } from '../../utils/rut';
import { BellIcon, ChevronDownIcon, LogoutIcon, MenuIcon, SearchIcon } from '../icons';
import { roleLabel } from '../../utils/roles';

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

type TopbarProps = {
  onMenuClick: () => void;
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
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
  }, [query]);

  function handleSelectPatient(patient: Patient) {
    navigate(`/pacientes/${patient.id}`);
    setQuery('');
    setResults([]);
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <div className="relative min-w-0 flex-1 max-w-md" ref={searchRef}>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ficha de paciente..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
        />
        {results.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {results.map((patient) => (
              <button
                type="button"
                key={patient.id}
                onClick={() => handleSelectPatient(patient)}
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
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <BellIcon className="h-5 w-5" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {user ? initialsOf(user.name) : '?'}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-slate-800">
                {user?.name}
              </span>
              <span className="block text-xs text-slate-400">
                {user ? roleLabel(user.role) : ''}
              </span>
            </span>
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                <LogoutIcon className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
