import type {
  Alias,
  BaseUnit,
  CountEvent,
  CountSession,
  Item,
  Recipe,
  RecipeComponent,
  SessionStatus,
  StorageLocation,
  SyncQueueEntry,
  SyncQueueStatus,
} from '@/types';

export type ItemRow = {
  id: string;
  name: string;
  category: string | null;
  storage_location: string;
  base_unit: string;
  display_unit: string;
  container_size: number | null;
  is_batch: number;
  is_active: number;
  par_level: number | null;
  fill_granularity: number;
  sku: string | null;
  brand: string | null;
  color: string | null;
  size: string | null;
  created_at: string;
  updated_at: string;
};

function toBool(value: number): boolean {
  return value === 1;
}

function fromBool(value: boolean): number {
  return value ? 1 : 0;
}

export function mapItemRow(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    storage_location: row.storage_location as StorageLocation,
    base_unit: row.base_unit as BaseUnit,
    display_unit: row.display_unit,
    container_size: row.container_size,
    is_batch: toBool(row.is_batch),
    is_active: toBool(row.is_active),
    par_level: row.par_level,
    fill_granularity: row.fill_granularity,
    sku: row.sku ?? null,
    brand: row.brand ?? null,
    color: row.color ?? null,
    size: row.size ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapItemToParams(item: Omit<Item, 'created_at' | 'updated_at'>): (string | number | null)[] {
  return [
    item.id,
    item.name,
    item.category,
    item.storage_location,
    item.base_unit,
    item.display_unit,
    item.container_size,
    fromBool(item.is_batch),
    fromBool(item.is_active),
    item.par_level,
    item.fill_granularity,
    item.sku,
    item.brand,
    item.color,
    item.size,
  ];
}

export function mapAliasRow(row: { id: string; item_id: string; alias_text: string }): Alias {
  return row;
}

export function mapSessionRow(row: {
  id: string;
  name: string;
  location: string;
  status: string;
  started_at: string;
  closed_at: string | null;
}): CountSession {
  return {
    ...row,
    status: row.status as SessionStatus,
  };
}

export function mapCountEventRow(row: {
  id: string;
  session_id: string;
  item_id: string;
  qty: number;
  fill_level: number | null;
  raw_transcript: string;
  recipe_version: number | null;
  confidence_score: number;
  created_at: string;
}): CountEvent {
  return row;
}

export function mapRecipeRow(row: {
  id: string;
  item_id: string;
  version: number;
  yield_pct: number;
  is_current: number;
  created_at: string;
}): Recipe {
  return {
    id: row.id,
    item_id: row.item_id,
    version: row.version,
    yield_pct: row.yield_pct,
    is_current: toBool(row.is_current),
    created_at: row.created_at,
  };
}

export function mapRecipeComponentRow(row: {
  id: string;
  recipe_id: string;
  component_item_id: string;
  qty: number;
  unit: string;
}): RecipeComponent {
  return row;
}

export function mapSyncQueueRow(row: {
  id: string;
  entity: string;
  payload: string;
  status: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}): SyncQueueEntry {
  return {
    ...row,
    status: row.status as SyncQueueStatus,
  };
}
