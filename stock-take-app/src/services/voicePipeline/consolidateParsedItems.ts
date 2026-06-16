import { matchItemNameLoose, type MatchableCatalogEntry } from '@/services/matcher';
import { normalizeSpokenProductName } from '@/services/parser/spokenName';
import type { ParsedUtterance } from '@/types';

const MIN_NAME_CHARS = 2;
const MIN_MATCH_SCORE = 40;

/**
 * Whisper often hallucinates comma-separated repeats ("Carpano 2, Carpano 3, Cp").
 * Keep one row per catalog item and drop junk fragments.
 */
export function consolidateParsedItems(
  items: ParsedUtterance['items'],
  catalog: MatchableCatalogEntry[]
): ParsedUtterance['items'] {
  const deduped = new Map<string, ParsedUtterance['items'][0]>();

  for (const item of items) {
    const name = normalizeSpokenProductName(item.name);
    if (name.length < MIN_NAME_CHARS) continue;

    const match = matchItemNameLoose(name, catalog);
    if (!match.best || match.best.score < MIN_MATCH_SCORE) continue;

    const key = match.best.itemId;
    if (!deduped.has(key)) {
      deduped.set(key, {
        ...item,
        name: match.best.itemName,
        quantity: item.quantity,
      });
    }
  }

  return [...deduped.values()];
}
