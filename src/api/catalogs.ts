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

export async function fetchEvolutionTemplates() {
  const { data } = await api.get<{ templates: EvolutionTemplate[] }>('/catalogs/evolution-templates');
  return data.templates;
}

export async function updateSucursal(id: string, patch: { dimageClinicId?: string | null }) {
  const { data } = await api.patch<{ sucursal: Sucursal }>(`/catalogs/sucursales/${id}`, patch);
  return data.sucursal;
}
