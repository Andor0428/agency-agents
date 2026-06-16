import { PARSED_UTTERANCE_JSON_SCHEMA } from '@/services/parser/types';

describe('PARSED_UTTERANCE_JSON_SCHEMA', () => {
  it('includes unit in required fields for OpenAI strict JSON schema', () => {
    const itemSchema = PARSED_UTTERANCE_JSON_SCHEMA.properties.items.items;
    expect(itemSchema.required).toEqual(['name', 'quantity', 'unit']);
    expect(itemSchema.properties.unit).toEqual({ type: ['string', 'null'] });
  });
});
