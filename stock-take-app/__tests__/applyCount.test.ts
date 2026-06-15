jest.mock('@/services/spreadsheetSync/flush', () => ({
  triggerBackgroundSync: jest.fn().mockResolvedValue(null),
}));

import { computeCountValues } from '@/services/voicePipeline/apply';
import type { Item } from '@/types';

const belvedere: Item = {
  id: 'item-belvedere',
  name: 'Belvedere',
  category: 'vodka',
  storage_location: 'bar',
  base_unit: 'ml',
  display_unit: 'bottle',
  container_size: 750,
  is_batch: false,
  is_active: true,
  par_level: 6,
  fill_granularity: 0.1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const trailblazer: Item = {
  ...belvedere,
  id: 'item-trailblazer',
  name: 'Trailblazer',
  is_batch: true,
};

describe('computeCountValues', () => {
  it('stores spoken quantity for regular items', () => {
    const result = computeCountValues(belvedere, 2);
    expect(result.qty).toBe(2);
    expect(result.fill_level).toBeNull();
  });

  it('converts batch fill level to volume', () => {
    const result = computeCountValues(trailblazer, 0.6);
    expect(result.fill_level).toBeCloseTo(0.6, 5);
    expect(result.qty).toBeCloseTo(450, 5);
  });

  it('snaps fill level to item granularity', () => {
    const result = computeCountValues(trailblazer, 0.63);
    expect(result.fill_level).toBeCloseTo(0.6, 5);
    expect(result.qty).toBeCloseTo(450, 5);
  });
});
