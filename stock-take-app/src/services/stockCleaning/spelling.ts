import { TOP_100_SPIRITS } from '@/services/db/seed/spirits';

const MANUAL_CORRECTIONS: Record<string, string> = {
  'johnny walker': 'Johnnie Walker',
  'johnny walker red': 'Johnnie Walker Red Label',
  'johnny walker black': 'Johnnie Walker Black Label',
  mcallen: 'Macallan',
  'mac allen': 'Macallan',
  'macallan 12': 'Macallan 12',
  bellvedere: 'Belvedere',
  tankeray: 'Tanqueray',
  titos: "Tito's Handmade Vodka",
  'jack daniels': "Jack Daniel's",
  'makers mark': "Maker's Mark",
  hendricks: "Hendrick's Gin",
  'basil haydens': "Basil Hayden's",
  'angels envy': "Angel's Envy",
};

function buildSpellingMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const [alias, canonical] of Object.entries(MANUAL_CORRECTIONS)) {
    map.set(alias.toLowerCase(), canonical);
  }

  for (const spirit of TOP_100_SPIRITS) {
    map.set(spirit.name.toLowerCase(), spirit.name);
    for (const alias of spirit.aliases ?? []) {
      map.set(alias.toLowerCase(), spirit.name);
    }
  }

  return map;
}

const SPELLING_MAP = buildSpellingMap();

export function getSpellingCorrections(
  overrides?: Record<string, string>
): Map<string, string> {
  if (!overrides || Object.keys(overrides).length === 0) {
    return SPELLING_MAP;
  }

  const merged = new Map(SPELLING_MAP);
  for (const [alias, canonical] of Object.entries(overrides)) {
    merged.set(alias.toLowerCase(), canonical);
  }
  return merged;
}

export interface SpellingResult {
  normalized: string;
  ambiguous: boolean;
  candidates: string[];
}

export function normalizeSpelling(
  product: string,
  corrections: Map<string, string>
): SpellingResult {
  const trimmed = product.trim().replace(/\s+/g, ' ');
  const lower = trimmed.toLowerCase();

  const exact = corrections.get(lower);
  if (exact) {
    return { normalized: exact, ambiguous: false, candidates: [exact] };
  }

  const candidates = new Set<string>();
  for (const [alias, canonical] of corrections.entries()) {
    if (lower === alias || lower.includes(alias) || alias.includes(lower)) {
      if (alias.length >= 3 || lower === alias) {
        candidates.add(canonical);
      }
    }
  }

  if (candidates.size === 1) {
    return { normalized: [...candidates][0], ambiguous: false, candidates: [...candidates] };
  }

  if (candidates.size > 1) {
    return { normalized: trimmed, ambiguous: true, candidates: [...candidates] };
  }

  return { normalized: trimmed, ambiguous: false, candidates: [] };
}
