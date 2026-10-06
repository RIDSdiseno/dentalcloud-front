import { useEffect, useState } from 'react';
import { searchProductLots, type ProductLot } from '../api/catalogs';

// Buscador de lotes reales del inventario (vive en Dental-Demo-Back, se
// consulta por federación). Nació dentro del formulario de presupuesto, pero
// el cliente pidió que los insumos se registren en la evolución y no al
// presupuestar (tarea 11 del informe del 30/09), así que vive acá para que
// ambos lo usen sin duplicar la búsqueda.
//
// Quien lo usa decide qué hacer con el lote elegido: este componente sólo
// busca y avisa. El estado del lote seleccionado es del padre, porque en la
// evolución además rellena producto y vencimiento.
export function ProductLotField({
  selectedLot,
  onPick,
  onClear,
  placeholder = 'Buscar lote real por producto o N° de lote (ej. Ácido Hialurónico, L-2451)...',
  disabled = false,
  onFederationChange,
}: {
  selectedLot: ProductLot | null;
  onPick: (lot: ProductLot) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Avisa al padre si el inventario respondió o no, para que pueda ofrecer
   *  escribir el lote a mano en vez de dejar al profesional sin poder grabar. */
  onFederationChange?: (available: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductLot[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [federationAvailable, setFederationAvailable] = useState(true);

  // Debounce porque esto es una consulta en vivo a otro sistema por cada
  // tecleo, a diferencia del catálogo de prestaciones que se trae entero.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(() => {
      searchProductLots(q)
        .then(({ lots, federationAvailable: available }) => {
          setResults(lots);
          setFederationAvailable(available);
          onFederationChange?.(available);
        })
        .catch(() => {
          setResults([]);
          setFederationAvailable(false);
          onFederationChange?.(false);
        })
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, onFederationChange]);

  function handlePick(lot: ProductLot) {
    onPick(lot);
    setQuery('');
    setResults([]);
  }

  if (selectedLot) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span>
          <span className="font-semibold">{selectedLot.productName ?? 'Producto sin nombre'}</span>
          {' — Lote '}
          <span className="font-semibold">{selectedLot.lotNumber}</span>
          {' · Stock: '}
          <span className="font-semibold">{selectedLot.stock}</span>
          {selectedLot.expiresAt && (
            <>
              {' · Vence: '}
              <span className="font-semibold">{selectedLot.expiresAt.slice(0, 10)}</span>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded px-1.5 py-0.5 text-emerald-700 underline hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:bg-slate-50 dark:border-amber-500/30 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900"
      />
      {isSearching && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Buscando lotes en el inventario...</p>}
      {!isSearching && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {federationAvailable
            ? 'No se encontraron lotes con stock para esa búsqueda.'
            : 'No se pudo conectar con el inventario (Dental-Demo-Back) ahora mismo.'}
        </p>
      )}
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {results.map((lot) => (
            <button
              key={lot.id}
              type="button"
              onClick={() => handlePick(lot)}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-brand-50 dark:hover:bg-slate-800"
            >
              <span>
                {lot.productName ?? 'Producto sin nombre'} — Lote {lot.lotNumber}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Stock: {lot.stock}
                {lot.expiresAt ? ` · Vence: ${lot.expiresAt.slice(0, 10)}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
