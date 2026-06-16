export type StockCleaningSeverity = 'warning' | 'error';

export type FlagReason = 'missing_quantity' | 'missing_product' | 'ambiguous' | 'merged_duplicate';

export interface ParsedStockItem {
  lineNumber: number;
  product: string;
  quantity: number | null;
  unit: string | null;
  raw: string;
  normalizedProduct: string;
}

export interface FlaggedStockItem {
  item: ParsedStockItem;
  reason: FlagReason;
  severity: StockCleaningSeverity;
  message: string;
}

export interface MergedDuplicateEntry {
  product: string;
  quantity: number | null;
  unit: string | null;
  mergedCount: number;
  sourceLines: number[];
}

export interface StockCleaningResult {
  cleanList: ParsedStockItem[];
  flaggedItems: FlaggedStockItem[];
  mergedDuplicates: MergedDuplicateEntry[];
}

export interface StockCleaningOptions {
  spellingCorrections?: Record<string, string>;
}
