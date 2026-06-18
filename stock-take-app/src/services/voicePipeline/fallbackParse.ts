import { matchItemNameLoose, type MatchableCatalogEntry } from '@/services/matcher';
import {
  normalizeSpokenProductName,
  normalizeTranscriptText,
} from '@/services/parser/spokenName';
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

const LOOSE_MATCH_THRESHOLD = 45;

function parseQuantityWord(word: string): number | undefined {
  return QUANTITY_WORDS[word.toLowerCase()];
}

function peelQuantity(text: string): { quantity: number; namePart: string } {
  const trimmed = normalizeTranscriptText(text);
  if (!trimmed) return { quantity: 1, namePart: '' };

  const commaForm = trimmed.match(/^(.+?),\s*([a-z0-9]+)\s*$/i);
  if (commaForm) {
    const qty = parseQuantityWord(commaForm[2]);
    if (qty !== undefined) {
      return { quantity: qty, namePart: commaForm[1].trim() };
    }
  }

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

function bestCatalogName(rawName: string, catalog: MatchableCatalogEntry[]): string | null {
  const cleaned = normalizeSpokenProductName(rawName);
  if (!cleaned || cleaned.length < 2) return null;

  const match = matchItemNameLoose(cleaned, catalog);
  if (match.best && match.best.score >= LOOSE_MATCH_THRESHOLD) {
    return match.best.itemName;
  }

  return null;
}

function parsePart(part: string, catalog: MatchableCatalogEntry[]): ParsedUtterance['items'][0] | null {
  const { quantity, namePart } = peelQuantity(part);
  const resolvedName = bestCatalogName(namePart, catalog);
  if (!resolvedName) return null;

  return { name: resolvedName, quantity };
}

/**
 * When GPT parse returns nothing, recover from noisy Whisper text using
 * quantity homophones + loose catalog matching (e.g. "Beber there, one" → Belvedere 1).
 */
export function fallbackParseTranscript(
  transcript: string,
  catalog: MatchableCatalogEntry[]
): ParsedUtterance {
  const normalized = normalizeTranscriptText(transcript);
  const parts = normalized
    .split(/\s+and\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);

  const segments = parts.length > 1 ? parts : [normalized];
  const items: ParsedUtterance['items'] = [];

  for (const segment of segments) {
    const item = parsePart(segment, catalog);
    if (item) items.push(item);
  }

  if (items.length === 0 && normalized.length >= 3) {
    const whole = parsePart(normalized, catalog);
    if (whole) items.push(whole);
  }

  return { items };
}
