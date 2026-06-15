import type { Repositories } from '@/services/db/repositories';
import type { PipelineCountItem } from '@/services/voicePipeline/types';
import type { Item } from '@/types';

export async function resolvePendingItem(
  repos: Repositories,
  pending: PipelineCountItem
): Promise<Item | null> {
  const itemId = pending.selectedItemId ?? pending.match.best?.itemId;
  if (!itemId) return null;
  return repos.items.getById(itemId);
}

export async function pendingNeedsReview(
  repos: Repositories,
  pending: PipelineCountItem
): Promise<boolean> {
  if (pending.skipped) return false;
  if (pending.needsConfirmation) return true;
  const item = await resolvePendingItem(repos, pending);
  return item?.is_batch ?? false;
}

export async function findFirstReviewIndex(
  repos: Repositories,
  items: PipelineCountItem[],
  startAt = 0
): Promise<number> {
  for (let i = startAt; i < items.length; i++) {
    if (await pendingNeedsReview(repos, items[i])) {
      return i;
    }
  }
  return -1;
}
