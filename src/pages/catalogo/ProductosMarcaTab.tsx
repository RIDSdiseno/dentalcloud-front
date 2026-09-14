import { useEffect, useState } from 'react';
import {
  fetchAllProductosMarca,
  createProductoMarca,
  updateProductoMarca,
  deleteProductoMarca,
  type ProductoMarca,
} from '../../api/catalogs';
import { getErrorMessage } from '../../api/client';
import { PlusIcon, TrashIcon } from '../../components/icons';

function formatCLP(value: number) {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

export function ProductosMarcaTab() {
  const [productos, setProductos] = useState<ProductoMarca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newNombre, setNewNombre] = useState('');
  const [newMarca, setNewMarca] = useState('');
  const [newUnidad, setNewUnidad] = useState('unidad');
  const [newCosto, setNewCosto] = useState('0');
  const [newMargen, setNewMargen] = useState('0');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchAllProductosMarca()
      .then(setProductos)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los productos')))
      .finally(() => setIsLoading(false));
  }, []);

  const previewPrecio = Math.round((Number(newCosto) || 0) * (1 + (Number(newMargen) || 0) / 100));

  async function handleCreate() {
    if (!newNombre.trim() || !newMarca.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createProductoMarca({
        nombreGenerico: newNombre.trim(),
        marca: newMarca.trim(),
        unidad: newUnidad.trim() || 'unidad',
        costo: Number(newCosto) || 0,
        margenPercent: Number(newMargen) || 0,
      });
      setProductos((prev) =>
        [...prev, created].sort((a, b) => a.nombreGenerico.localeCompare(b.nombreGenerico) || a.marca.localeCompare(b.marca))
      );
      setNewNombre('');
      setNewMarca('');
      setNewUnidad('unidad');
      setNewCosto('0');
      setNewMargen('0');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el producto'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(
    producto: ProductoMarca,
    patch: { costo?: number; margenPercent?: number; active?: boolean }
  ) {
    setBusyId(producto.id);
    setError(null);
    try {
      const updated = await updateProductoMarca(producto.id, patch);
      setProductos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el producto'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(producto: ProductoMarca) {
    if (!window.confirm(`¿Eliminar "${producto.marca}" (${producto.nombreGenerico})?`)) return;
    setBusyId(producto.id);
    setError(null);
    try {
      await deleteProductoMarca(producto.id);
      setProductos((prev) => prev.filter((p) => p.id !== producto.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el producto'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Catálogo multimarca (Etapa 08): un mismo producto puede tener varias marcas, cada una con su propio costo y
        margen. El precio de venta se calcula solo — costo × (1 + margen%) — y es lo que usa el presupuesto al elegir
        un producto en el plan de tratamiento por tercios.
      </p>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
        <div className="flex-1 basis-40">
          <label className="text-xs font-medium text-slate-500">Producto genérico</label>
          <input
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            placeholder="Ej: Toxina botulínica"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <div className="flex-1 basis-32">
          <label className="text-xs font-medium text-slate-500">Marca</label>
          <input
            value={newMarca}
            onChange={(e) => setNewMarca(e.target.value)}
            placeholder="Ej: Dysport"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <div className="w-24">
          <label className="text-xs font-medium text-slate-500">Unidad</label>
          <input
            value={newUnidad}
            onChange={(e) => setNewUnidad(e.target.value)}
            placeholder="unidad"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <div className="w-28">
          <label className="text-xs font-medium text-slate-500">Costo</label>
          <input
            type="number"
            min={0}
            value={newCosto}
            onChange={(e) => setNewCosto(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <div className="w-24">
          <label className="text-xs font-medium text-slate-500">Margen %</label>
          <input
            type="number"
            min={0}
            value={newMargen}
            onChange={(e) => setNewMargen(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <div className="w-28">
          <label className="text-xs font-medium text-slate-500">Precio de venta</label>
          <p className="mt-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            {formatCLP(previewPrecio)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !newNombre.trim() || !newMarca.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusIcon className="h-4 w-4" />
          Agregar
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {!isLoading && productos.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Aún no hay productos en el catálogo multimarca.</p>
        )}
        {productos.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50/60 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">Margen</th>
                <th className="px-4 py-3 text-right">Precio de venta</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map((p) => (
                <tr key={p.id} className={!p.active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nombreGenerico}</td>
                  <td className="px-4 py-3 text-slate-600">{p.marca}</td>
                  <td className="px-4 py-3 text-slate-500">{p.unidad}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      defaultValue={p.costo}
                      disabled={busyId === p.id}
                      onBlur={(e) => {
                        const value = Number(e.target.value) || 0;
                        if (value !== p.costo) handleUpdate(p, { costo: value });
                      }}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm outline-none focus:border-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={0}
                        defaultValue={p.margenPercent}
                        disabled={busyId === p.id}
                        onBlur={(e) => {
                          const value = Number(e.target.value) || 0;
                          if (value !== p.margenPercent) handleUpdate(p, { margenPercent: value });
                        }}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm outline-none focus:border-brand-500"
                      />
                      <span className="text-slate-400">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCLP(p.precioVenta)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => handleUpdate(p, { active: !p.active })}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                        p.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {p.active ? 'Activo' : 'Desactivado'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => handleDelete(p)}
                      aria-label={`Eliminar ${p.marca}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
