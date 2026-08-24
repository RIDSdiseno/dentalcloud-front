import { api } from './client';

// El inventario NO vive en esta plataforma — se lee y escribe en vivo, vía
// federación, sobre el inventario real que administra Dental-Demo-Back (ver
// dentalcloud-backend/src/routes/inventory.ts). No hay tabla local ni sync:
// cada acción pega directo al sistema administrativo.

export type InventorySupplyStatus = 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ARCHIVED';

export type InventoryLotSummary = {
  totalLots: number;
  activeLots: number;
  totalQuantity: number;
  expiredLots: number;
  expiringLots: number;
  nextExpirationDate: string | null;
};

export type InventorySupply = {
  id: string;
  locationId: string | null;
  name: string;
  category: string | null;
  supplier: string | null;
  consultingRoom: string | null;
  description: string | null;
  purchaseDate: string | null;
  quantity: number | null;
  unit: string | null;
  unitCost: number | null;
  totalCost: number | null;
  currentStock: number | null;
  minimumStock: number | null;
  status: InventorySupplyStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Id/nombre del lado de Dental-Demo-Back — no es el sucursalId nativo de
  // esta plataforma. Para preseleccionar la sede en el formulario de edición
  // se matchea por nombre contra las sucursales propias (ver InsumoFormModal).
  location: { id: string; name: string } | null;
  lotSummary?: InventoryLotSummary;
};

export type InventoryLotExpirationStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NO_EXPIRATION';

export type InventoryLot = {
  id: string;
  supplyId: string;
  locationId: string | null;
  lotNumber: string;
  manufacturer: string | null;
  presentation: string | null;
  concentration: string | null;
  healthRegistration: string | null;
  quantity: number;
  initialQuantity: number;
  currentQuantity: number;
  expirationDate: string | null;
  receivedAt: string | null;
  expirationStatus: InventoryLotExpirationStatus;
  expirationStatusLabel: string;
  daysUntilExpiration: number | null;
  isActive: boolean;
  location: { id: string; name: string } | null;
  supply?: { id: string; name: string; status: InventorySupplyStatus; currentStock: number | null; minimumStock: number | null };
};

export type InventoryLotMovement = {
  id: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previousQuantity: number;
  resultingQuantity: number;
  reason: string | null;
  createdAt: string;
};

export type InventoryAlerts = {
  expiredLots: number;
  expiringLots: number;
  suppliesWithoutStock: number;
  lowStockSupplies: number;
  items: InventoryLot[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

// Listas fijas de texto libre del lado de Dental-Demo-Back (no son enums en
// su base, pero su propia UI restringe a estas opciones — ver
// clinicSupply.validators.js CONSULTING_ROOMS e Insumos.jsx CATEGORIES).
export const INVENTORY_CATEGORIES = [
  'Desechables',
  'Bioseguridad',
  'Anestesia',
  'Restauracion',
  'Ortodoncia',
  'Higiene dental',
  'Instrumental',
  'Radiologia',
  'Laboratorio',
  'Otros',
] as const;

export const INVENTORY_UNITS = ['unidad', 'caja', 'paquete', 'frasco', 'tubo', 'ml', 'kit'] as const;

export const CONSULTING_ROOMS = [
  'Consultorio 1',
  'Consultorio 2',
  'Consultorio 3',
  'Consultorio 4',
  'Consultorio 5',
  'Sala RX',
  'Pabellón menor',
] as const;

export type SupplyFilters = {
  search?: string;
  category?: string;
  supplier?: string;
  status?: InventorySupplyStatus;
  sucursalId?: string;
  consultingRoom?: string;
};

export async function fetchInsumos(filters: SupplyFilters = {}) {
  const { data } = await api.get<{ items: InventorySupply[] }>('/inventory/supplies', {
    params: { ...filters, limit: 100 },
  });
  return data.items;
}

export type SupplyInput = {
  sucursalId?: string;
  name: string;
  category?: string;
  supplier?: string;
  description?: string;
  purchaseDate?: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  totalCost?: number;
  minimumStock?: number;
  consultingRoom?: string | null;
};

export async function createInsumo(input: SupplyInput) {
  const { data } = await api.post<InventorySupply>('/inventory/supplies', input);
  return data;
}

export async function updateInsumo(id: string, patch: Partial<SupplyInput>) {
  const { data } = await api.patch<InventorySupply>(`/inventory/supplies/${id}`, patch);
  return data;
}

export async function archiveInsumo(id: string) {
  const { data } = await api.post<InventorySupply>(`/inventory/supplies/${id}/archive`);
  return data;
}

export async function fetchLotes(supplyId: string) {
  const { data } = await api.get<{ items: InventoryLot[] }>(`/inventory/supplies/${supplyId}/lots`, {
    params: { limit: 100 },
  });
  return data.items;
}

export type LotInput = {
  lotNumber: string;
  manufacturer?: string | null;
  presentation?: string | null;
  concentration?: string | null;
  healthRegistration?: string | null;
  receivedAt?: string;
  expirationDate?: string | null;
  initialQuantity?: number;
  quantity?: number;
  isActive?: boolean;
};

export async function createLote(supplyId: string, input: LotInput) {
  const { data } = await api.post<InventoryLot>(`/inventory/supplies/${supplyId}/lots`, input);
  return data;
}

export async function updateLote(supplyId: string, lotId: string, patch: Partial<LotInput>) {
  const { data } = await api.patch<InventoryLot>(`/inventory/supplies/${supplyId}/lots/${lotId}`, patch);
  return data;
}

export async function createMovimiento(
  supplyId: string,
  lotId: string,
  input: { movementType: 'IN' | 'OUT' | 'ADJUSTMENT'; quantity: number; reason?: string }
) {
  const { data } = await api.post<{ movement: InventoryLotMovement; lot: InventoryLot; supply: InventorySupply }>(
    `/inventory/supplies/${supplyId}/lots/${lotId}/movements`,
    input
  );
  return data;
}

export async function fetchAlertas(sucursalId?: string) {
  const { data } = await api.get<InventoryAlerts>('/inventory/alerts', {
    params: { sucursalId, includeItems: false },
  });
  return data;
}
