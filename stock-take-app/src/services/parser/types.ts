import type { MatchableCatalogEntry } from '@/services/matcher';
import type { ParsedUtterance } from '@/types';

export interface ParserService {
  parse(transcript: string, catalog: MatchableCatalogEntry[]): Promise<ParsedUtterance>;
}

const nullableString = { type: ['string', 'null'] as const };

const itemProperties = {
  name: { type: 'string' },
  quantity: { type: 'number' },
  unit: nullableString,
} as const;

export const PARSED_UTTERANCE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: itemProperties,
        required: ['name', 'quantity', 'unit'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const;

type RawParsedItem = {
  name: string;
  quantity: number;
  unit?: string | null;
};

export function normalizeParsedUtterance(raw: { items: RawParsedItem[] }): ParsedUtterance {
  return {
    items: raw.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      ...(item.unit ? { unit: item.unit } : {}),
    })),
  };
}
