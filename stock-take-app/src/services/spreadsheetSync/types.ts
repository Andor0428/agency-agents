export interface SheetCatalogRow {
  name: string;
  brand?: string | null;
  sku?: string | null;
  barcode?: string | null;
  color?: string | null;
  size?: string | null;
  category?: string | null;
  storage_location?: string;
  base_unit?: string;
  display_unit?: string;
  container_size?: number;
  par_level?: number;
  aliases?: string[];
}

export interface SpreadsheetRowUpdate {
  itemName: string;
  quantity: number;
  auditTrail: string;
}

export interface SpreadsheetConflict {
  itemName: string;
  sheetQuantity: number | null;
  localQuantity: number;
}

export interface SpreadsheetSyncResult {
  updated: number;
  appended: number;
  conflicts: SpreadsheetConflict[];
}

export interface SpreadsheetSyncService {
  writeTotals(updates: SpreadsheetRowUpdate[]): Promise<SpreadsheetSyncResult>;
  pullCatalog?(): Promise<Array<Record<string, string>>>;
  readCatalogRows?(): Promise<string[][]>;
}

export interface FlushSyncResult {
  processed: number;
  completed: number;
  failed: number;
  conflicts: SpreadsheetConflict[];
  error?: string;
}
