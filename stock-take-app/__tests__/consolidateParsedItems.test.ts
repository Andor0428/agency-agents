import { consolidateParsedItems } from '@/services/voicePipeline/consolidateParsedItems';
import type { MatchableCatalogEntry } from '@/services/matcher';

const catalog: MatchableCatalogEntry[] = [
  {
    item: {
      id: '1',
      name: 'Carpano Antica Formula',
      category: 'vermouth',
      storage_location: 'bar',
      base_unit: 'ml',
      display_unit: 'bottle',
      container_size: 1000,
      is_batch: false,
      is_active: true,
      par_level: null,
      fill_granularity: 0.1,
      created_at: '',
      updated_at: '',
    },
    aliases: [{ id: 'a1', item_id: '1', alias_text: 'Carpano' }],
  },
];

describe('consolidateParsedItems', () => {
  it('collapses Whisper stutter duplicates to one item', () => {
    const result = consolidateParsedItems(
      [
        { name: 'Carpano', quantity: 2 },
        { name: 'Carpano', quantity: 3 },
        { name: 'Cp', quantity: 1 },
      ],
      catalog
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Carpano Antica Formula');
    expect(result[0].quantity).toBe(2);
  });
});
