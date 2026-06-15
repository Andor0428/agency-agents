import type { Repositories } from '../repositories';
import type { Item } from '@/types';

export async function seedDemoBatch(repos: Repositories, items: Item[]): Promise<void> {
  if (items.some((item) => item.name === 'Trailblazer' && item.is_batch)) {
    return;
  }

  const belvedere = items.find((item) => item.name === 'Belvedere');
  if (!belvedere) return;

  let puree = items.find((item) => item.name === 'House Puree');
  if (!puree) {
    puree = await repos.items.create({
      name: 'House Puree',
      category: 'batch',
      base_unit: 'ml',
      display_unit: 'ml',
      container_size: 1000,
    });
  }

  let syrup = items.find((item) => item.name === 'Simple Syrup');
  if (!syrup) {
    syrup = await repos.items.create({
      name: 'Simple Syrup',
      category: 'liqueur',
      base_unit: 'ml',
      display_unit: 'ml',
      container_size: 1000,
    });
  }

  const trailblazer = await repos.items.create({
    name: 'Trailblazer',
    category: 'batch',
    is_batch: true,
    container_size: 750,
    display_unit: 'batch',
    fill_granularity: 0.1,
  });

  await repos.containerSizes.create(trailblazer.id, 'Standard', 750, true);
  await repos.aliases.create(trailblazer.id, 'Trail blazer');

  await repos.recipes.createVersion(trailblazer.id, 100, [
    { componentItemId: belvedere.id, qty: 400, unit: 'ml' },
    { componentItemId: puree.id, qty: 200, unit: 'ml' },
    { componentItemId: syrup.id, qty: 150, unit: 'ml' },
  ]);
}
