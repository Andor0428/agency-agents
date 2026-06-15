import type { Item, RecipeWithComponents } from '@/types';
import {
  explodeBatchRecipe,
  mergeBomComponents,
  type BomComponent,
  type BomExplosionInput,
} from '@/services/business';
import type { Repositories } from '@/services/db/repositories';

export async function buildBomExplosionInput(
  repos: Repositories,
  batchItem: Item,
  recipe: RecipeWithComponents,
  visited: Set<string> = new Set()
): Promise<BomExplosionInput> {
  if (visited.has(batchItem.id)) {
    throw new Error(`Circular recipe detected for ${batchItem.name}`);
  }
  visited.add(batchItem.id);

  const components = await Promise.all(
    recipe.components.map(async (component) => {
      const componentItem = await repos.items.getById(component.component_item_id);
      if (!componentItem) {
      return {
        componentItemId: component.component_item_id,
        componentItemName: component.component_name ?? 'Unknown',
        qty: component.qty,
        unit: component.unit,
        isBatch: false,
      };
      }

      let nestedRecipe: BomExplosionInput | undefined;
      if (componentItem.is_batch) {
        const nested = await repos.recipes.getCurrent(componentItem.id);
        if (nested) {
          nestedRecipe = await buildBomExplosionInput(repos, componentItem, nested, visited);
        }
      }

      return {
        componentItemId: componentItem.id,
        componentItemName: componentItem.name,
        qty: component.qty,
        unit: component.unit,
        isBatch: componentItem.is_batch,
        nestedRecipe,
      };
    })
  );

  return {
    batchItemId: batchItem.id,
    batchItemName: batchItem.name,
    fillLevel: 1,
    containerSize: batchItem.container_size ?? 750,
    yieldPct: recipe.yield_pct,
    components,
  };
}

export async function explodeBatchCount(
  repos: Repositories,
  batchItem: Item,
  fillLevel: number
): Promise<BomComponent[]> {
  const recipe = await repos.recipes.getCurrent(batchItem.id);
  if (!recipe || recipe.components.length === 0) {
    return [];
  }

  const input = await buildBomExplosionInput(repos, batchItem, recipe);
  const components = explodeBatchRecipe({ ...input, fillLevel });
  return mergeBomComponents(components);
}
