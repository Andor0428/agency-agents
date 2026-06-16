import { matchItemName, type MatchableCatalogEntry } from '@/services/matcher';
import { normalizeSpokenProductName } from '@/services/parser/spokenName';
import type { ParsedUtterance } from '@/types';

/** Common Whisper mis-hearings for spoken quantities. */
const QUANTITY_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  won: 1,
  two: 2,
  to: 2,
  too: 2,
  tu: 2,
  three: 3,
  tree: 3,
  four: 4,
  for: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  ate: 8,
  nine: 9,
  ten: 10,
};

const FALLBACK_MATCH_THRESHOLD = 50;

function peelQuantity(text: string): { quantity: number; namePart: string } {
  const trimmed = text.trim();
  if (!trimmed) return { quantity: 1, namePart: '' };

  const trailingDigit = trimmed.match(/(\d+(?:\.\d+)?)\s*$/);
  if (trailingDigit && trailingDigit.index !== undefined) {
    return {
      quantity: Number(trailingDigit[1]),
      namePart: trimmed.slice(0, trailingDigit.index).trim(),
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { quantity: 1, namePart: trimmed };

  const first = words[0].toLowerCase();
  if (words.length > 1 && QUANTITY_WORDS[first] !== undefined) {
    return {
      quantity: QUANTITY_WORDS[first],
      namePart: words.slice(1).join(' '),
    };
  }

  const last = words[words.length - 1].toLowerCase();
  if (QUANTITY_WORDS[last] !== undefined) {
    return {
      quantity: QUANTITY_WORDS[last],
      namePart: words.slice(0, -1).join(' '),
    };
  }

  if (trimmed.toLowerCase().includes('point six')) {
    return { quantity: 0.6, namePart: trimmed.replace(/point six/gi, '').trim() };
  }

  return { quantity: 1, namePart: trimmed };
}

function bestCatalogName(rawName: string, catalog: MatchableCatalogEntry[]): string {
  const cleaned = normalizeSpokenProductName(rawName);
  if (!cleaned) return rawName.trim();

  const match = matchItemName(cleaned, catalog);
  if (match.best && match.best.score >= FALLBACK_MATCH_THRESHOLD) {
    return match.best.itemName;
  }

  return cleaned;
}

function parsePart(part: string, catalog: MatchableCatalogEntry[]): ParsedUtterance['items'][0] | null {
  const { quantity, namePart } = peelQuantity(part);
  const resolvedName = bestCatalogName(namePart, catalog);
  if (!resolvedName || resolvedName === 'Unknown') return null;

  return { name: resolvedName, quantity };
}

/**
 * When GPT parse returns nothing, recover from noisy Whisper text using
 * quantity homophones + fuzzy catalog matching (e.g. "Bravader Tu" → Belvedere 2).
 */
export function fallbackParseTranscript(
  transcript: string,
  catalog: MatchableCatalogEntry[]
): ParsedUtterance {
  const parts = transcript
    .split(/\s+and\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);

  const segments = parts.length > 1 ? parts : [transcript.replace(/,/g, ' ').trim()];
  const items: ParsedUtterance['items'] = [];

  for (const segment of segments) {
    const item = parsePart(segment, catalog);
    if (item) items.push(item);
  }

  return { items };
}
