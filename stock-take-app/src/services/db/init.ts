import { getDatabase } from './index';
import { createRepositories } from './repositories';
import { seedDefaultCatalog } from './seed';

export type DatabaseInitResult = {
  seededCount: number;
  itemCount: number;
};

export async function initializeDatabase(): Promise<DatabaseInitResult> {
  const db = await getDatabase();
  const repos = createRepositories(db);
  const seededCount = await seedDefaultCatalog(repos);
  const itemCount = await repos.items.count();
  return { seededCount, itemCount };
}

export async function getRepositories() {
  const db = await getDatabase();
  return createRepositories(db);
}
