import type { ParsedUtterance } from '@/types';

export interface ParserService {
  parse(transcript: string, catalogNames: string[]): Promise<ParsedUtterance>;
}

export const PARSED_UTTERANCE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
        },
        required: ['name', 'quantity'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const;
