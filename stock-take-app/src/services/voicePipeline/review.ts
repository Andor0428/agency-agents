import type { Repositories } from '@/services/db/repositories';
import type { PipelineCountItem } from '@/services/voicePipeline/types';
import type { Item } from '@/types';
import { loadSettings } from '@/config/settings';
import { retailNeedsVariantReview } from '@/services/matcher/retailMatch';
import type { MatchableCatalogEntry } from '@/services/matcher';

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
  pending: PipelineCountItem,
  catalog?: MatchableCatalogEntry[]
): Promise<boolean> {
  if (pending.skipped) return false;
  if (pending.needsConfirmation) return true;

  const settings = await loadSettings();
  if (settings.businessType === 'retail' && catalog) {
    const variantAmbiguous = retailNeedsVariantReview(
      {
        name: pending.parsedName,
        quantity: pending.quantity,
        color: pending.parsedColor,
        size: pending.parsedSize,
        sku: pending.parsedSku,
      },
      pending.match,
      catalog
    );
    if (variantAmbiguous) return true;
  }

  const item = await resolvePendingItem(repos, pending);
  if (settings.businessType === 'hospitality') {
    return item?.is_batch ?? false;
  }
  return false;
}

export async function findFirstReviewIndex(
  repos: Repositories,
  items: PipelineCountItem[],
  startAt = 0,
  catalog?: MatchableCatalogEntry[]
): Promise<number> {
  for (let i = startAt; i < items.length; i++) {
    if (await pendingNeedsReview(repos, items[i], catalog)) {
      return i;
    }
  }
  return -1;
}
