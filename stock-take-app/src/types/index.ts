export type BaseUnit = 'ml' | 'g' | 'each';
export type DisplayUnit = string;
export type StorageLocation = 'bar' | 'cellar' | 'kitchen' | 'custom';
export type SessionStatus = 'open' | 'closed';
export type SyncQueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Item {
  id: string;
  name: string;
  category: string | null;
  storage_location: StorageLocation;
  base_unit: BaseUnit;
  display_unit: DisplayUnit;
  container_size: number | null;
  is_batch: boolean;
  is_active: boolean;
  par_level: number | null;
  fill_granularity: number;
  created_at: string;
  updated_at: string;
}

export interface Alias {
  id: string;
  item_id: string;
  alias_text: string;
}

export interface Recipe {
  id: string;
  item_id: string;
  version: number;
  yield_pct: number;
  is_current: boolean;
  created_at: string;
}

export interface ItemContainerSize {
  id: string;
  item_id: string;
  label: string;
  size: number;
  is_default: boolean;
}

export interface RecipeComponent {
  id: string;
  recipe_id: string;
  component_item_id: string;
  qty: number;
  unit: string;
}

export interface RecipeWithComponents extends Recipe {
  components: Array<RecipeComponent & { component_name?: string }>;
}

export interface CountSession {
  id: string;
  name: string;
  location: string;
  status: SessionStatus;
  started_at: string;
  closed_at: string | null;
}

export interface CountEvent {
  id: string;
  session_id: string;
  item_id: string;
  qty: number;
  fill_level: number | null;
  raw_transcript: string;
  recipe_version: number | null;
  confidence_score: number;
  created_at: string;
}

export interface SyncQueueEntry {
  id: string;
  entity: string;
  payload: string;
  status: SyncQueueStatus;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface ParsedUtteranceItem {
  name: string;
  quantity: number;
  unit?: string;
}

export interface ParsedUtterance {
  items: ParsedUtteranceItem[];
}

export interface MatchCandidate {
  itemId: string;
  itemName: string;
  score: number;
  matchedVia: 'name' | 'alias';
  matchedText: string;
}

export interface MatchResult {
  query: string;
  best: MatchCandidate | null;
  runnersUp: MatchCandidate[];
  scoreGap: number;
}

export interface AppSettings {
  defaultLocation: StorageLocation;
  confidenceThreshold: number;
  defaultBaseUnit: BaseUnit;
  spreadsheetProvider: 'google' | 'microsoft' | 'none';
  useMockServices: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultLocation: 'bar',
  confidenceThreshold: 80,
  defaultBaseUnit: 'ml',
  spreadsheetProvider: 'none',
  useMockServices: true,
};
