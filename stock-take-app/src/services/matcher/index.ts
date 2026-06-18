import { distance } from 'fastest-levenshtein';
import { doubleMetaphone } from 'double-metaphone';
import type { Alias, Item, MatchCandidate, MatchResult } from '@/types';

export interface MatchableCatalogEntry {
  item: Item;
  aliases: Alias[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function tokenSetRatio(a: string, b: string): number {
  const tokensA = new Set(normalize(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalize(b).split(' ').filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return (intersection / union) * 100;
}

function compact(text: string): string {
  return normalize(text).replace(/\s+/g, '');
}

function levenshteinRatio(a: string, b: string): number {
  const left = normalize(a);
  const right = normalize(b);
  if (!left.length && !right.length) return 100;
  const maxLen = Math.max(left.length, right.length);
  if (maxLen === 0) return 100;
  return (1 - distance(left, right) / maxLen) * 100;
}

function metaphoneCodes(text: string): [string, string] {
  return doubleMetaphone(compact(text) || normalize(text));
}

function phoneticRatio(a: string, b: string): number {
  const [aPrimary, aSecondary] = metaphoneCodes(a);
  const [bPrimary, bSecondary] = metaphoneCodes(b);
  if (!aPrimary || !bPrimary) return 0;
  if (aPrimary === bPrimary || aPrimary === bSecondary || aSecondary === bPrimary) {
    return 100;
  }
  return levenshteinRatio(aPrimary, bPrimary);
}

function blendedScore(query: string, candidate: string): number {
  const edit = Math.max(levenshteinRatio(query, candidate), levenshteinRatio(compact(query), compact(candidate)));
  const token = tokenSetRatio(query, candidate);
  const phonetic = phoneticRatio(query, candidate);
  const base = edit * 0.35 + token * 0.25 + phonetic * 0.4;
  if (phonetic >= 100) {
    return Math.max(base, 65);
  }
  return base;
}

function consonantSkeleton(text: string): string {
  return compact(text).replace(/[aeiou]/g, '');
}

/** Best edit score against sliding windows (handles "beber" ≈ "belvedere"). */
function substringWindowScore(query: string, candidate: string): number {
  const q = compact(query);
  const c = compact(candidate);
  if (!q.length || !c.length) return 0;

  let best = 0;
  const windowLen = Math.min(c.length, Math.max(q.length + 1, 4));
  for (let i = 0; i <= c.length - 3; i += 1) {
    const window = c.slice(i, i + windowLen);
    best = Math.max(best, levenshteinRatio(q, window));
  }
  return best;
}

function looseBlendedScore(query: string, candidate: string): number {
  const base = blendedScore(query, candidate);
  const skeleton = levenshteinRatio(consonantSkeleton(query), consonantSkeleton(candidate));
  const window = substringWindowScore(query, candidate);
  return Math.max(base, skeleton, window);
}

function scoreCandidateLoose(
  query: string,
  item: Item,
  matchedText: string,
  matchedVia: 'name' | 'alias' | 'sku'
): MatchCandidate {
  return {
    itemId: item.id,
    itemName: item.name,
    score: looseBlendedScore(query, matchedText),
    matchedVia,
    matchedText,
  };
}

/** Fuzzy match tuned for noisy Whisper text (lower bar, substring windows). */
export function matchItemNameLoose(
  query: string,
  catalog: MatchableCatalogEntry[]
): MatchResult {
  const candidates: MatchCandidate[] = [];

  for (const entry of catalog) {
    if (!entry.item.is_active) continue;

    candidates.push(scoreCandidateLoose(query, entry.item, entry.item.name, 'name'));
    for (const alias of entry.aliases) {
      candidates.push(scoreCandidateLoose(query, entry.item, alias.alias_text, 'alias'));
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const deduped: MatchCandidate[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.itemId)) continue;
    seen.add(candidate.itemId);
    deduped.push(candidate);
  }

  const best = deduped[0] ?? null;
  const runnersUp = deduped.slice(1, 4);
  const scoreGap = best && runnersUp[0] ? best.score - runnersUp[0].score : 100;

  return { query, best, runnersUp, scoreGap };
}

function scoreCandidate(
  query: string,
  item: Item,
  matchedText: string,
  matchedVia: 'name' | 'alias' | 'sku'
): MatchCandidate {
  return {
    itemId: item.id,
    itemName: item.name,
    score: blendedScore(query, matchedText),
    matchedVia,
    matchedText,
  };
}

export function matchItemName(
  query: string,
  catalog: MatchableCatalogEntry[]
): MatchResult {
  const candidates: MatchCandidate[] = [];

  for (const entry of catalog) {
    if (!entry.item.is_active) continue;

    candidates.push(scoreCandidate(query, entry.item, entry.item.name, 'name'));
    for (const alias of entry.aliases) {
      candidates.push(scoreCandidate(query, entry.item, alias.alias_text, 'alias'));
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const deduped: MatchCandidate[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.itemId)) continue;
    seen.add(candidate.itemId);
    deduped.push(candidate);
  }

  const best = deduped[0] ?? null;
  const runnersUp = deduped.slice(1, 4);
  const scoreGap = best && runnersUp[0] ? best.score - runnersUp[0].score : 100;

  return { query, best, runnersUp, scoreGap };
}

export function needsConfirmation(
  result: MatchResult,
  threshold = 80,
  minGap = 10
): boolean {
  if (!result.best) return true;
  return result.best.score < threshold || result.scoreGap < minGap;
}
