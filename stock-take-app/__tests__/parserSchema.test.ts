import {
  normalizeParsedUtterance,
  PARSED_UTTERANCE_JSON_SCHEMA,
  PARSED_UTTERANCE_RETAIL_JSON_SCHEMA,
} from '@/services/parser/types';

describe('OpenAI parser schemas', () => {
  it('requires every hospitality item property for strict json_schema', () => {
    const itemSchema = PARSED_UTTERANCE_JSON_SCHEMA.properties.items.items;
    const propertyKeys = Object.keys(itemSchema.properties);
    expect(itemSchema.required).toEqual(expect.arrayContaining(propertyKeys));
    expect(propertyKeys).toContain('unit');
  });

  it('requires every retail item property for strict json_schema', () => {
    const itemSchema = PARSED_UTTERANCE_RETAIL_JSON_SCHEMA.properties.items.items;
    const propertyKeys = Object.keys(itemSchema.properties);
    expect(itemSchema.required).toEqual(expect.arrayContaining(propertyKeys));
  });
});

describe('normalizeParsedUtterance', () => {
  it('drops null optional fields', () => {
    const normalized = normalizeParsedUtterance({
      items: [{ name: 'Belvedere', quantity: 2, unit: null, color: null, size: null, sku: null }],
    });

    expect(normalized.items[0]).toEqual({ name: 'Belvedere', quantity: 2 });
  });
});
