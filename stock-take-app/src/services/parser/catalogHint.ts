import type { MatchableCatalogEntry } from '@/services/matcher';

const PARSER_CATALOG_MAX_CHARS = 2500;

export function buildParserCatalogHint(catalog: MatchableCatalogEntry[]): string {
  const lines: string[] = [];

  for (const entry of catalog) {
    if (!entry.item.is_active) continue;
    const aliases = entry.aliases.map((a) => a.alias_text).filter(Boolean);
    if (aliases.length > 0) {
      lines.push(`${entry.item.name} (also: ${aliases.join(', ')})`);
    } else {
      lines.push(entry.item.name);
    }
  }

  const full = lines.join('; ');
  if (full.length <= PARSER_CATALOG_MAX_CHARS) return full;

  const truncated = full.slice(0, PARSER_CATALOG_MAX_CHARS);
  const lastSep = truncated.lastIndexOf('; ');
  const body = lastSep > PARSER_CATALOG_MAX_CHARS * 0.6 ? truncated.slice(0, lastSep) : truncated;
  const omitted = lines.length - body.split('; ').length;
  return `${body}; …and ${Math.max(omitted, 1)} more catalog items`;
}

export function buildHospitalityParserPrompt(catalogHint: string): string {
  return [
    'You extract inventory counts from natural spoken stock-take phrases in British English (UK).',
    'The speaker uses UK accent and phrasing (e.g. "grey goose", "point six", "one and a half").',
    'People speak casually — they may not use exact catalog names or formal phrasing.',
    'Ignore filler and scene-setting words (e.g. "okay so", "I see", "on the shelf", "we have").',
    'Ignore words like bottle/case/unit unless they describe the measure; put measure words in unit when helpful.',
    'Extract ONLY spirits/products and their numeric quantity.',
    'Examples: "two grey goose" -> name "grey goose", quantity 2;',
    '"belvedere point six" -> name "belvedere", quantity 0.6;',
    '"one and a half tanqueray" -> name "tanqueray", quantity 1.5;',
    '"hendricks and two bacardi" -> two items.',
    'Return ONE item unless the speaker clearly said "and" between two different products.',
    'Ignore stuttered repeats and comma-separated duplicates in the transcript (e.g. "Carpano 2, Carpano 3" is one product).',
    'The name field should be the product/spirit as spoken — short, no numbers, no filler. Spelling does not need to match the catalog exactly.',
    'Speech-to-text often garbles names (e.g. "Bravader Tu" means Belvedere 2, "gray goose" means Grey Goose). Prefer UK spellings (grey, litre) when normalising. Use the catalog to infer the intended spirit and quantity even when the transcript spelling is wrong.',
    'If no quantity is stated, use 1. If no product is identifiable, return items: [].',
    `Catalog reference (for spelling hints only): ${catalogHint}`,
  ].join(' ');
}

export function buildRetailParserPrompt(catalogHint: string): string {
  return [
    'You extract retail inventory counts from natural spoken phrases.',
    'Ignore filler words. Extract product style/name, optional color, size, SKU, and whole-number quantity.',
    'The name field is what the person said — it does not need to match the catalog exactly.',
    `Catalog reference: ${catalogHint}`,
  ].join(' ');
}
