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
}

export interface FlushSyncResult {
  processed: number;
  completed: number;
  failed: number;
  conflicts: SpreadsheetConflict[];
  error?: string;
}
