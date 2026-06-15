import type { BaseUnit, StorageLocation } from '@/types';
import type { CreateItemInput } from '@/services/db/repositories/items';

export type VoiceAddParseResult = Partial<CreateItemInput> & {
  name?: string;
};

const CATEGORIES = [
  'vodka', 'gin', 'whiskey', 'bourbon', 'scotch', 'rum', 'tequila', 'mezcal',
  'liqueur', 'cognac', 'vermouth', 'aperitif', 'bitters', 'wine', 'beer', 'batch',
];

const DISPLAY_UNITS = ['bottle', 'bottles', 'can', 'cans', 'keg', 'kegs', 'bag', 'bags', 'unit', 'units', 'batch'];
const LOCATIONS: StorageLocation[] = ['bar', 'cellar', 'kitchen', 'custom'];

function parseSizeToken(token: string): { container_size?: number; base_unit?: BaseUnit } {
  const match = token.match(/(\d+(?:\.\d+)?)\s*(ml|milliliters?|l|liters?|g|grams?|each)?/i);
  if (!match) return {};

  let container_size = Number(match[1]);
  const unitToken = (match[2] ?? 'ml').toLowerCase();

  if (unitToken.startsWith('l') && !unitToken.startsWith('lit')) {
    container_size *= 1000;
  }

  let base_unit: BaseUnit = 'ml';
  if (unitToken.startsWith('g')) base_unit = 'g';
  if (unitToken.startsWith('each')) base_unit = 'each';

  return { container_size, base_unit };
}

/**
 * Parses voice/text phrases like:
 * "new item, Hendrick's gin, 700ml, bottle"
 * "new item Tanqueray 750 ml bottle bar"
 */
export function parseVoiceAddTranscript(transcript: string): VoiceAddParseResult | null {
  const normalized = transcript.trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (!lower.startsWith('new item')) return null;

  let rest = normalized.slice('new item'.length).replace(/^[\s,:]+/, '');
  const parts = rest
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  let name = '';
  let container_size: number | undefined;
  let base_unit: BaseUnit | undefined;
  let display_unit: string | undefined;
  let storage_location: StorageLocation | undefined;
  let category: string | undefined;

  if (parts.length > 1) {
    name = parts[0];
    for (const part of parts.slice(1)) {
      const size = parseSizeToken(part);
      if (size.container_size != null) {
        container_size = size.container_size;
        base_unit = size.base_unit;
        continue;
      }

      const lowerPart = part.toLowerCase();
      const display = DISPLAY_UNITS.find((u) => lowerPart === u || lowerPart === `${u}s`);
      if (display) {
        display_unit = display.replace(/s$/, '');
        continue;
      }

      const loc = LOCATIONS.find((l) => lowerPart === l);
      if (loc) {
        storage_location = loc;
        continue;
      }

      const cat = CATEGORIES.find((c) => lowerPart === c);
      if (cat) {
        category = cat;
      }
    }
  } else {
    const sizeMatch = rest.match(/(\d+(?:\.\d+)?)\s*(ml|milliliters?|l|liters?|g|grams?|each)\b/i);
    if (sizeMatch) {
      const size = parseSizeToken(sizeMatch[0]);
      container_size = size.container_size;
      base_unit = size.base_unit;
      rest = rest.replace(sizeMatch[0], ' ').trim();
    }

    for (const unit of DISPLAY_UNITS) {
      const regex = new RegExp(`\\b${unit}\\b`, 'i');
      if (regex.test(rest)) {
        display_unit = unit.replace(/s$/, '');
        rest = rest.replace(regex, ' ').trim();
      }
    }

    for (const loc of LOCATIONS) {
      const regex = new RegExp(`\\b${loc}\\b`, 'i');
      if (regex.test(rest)) {
        storage_location = loc;
        rest = rest.replace(regex, ' ').trim();
      }
    }

    const trailingCategory = rest.match(
      new RegExp(`\\b(${CATEGORIES.join('|')})\\s*$`, 'i')
    );
    if (trailingCategory) {
      category = trailingCategory[1].toLowerCase();
      rest = rest.slice(0, trailingCategory.index).trim();
    }

    name = rest.replace(/\s+/g, ' ').trim();
  }

  if (!name) return null;

  return {
    name,
    category: category ?? null,
    storage_location,
    base_unit,
    display_unit,
    container_size,
  };
}
