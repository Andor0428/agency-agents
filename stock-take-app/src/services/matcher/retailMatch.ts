import type { Alias, Item, MatchCandidate, MatchResult, ParsedUtteranceItem } from '@/types';
import { matchItemName, type MatchableCatalogEntry } from './index';

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

const COLOR_ALIASES: Record<string, string[]> = {
  black: ['black', 'blk'],
  white: ['white', 'wht'],
  blue: ['blue', 'blu', 'navy'],
  grey: ['grey', 'gray', 'gry'],
  red: ['red'],
  green: ['green', 'grn'],
  tan: ['tan', 'khaki'],
  brown: ['brown', 'brn'],
};

function colorMatches(itemColor: string | null | undefined, spoken: string | undefined): boolean {
  if (!spoken?.trim()) return true;
  if (!itemColor) return false;
  const spokenNorm = normalizeToken(spoken);
  const itemNorm = normalizeToken(itemColor);
  if (itemNorm.includes(spokenNorm) || spokenNorm.includes(itemNorm)) return true;

  for (const [, aliases] of Object.entries(COLOR_ALIASES)) {
    if (aliases.includes(spokenNorm) && aliases.some((a) => itemNorm.includes(a))) {
      return true;
    }
  }
  return false;
}

function sizeMatches(itemSize: string | null | undefined, spoken: string | undefined): boolean {
  if (!spoken?.trim()) return true;
  if (!itemSize) return false;
  const spokenNorm = normalizeToken(spoken);
  const itemNorm = normalizeToken(itemSize);
  if (itemNorm === spokenNorm) return true;

  const sizeWords: Record<string, string> = {
    small: 's',
    medium: 'm',
    large: 'l',
    extralarge: 'xl',
  };
  const mapped = sizeWords[spokenNorm] ?? spokenNorm;
  return itemNorm === mapped || itemNorm.includes(mapped);
}

function findEntry(catalog: MatchableCatalogEntry[], itemId: string): MatchableCatalogEntry | undefined {
  return catalog.find((entry) => entry.item.id === itemId);
}

function filterCandidatesByVariant(
  candidates: MatchCandidate[],
  catalog: MatchableCatalogEntry[],
  color?: string,
  size?: string
): MatchCandidate[] {
  return candidates.filter((candidate) => {
    const entry = findEntry(catalog, candidate.itemId);
    if (!entry) return false;
    return colorMatches(entry.item.color, color) && sizeMatches(entry.item.size, size);
  });
}

export function matchRetailItem(
  parsed: ParsedUtteranceItem,
  catalog: MatchableCatalogEntry[]
): MatchResult {
  if (parsed.sku?.trim()) {
    const sku = parsed.sku.trim();
    const entry = catalog.find(
      (e) => e.item.sku && normalizeToken(e.item.sku) === normalizeToken(sku)
    );
    if (entry) {
      const best: MatchCandidate = {
        itemId: entry.item.id,
        itemName: entry.item.name,
        score: 100,
        matchedVia: 'sku',
        matchedText: entry.item.sku ?? sku,
      };
      return { query: parsed.name, best, runnersUp: [], scoreGap: 100 };
    }
  }

  const base = matchItemName(parsed.name, catalog);
  const pool = [base.best, ...base.runnersUp].filter((c): c is MatchCandidate => c != null);
  const filtered = filterCandidatesByVariant(pool, catalog, parsed.color, parsed.size);

  if (filtered.length > 0) {
    const best = filtered[0];
    const runnersUp = filtered.slice(1, 4);
    const scoreGap = best && runnersUp[0] ? best.score - runnersUp[0].score : 100;
    return { query: parsed.name, best, runnersUp, scoreGap };
  }

  return base;
}

export function retailNeedsVariantReview(
  parsed: ParsedUtteranceItem,
  result: MatchResult,
  catalog: MatchableCatalogEntry[]
): boolean {
  if (!parsed.color && !parsed.size) {
    const pool = [result.best, ...result.runnersUp].filter((c): c is MatchCandidate => c != null);
    const names = new Set(pool.map((c) => findEntry(catalog, c.itemId)?.item.name));
    return names.size > 1;
  }

  const pool = [result.best, ...result.runnersUp].filter((c): c is MatchCandidate => c != null);
  const filtered = filterCandidatesByVariant(pool, catalog, parsed.color, parsed.size);
  return filtered.length > 1;
}
