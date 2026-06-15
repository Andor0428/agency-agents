import type { Repositories } from '../repositories';
import { TOP_100_SPIRITS } from './spirits';

export async function seedDefaultCatalog(repos: Repositories): Promise<number> {
  const existing = await repos.items.count();
  if (existing > 0) {
    return 0;
  }

  const createdItems = await repos.items.createMany(
    TOP_100_SPIRITS.map((spirit) => ({
      name: spirit.name,
      category: spirit.category,
      container_size: spirit.container_size ?? 750,
      display_unit: 'bottle',
      base_unit: 'ml' as const,
      storage_location: 'bar' as const,
    }))
  );

  const aliasEntries: Array<{ itemId: string; aliasText: string }> = [];
  for (let i = 0; i < TOP_100_SPIRITS.length; i++) {
    const spirit = TOP_100_SPIRITS[i];
    const item = createdItems[i];
    for (const alias of spirit.aliases ?? []) {
      aliasEntries.push({ itemId: item.id, aliasText: alias });
    }
  }

  if (aliasEntries.length > 0) {
    await repos.aliases.createMany(aliasEntries);
  }

  return createdItems.length;
}

export async function reseedCatalog(repos: Repositories): Promise<number> {
  const items = await repos.items.getAll();
  for (const item of items) {
    await repos.items.delete(item.id);
  }
  return seedDefaultCatalog(repos);
}
