import { formatAuditTrail } from '@/services/business';
import { buildBomExplosionInput, explodeBatchCount } from '@/services/business/bomResolver';
import type { Item, RecipeWithComponents } from '@/types';

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

const recipe: RecipeWithComponents = {
  id: 'recipe-1',
  item_id: trailblazer.id,
  version: 1,
  yield_pct: 100,
  is_current: true,
  created_at: '2026-01-01T00:00:00Z',
  components: [
    {
      id: 'c1',
      recipe_id: 'recipe-1',
      component_item_id: belvedere.id,
      qty: 400,
      unit: 'ml',
      component_name: 'Belvedere',
    },
  ],
};

describe('formatAuditTrail batch display', () => {
  it('shows fill percentages for batch items', () => {
    const trail = formatAuditTrail(
      [
        {
          id: '1',
          session_id: 's1',
          item_id: trailblazer.id,
          qty: 450,
          fill_level: 0.6,
          raw_transcript: 'Trailblazer 0.6',
          recipe_version: 1,
          confidence_score: 90,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      trailblazer
    );
    expect(trail).toContain('60%');
    expect(trail).toContain('450ml');
  });
});

describe('buildBomExplosionInput', () => {
  it('builds explosion input from recipe', async () => {
    const repos = {
      items: {
        getById: async (id: string) => (id === belvedere.id ? belvedere : null),
      },
      recipes: {
        getCurrent: async () => null,
      },
    };

    const input = await buildBomExplosionInput(
      repos as never,
      trailblazer,
      recipe
    );

    expect(input.components).toHaveLength(1);
    expect(input.components[0].componentItemName).toBe('Belvedere');
  });
});
