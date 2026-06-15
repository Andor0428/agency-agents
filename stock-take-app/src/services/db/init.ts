import { getDatabase } from './index';
import { createRepositories } from './repositories';
import { seedCatalogForVertical } from './seed';
import { loadSettings, saveSettings } from '@/config/settings';

export type DatabaseInitResult = {
  seededCount: number;
  itemCount: number;
};

export async function initializeDatabase(): Promise<DatabaseInitResult> {
  const db = await getDatabase();
  const repos = createRepositories(db);

  let settings = await loadSettings();
  const itemCountBefore = await repos.items.count();

  if (itemCountBefore > 0 && !settings.onboardingComplete) {
    settings = await saveSettings({
      onboardingComplete: true,
      businessType: 'hospitality',
    });
  }

  let seededCount = 0;
  if (settings.onboardingComplete && itemCountBefore === 0) {
    seededCount = await seedCatalogForVertical(repos, settings);
  }

  const itemCount = await repos.items.count();
  return { seededCount, itemCount };
}

export async function getRepositories() {
  const db = await getDatabase();
  return createRepositories(db);
}
