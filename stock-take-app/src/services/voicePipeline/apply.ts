import type { Item, CountEvent } from '@/types';
import { fillLevelToVolume, snapFillLevel } from '@/services/business';
import type { Repositories } from '@/services/db/repositories';

export type ApplyCountInput = {
  sessionId: string;
  item: Item;
  spokenQuantity: number;
  rawTranscript: string;
  confidenceScore: number;
  fillLevelOverride?: number | null;
  recipeVersion?: number | null;
};

export function computeCountValues(
  item: Item,
  spokenQuantity: number,
  fillLevelOverride?: number | null
): { qty: number; fill_level: number | null } {
  if (item.is_batch) {
    const rawFill =
      fillLevelOverride != null
        ? fillLevelOverride
        : spokenQuantity <= 1
          ? spokenQuantity
          : spokenQuantity / (item.container_size || 1);
    const fill_level = snapFillLevel(Math.max(0, Math.min(1, rawFill)), item.fill_granularity);
    const qty = fillLevelToVolume(fill_level, item.container_size);
    return { qty, fill_level };
  }

  return { qty: spokenQuantity, fill_level: null };
}

export async function applyCount(
  repos: Repositories,
  input: ApplyCountInput
): Promise<CountEvent> {
  const { qty, fill_level } = computeCountValues(
    input.item,
    input.spokenQuantity,
    input.fillLevelOverride
  );

  const event = await repos.countEvents.create({
    sessionId: input.sessionId,
    itemId: input.item.id,
    qty,
    fillLevel: fill_level,
    rawTranscript: input.rawTranscript,
    recipeVersion: input.recipeVersion ?? null,
    confidenceScore: input.confidenceScore,
  });

  await repos.syncQueue.enqueue('count_event', {
    sessionId: input.sessionId,
    itemId: input.item.id,
    itemName: input.item.name,
    qty,
    fill_level,
    raw_transcript: input.rawTranscript,
    eventId: event.id,
  });

  return event;
}
