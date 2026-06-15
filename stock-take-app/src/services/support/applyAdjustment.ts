import type { Repositories } from '@/services/db/repositories';
import { triggerBackgroundSync } from '@/services/spreadsheetSync/flush';

export type SupportAdjustmentInput = {
  countSessionId: string;
  itemId: string;
  itemName: string;
  currentQty: number;
  proposedQty: number;
  changeRequestId: string;
};

export async function applySupportAdjustment(
  repos: Repositories,
  input: SupportAdjustmentInput
): Promise<{ applied: boolean; delta: number }> {
  const item = await repos.items.getById(input.itemId);
  if (!item) {
    throw new Error(`Item not found: ${input.itemName}`);
  }

  const session = await repos.sessions.getById(input.countSessionId);
  if (!session) {
    throw new Error('Count session not found');
  }

  const totals = await repos.countEvents.getSessionTotals(input.countSessionId);
  const actualCurrent =
    totals.find((row) => row.item_id === input.itemId)?.total_qty ?? 0;
  const delta = input.proposedQty - actualCurrent;

  if (delta === 0) {
    return { applied: false, delta: 0 };
  }

  const transcript = `Support adjustment (approved ${input.changeRequestId.slice(0, 8)}): ${actualCurrent} → ${input.proposedQty}`;

  const event = await repos.countEvents.create({
    sessionId: input.countSessionId,
    itemId: input.itemId,
    qty: delta,
    fillLevel: null,
    rawTranscript: transcript,
    confidenceScore: 100,
  });

  await repos.syncQueue.enqueue('count_event', {
    sessionId: input.countSessionId,
    itemId: input.itemId,
    itemName: item.name,
    qty: delta,
    fill_level: null,
    raw_transcript: transcript,
    eventId: event.id,
    supportAdjustment: true,
    changeRequestId: input.changeRequestId,
  });

  void triggerBackgroundSync();
  return { applied: true, delta };
}
