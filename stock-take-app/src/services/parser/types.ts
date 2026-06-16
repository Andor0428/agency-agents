import type { ParsedUtterance } from '@/types';

export interface ParserService {
  parse(transcript: string, catalogNames: string[]): Promise<ParsedUtterance>;
}

const nullableString = { type: ['string', 'null'] as const };

const itemProperties = {
  name: { type: 'string' },
  quantity: { type: 'number' },
  unit: nullableString,
} as const;

const retailItemProperties = {
  name: { type: 'string' },
  quantity: { type: 'number' },
  unit: nullableString,
  color: nullableString,
  size: nullableString,
  sku: nullableString,
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

export const PARSED_UTTERANCE_RETAIL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: retailItemProperties,
        required: ['name', 'quantity', 'unit', 'color', 'size', 'sku'],
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
  color?: string | null;
  size?: string | null;
  sku?: string | null;
};

export function normalizeParsedUtterance(raw: { items: RawParsedItem[] }): ParsedUtterance {
  return {
    items: raw.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      ...(item.unit ? { unit: item.unit } : {}),
      ...(item.color ? { color: item.color } : {}),
      ...(item.size ? { size: item.size } : {}),
      ...(item.sku ? { sku: item.sku } : {}),
    })),
  };
}
