import { matchItemName, needsConfirmation } from '@/services/matcher';
import {
  computeSessionTotal,
  explodeBatchRecipe,
  fillLevelToVolume,
  formatAuditTrail,
  snapFillLevel,
} from '@/services/business';
import type { Alias, CountEvent, Item } from '@/types';

const belvedere: Item = {
  id: 'item-belvedere',
  name: 'Belvedere',
  category: 'spirits',
  storage_location: 'bar',
  base_unit: 'ml',
  display_unit: 'bottle',
  container_size: 750,
  is_batch: false,
  is_active: true,
  par_level: 6,
  fill_granularity: 0.1,
  sku: null,
  brand: null,
  color: null,
  size: null,
  barcode: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const trailblazer: Item = {
  ...belvedere,
  id: 'item-trailblazer',
  name: 'Trailblazer',
  is_batch: true,
  container_size: 750,
  fill_granularity: 0.1,
};

const alias: Alias = { id: 'alias-1', item_id: belvedere.id, alias_text: 'Bel' };

describe('matcher', () => {
  it('matches Belvedere from phonetic mishear "Bell of dear"', () => {
    const result = matchItemName('Bell of dear', [{ item: belvedere, aliases: [alias] }]);
    expect(result.best?.itemName).toBe('Belvedere');
    expect(result.best?.score).toBeGreaterThanOrEqual(60);
  });

  it('flags low-confidence matches for confirmation', () => {
    const result = matchItemName('xyz unknown', [{ item: belvedere, aliases: [] }]);
    expect(needsConfirmation(result, 80, 10)).toBe(true);
  });
});

describe('additive totals', () => {
  const events: CountEvent[] = [
    {
      id: '1',
      session_id: 's1',
      item_id: belvedere.id,
      qty: 2,
      fill_level: null,
      raw_transcript: 'Belvedere 2',
      recipe_version: null,
      confidence_score: 95,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      session_id: 's1',
      item_id: belvedere.id,
      qty: 1,
      fill_level: null,
      raw_transcript: 'Belvedere 1',
      recipe_version: null,
      confidence_score: 95,
      created_at: '2026-01-01T00:01:00Z',
    },
  ];

  it('sums count events additively', () => {
    expect(computeSessionTotal(events)).toBe(3);
    expect(formatAuditTrail(events, belvedere)).toBe('2 + 1 = 3');
  });
});

describe('fill level', () => {
  it('converts fractional fill to volume', () => {
    expect(fillLevelToVolume(0.6, 750)).toBe(450);
    expect(snapFillLevel(0.63, 0.1)).toBeCloseTo(0.6, 5);
  });
});

describe('BOM explosion', () => {
  it('explodes batch fill into ingredient volumes', () => {
    const components = explodeBatchRecipe({
      batchItemId: trailblazer.id,
      batchItemName: 'Trailblazer',
      fillLevel: 0.6,
      containerSize: 750,
      yieldPct: 100,
      components: [
        {
          componentItemId: belvedere.id,
          componentItemName: 'Belvedere',
          qty: 400,
          unit: 'ml',
          isBatch: false,
        },
        {
          componentItemId: 'puree',
          componentItemName: 'Puree',
          qty: 200,
          unit: 'ml',
          isBatch: false,
        },
        {
          componentItemId: 'syrup',
          componentItemName: 'Syrup',
          qty: 150,
          unit: 'ml',
          isBatch: false,
        },
      ],
    });

    const byName = Object.fromEntries(components.map((c) => [c.itemName, c.qty]));
    expect(byName.Belvedere).toBeCloseTo(240, 0);
    expect(byName.Puree).toBeCloseTo(120, 0);
    expect(byName.Syrup).toBeCloseTo(90, 0);
  });
});
