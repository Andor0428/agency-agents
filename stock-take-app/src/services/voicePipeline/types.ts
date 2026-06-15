import type { MatchResult } from '@/types';

export type PipelineCountItem = {
  key: string;
  parsedName: string;
  quantity: number;
  unit?: string;
  match: MatchResult;
  needsConfirmation: boolean;
  selectedItemId?: string;
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

export type VoicePipelineRunResult = {
  transcript: string;
  items: PipelineCountItem[];
  requiresConfirmation: boolean;
};
