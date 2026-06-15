import type { ParsedUtterance } from '@/types';

export interface ParserService {
  parse(transcript: string, catalogNames: string[]): Promise<ParsedUtterance>;
}

const itemProperties = {
  name: { type: 'string' },
  quantity: { type: 'number' },
  unit: { type: 'string' },
} as const;

const retailItemProperties = {
  ...itemProperties,
  color: { type: 'string' },
  size: { type: 'string' },
  sku: { type: 'string' },
} as const;

export const PARSED_UTTERANCE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: itemProperties,
        required: ['name', 'quantity'],
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
        required: ['name', 'quantity'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const;
