import type { AppSettings } from '@/types';
import { getVerticalProfile } from '@/config/vertical';
import type { Repositories } from '../repositories';
import { TOP_100_SPIRITS } from './spirits';
import { SAMPLE_RETAIL_CATALOG } from './retail';
import { seedDemoBatch } from './demoBatch';

export async function seedCatalogForVertical(
  repos: Repositories,
  settings: Pick<AppSettings, 'businessType' | 'retailSubType'>
): Promise<number> {
  const existing = await repos.items.count();
  if (existing > 0) {
    if (settings.businessType === 'hospitality') {
      const all = await repos.items.getAll();
      await seedDemoBatch(repos, all);
    }
    return 0;
  }

  const profile = getVerticalProfile(settings);

  if (settings.businessType === 'retail') {
    const createdItems = await repos.items.createMany(
      SAMPLE_RETAIL_CATALOG.map((item) => ({
        name: `${item.brand} ${item.name}`,
        brand: item.brand,
        category: item.category,
        sku: item.sku,
        color: item.color,
        size: item.size,
        storage_location: profile.defaultLocation,
        base_unit: profile.defaultUnit,
        display_unit: profile.displayUnit,
        container_size: null,
        is_batch: false,
        fill_granularity: 1,
      }))
    );

    const aliasEntries: Array<{ itemId: string; aliasText: string }> = [];
    for (let i = 0; i < SAMPLE_RETAIL_CATALOG.length; i++) {
      const seed = SAMPLE_RETAIL_CATALOG[i];
      const item = createdItems[i];
      for (const alias of seed.aliases ?? []) {
        aliasEntries.push({ itemId: item.id, aliasText: alias });
      }
      aliasEntries.push({
        itemId: item.id,
        aliasText: `${seed.name} ${seed.color} ${seed.size}`.trim(),
      });
    }

    if (aliasEntries.length > 0) {
      await repos.aliases.createMany(aliasEntries);
    }

    return createdItems.length;
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

  await seedDemoBatch(repos, createdItems);

  return createdItems.length;
}

export async function seedDefaultCatalog(repos: Repositories): Promise<number> {
  const { loadSettings } = await import('@/config/settings');
  const settings = await loadSettings();
  return seedCatalogForVertical(repos, settings);
}

export async function reseedCatalog(
  repos: Repositories,
  settings?: Pick<AppSettings, 'businessType' | 'retailSubType'>
): Promise<number> {
  await repos.items.deleteAll();

  if (settings) {
    return seedCatalogForVertical(repos, settings);
  }

  return seedDefaultCatalog(repos);
}
