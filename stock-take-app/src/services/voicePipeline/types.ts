import type { MatchResult } from '@/types';

export type PipelineCountItem = {
  key: string;
  parsedName: string;
  quantity: number;
  unit?: string;
  parsedColor?: string;
  parsedSize?: string;
  parsedSku?: string;
  match: MatchResult;
  needsConfirmation: boolean;
  selectedItemId?: string;
  quantityOverride?: number;
  fillLevelOverride?: number;
  skipped?: boolean;
};

export type VoicePipelineStage =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'parsing'
  | 'matching'
  | 'confirming'
  | 'applying'
  | 'error';

export function getEffectiveQuantity(item: PipelineCountItem): number {
  return item.quantityOverride ?? item.quantity;
}

export function getEffectiveFillLevel(item: PipelineCountItem, batchItem: { fill_granularity: number }): number | undefined {
  if (item.fillLevelOverride != null) return item.fillLevelOverride;
  const qty = getEffectiveQuantity(item);
  if (qty <= 1) return qty;
  return undefined;
}

export type VoicePipelineRunResult = {
  transcript: string;
  items: PipelineCountItem[];
  requiresConfirmation: boolean;
};
