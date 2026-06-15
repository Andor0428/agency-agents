import { matchRetailItem } from '@/services/matcher/retailMatch';
import type { MatchableCatalogEntry } from '@/services/matcher';

const catalog: MatchableCatalogEntry[] = [
  {
    item: {
      id: '1',
      name: "Levi's 501 Original Fit",
      brand: "Levi's",
      category: 'denim',
      sku: 'LEV-501-BLU-32',
      color: 'Blue',
      size: '32',
      storage_location: 'floor',
      base_unit: 'each',
      display_unit: 'unit',
      container_size: null,
      is_batch: false,
      is_active: true,
      par_level: null,
      fill_granularity: 1,
      created_at: '',
      updated_at: '',
    },
    aliases: [{ id: 'a1', item_id: '1', alias_text: 'Levi 501 blue 32' }],
  },
  {
    item: {
      id: '2',
      name: "Levi's 501 Original Fit",
      brand: "Levi's",
      category: 'denim',
      sku: 'LEV-501-BLU-34',
      color: 'Blue',
      size: '34',
      storage_location: 'floor',
      base_unit: 'each',
      display_unit: 'unit',
      container_size: null,
      is_batch: false,
      is_active: true,
      par_level: null,
      fill_granularity: 1,
      created_at: '',
      updated_at: '',
    },
    aliases: [],
  },
];

describe('matchRetailItem', () => {
  it('matches SKU exactly', () => {
    const result = matchRetailItem(
      { name: 'unknown', quantity: 2, sku: 'LEV-501-BLU-32' },
      catalog
    );
    expect(result.best?.itemId).toBe('1');
    expect(result.best?.matchedVia).toBe('sku');
  });

  it('narrows variants by color and size', () => {
    const result = matchRetailItem(
      { name: 'Levi 501', quantity: 5, color: 'blue', size: '34' },
      catalog
    );
    expect(result.best?.itemId).toBe('2');
  });
});
