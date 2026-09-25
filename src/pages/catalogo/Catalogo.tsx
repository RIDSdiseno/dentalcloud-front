import { useEffect, useMemo, useState } from 'react';
import { fetchAllPrestaciones, updatePrestacion, deletePrestacion, type Prestacion } from '../../api/catalogs';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatCLP } from '../../utils/treatmentStatus';
import { ClipboardIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/icons';
import { FACIAL_ZONE_LABELS, type FacialZoneKey } from '../pacientes/facialZoneConfig';
import { ODONTOGRAM_MODE_LABELS } from '../pacientes/odontogramConfig';
import { PrestacionFormModal } from './PrestacionFormModal';
import { ConveniosTab } from './ConveniosTab';
import { PrevisionesTab } from './PrevisionesTab';
import { ClinicasTab } from './ClinicasTab';
import { InventarioTab } from './InventarioTab';
import { ProductosMarcaTab } from './ProductosMarcaTab';
import { exportPrestacionesExcel } from '../../utils/exportPrestacionesExcel';
import { importPrestacionesExcel, type ImportSummary } from '../../utils/importPrestacionesExcel';
import { ExcelImportExportBar } from '../../components/ExcelImportExportBar';
import { ImportSummaryModal } from '../../components/ImportSummaryModal';

// Sin esto, buscar "acido" no encuentra "Ácido Hialurónico" — el usuario no
// siempre tipea las tildes.
function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function zonesSummary(allowedZones: string[]): string {
  if (allowedZones.length === 0) return 'Todas las zonas';
  return allowedZones.map((z) => FACIAL_ZONE_LABELS[z as FacialZoneKey] ?? z).join(', ');
}

const TABS = [
  { key: 'prestaciones', label: 'Prestaciones' },
  { key: 'convenios', label: 'Convenios' },
  { key: 'previsiones', label: 'Previsiones' },
  { key: 'clinicas', label: 'Clínicas' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'productos-marca', label: 'Productos y Marcas' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function Catalogo() {
  const { user } = useAuth();
  const clinicaTipo = user?.clinicaTipo;
  // Clínicas "ambas" administran ambas categorías, así que la columna de
  // Tipo/Zonas sólo aporta cuando hay más de una categoría posible.
  const isEstetica = !!clinicaTipo && clinicaTipo !== 'dental';
  const showCategoryColumn = clinicaTipo === 'ambas';
  // El modo de odontograma sólo aplica a prestaciones dentales — se omite
  // por completo para clínicas puramente estéticas (nunca tienen ninguna).
  const showModeColumn = clinicaTipo !== 'estetica';
  const [tab, setTab] = useState<TabKey>('prestaciones');
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'todas' | 'dental' | 'estetica'>('todas');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prestacion | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  useEffect(() => {
    fetchAllPrestaciones()
      .then(setPrestaciones)
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el catálogo')))
      .finally(() => setIsLoading(false));
  }, []);

  function handleSaved(saved: Prestacion) {
    setPrestaciones((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
    setShowForm(false);
    setEditing(null);
  }

  async function handleToggleActive(prestacion: Prestacion) {
    setBusyId(prestacion.id);
    setError(null);
    try {
      const updated = await updatePrestacion(prestacion.id, { active: !prestacion.active });
      setPrestaciones((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la prestación'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    setError(null);
    try {
      await exportPrestacionesExcel(prestaciones, user?.clinicaName ?? undefined);
    } catch {
      setError('No se pudo generar el Excel del catálogo');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImportFile(file: File) {
    setIsImporting(true);
    setError(null);
    try {
      const summary = await importPrestacionesExcel(file);
      setImportSummary(summary);
      if (summary.created > 0) {
        fetchAllPrestaciones()
          .then(setPrestaciones)
          .catch((err) => setError(getErrorMessage(err, 'No se pudo recargar el catálogo')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo Excel');
    } finally {
      setIsImporting(false);
    }
  }

  const filteredPrestaciones = useMemo(() => {
    const term = normalizeSearch(search.trim());
    return prestaciones.filter((p) => {
      if (categoryFilter !== 'todas' && p.category !== categoryFilter) return false;
      if (!term) return true;
      return normalizeSearch(p.name).includes(term) || normalizeSearch(p.code ?? '').includes(term);
    });
  }, [prestaciones, search, categoryFilter]);

  async function handleDelete(prestacion: Prestacion) {
    if (!window.confirm(`¿Eliminar "${prestacion.name}" del catálogo?`)) return;
    setBusyId(prestacion.id);
    setError(null);
    try {
      await deletePrestacion(prestacion.id);
      setPrestaciones((prev) => prev.filter((p) => p.id !== prestacion.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la prestación'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div id="catalogo-header">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Catálogo</h1>
        <div id="catalogo-tabs" className="mt-3 flex w-fit gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium dark:bg-slate-800">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                tab === t.key ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'convenios' && <ConveniosTab />}
      {tab === 'previsiones' && <PrevisionesTab />}
      {tab === 'clinicas' && <ClinicasTab />}
      {tab === 'inventario' && <InventarioTab />}
      {tab === 'productos-marca' && <ProductosMarcaTab />}

      {tab === 'prestaciones' && (
        <>
      <div id="catalogo-prestaciones-header" className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filteredPrestaciones.length === prestaciones.length
            ? `${prestaciones.length} ${prestaciones.length === 1 ? 'prestación' : 'prestaciones'}`
            : `${filteredPrestaciones.length} de ${prestaciones.length} prestaciones`}
        </p>
        <div className="flex items-center gap-2">
          <ExcelImportExportBar
            isExporting={isExporting}
            isImporting={isImporting}
            onExport={handleExport}
            onImportFile={handleImportFile}
          />
          <button
            id="catalogo-nueva-prestacion-btn"
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Nueva prestación
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      <div id="catalogo-prestaciones-filtros" className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
        {showCategoryColumn && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-800">
            {(['todas', 'dental', 'estetica'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  categoryFilter === c ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {c === 'todas' ? 'Todas' : c === 'dental' ? 'Dental' : 'Estética'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div id="catalogo-tabla" className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {!isLoading && prestaciones.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <ClipboardIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay prestaciones en el catálogo.</p>
          </div>
        )}

        {!isLoading && prestaciones.length > 0 && filteredPrestaciones.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <SearchIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay prestaciones que coincidan con la búsqueda.</p>
          </div>
        )}

        {filteredPrestaciones.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Precio</th>
                {showCategoryColumn && <th className="px-4 py-3">Tipo</th>}
                {showModeColumn && <th className="px-4 py-3">Modo</th>}
                {isEstetica && <th className="px-4 py-3">Zonas</th>}
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPrestaciones.map((p) => (
                <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {p.name}
                    {isEstetica && p.requiresProductTracking && (
                      <span
                        title="Requiere registrar producto y lote"
                        className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      >
                        Lote
                      </span>
                    )}
                    {isEstetica && p.appliesToWholeFace && (
                      <span
                        title="Aplica siempre a todo el rostro"
                        className="ml-1.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      >
                        Todo el rostro
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.code ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {p.zonePrices ? <span title="Cada zona tiene su propio precio">Según zona</span> : formatCLP(p.basePrice)}
                  </td>
                  {showCategoryColumn && (
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          p.category === 'estetica'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
                            : 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
                        }`}
                      >
                        {p.category === 'estetica' ? 'Estética' : 'Dental'}
                      </span>
                    </td>
                  )}
                  {showModeColumn && (
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {p.category === 'dental' ? ODONTOGRAM_MODE_LABELS[p.odontogramMode] : '—'}
                    </td>
                  )}
                  {isEstetica && (
                    <td className="px-4 py-3 max-w-[260px] text-xs text-slate-500 dark:text-slate-400">
                      {p.category !== 'estetica' ? '—' : p.appliesToWholeFace ? 'Todo el rostro' : zonesSummary(p.allowedZones)}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => handleToggleActive(p)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                        p.active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {p.active ? 'Activa' : 'Desactivada'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(p);
                          setShowForm(true);
                        }}
                        aria-label={`Editar ${p.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleDelete(p)}
                        aria-label={`Eliminar ${p.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <PrestacionFormModal
          prestacion={editing}
          clinicaTipo={clinicaTipo}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {importSummary && <ImportSummaryModal summary={importSummary} onClose={() => setImportSummary(null)} />}
        </>
      )}
    </div>
  );
}
