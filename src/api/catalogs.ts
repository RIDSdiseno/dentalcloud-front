import { api } from './client';

export type Sucursal = {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  dimageClinicId: string | null;
};
export type Prevision = { id: string; name: string; active: boolean };
export type Convenio = { id: string; name: string; discountPercent: number; active: boolean };
// El backend todavía no expone configuración de odontograma por prestación;
// estos campos quedan opcionales (camelCase y snake_case) para no romper
// nada hoy y poder consumirlos el día que la API los entregue.
export type Prestacion = {
  id: string;
  code: string | null;
  name: string;
  basePrice: number;
  active: boolean;
  // Zonas del mapa facial donde aplica (solo clínicas tipo "estetica").
  // Array vacío = sin restricción, aplica a cualquier zona.
  allowedZones: string[];
  // Marca prestaciones que usan un producto con lote/trazabilidad obligatoria
  // (ej. Ácido Hialurónico) — ver TreatmentPlanFormModal/TreatmentPlanTab.
  requiresProductTracking: boolean;
  odontogramMode?: 'session' | 'tooth' | 'surface' | 'extraction';
  odontogram_mode?: 'session' | 'tooth' | 'surface' | 'extraction';
  markColor?: string;
  mark_color?: string;
  allowMultipleTeeth?: boolean;
  allow_multiple_teeth?: boolean;
  defaultTeeth?: string[];
  default_teeth?: string[];
  defaultSurfaces?: ('top' | 'right' | 'bottom' | 'left' | 'center')[];
  default_surfaces?: ('top' | 'right' | 'bottom' | 'left' | 'center')[];
};
export type EvolutionTemplate = {
  id: string;
  name: string;
  section: string | null;
  content: string;
  active: boolean;
};

export async function fetchSucursales() {
  const { data } = await api.get<{ sucursales: Sucursal[] }>('/catalogs/sucursales');
  return data.sucursales;
}

export async function fetchPrevisiones() {
  const { data } = await api.get<{ previsiones: Prevision[] }>('/catalogs/previsiones');
  return data.previsiones;
}

export async function fetchConvenios() {
  const { data } = await api.get<{ convenios: Convenio[] }>('/catalogs/convenios');
  return data.convenios;
}

export async function fetchPrestaciones(search?: string) {
  const { data } = await api.get<{ prestaciones: Prestacion[] }>('/catalogs/prestaciones', {
    params: search ? { q: search } : undefined,
  });
  return data.prestaciones;
}

export async function fetchAllPrestaciones() {
  const { data } = await api.get<{ prestaciones: Prestacion[] }>('/catalogs/prestaciones', {
    params: { all: 'true' },
  });
  return data.prestaciones;
}

export async function createPrestacion(input: {
  name: string;
  code?: string;
  basePrice: number;
  allowedZones?: string[];
  requiresProductTracking?: boolean;
}) {
  const { data } = await api.post<{ prestacion: Prestacion }>('/catalogs/prestaciones', input);
  return data.prestacion;
}

export async function updatePrestacion(
  id: string,
  patch: {
    name?: string;
    code?: string | null;
    basePrice?: number;
    active?: boolean;
    allowedZones?: string[];
    requiresProductTracking?: boolean;
  }
) {
  const { data } = await api.patch<{ prestacion: Prestacion }>(`/catalogs/prestaciones/${id}`, patch);
  return data.prestacion;
}

export async function deletePrestacion(id: string) {
  await api.delete(`/catalogs/prestaciones/${id}`);
}

export async function fetchEvolutionTemplates() {
  const { data } = await api.get<{ templates: EvolutionTemplate[] }>('/catalogs/evolution-templates');
  return data.templates;
}

export async function updateSucursal(id: string, patch: { dimageClinicId?: string | null }) {
  const { data } = await api.patch<{ sucursal: Sucursal }>(`/catalogs/sucursales/${id}`, patch);
  return data.sucursal;
}
