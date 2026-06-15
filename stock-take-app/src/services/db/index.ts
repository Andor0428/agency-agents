import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, MIGRATION_V2_SQL, SCHEMA_VERSION } from './schema';

const DB_NAME = 'stocktake.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  dbInstance = db;
  return db;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_migrations'
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(CREATE_TABLES_SQL);
    await db.runAsync('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)', [1]);
  }

  if (currentVersion < 2) {
    await db.execAsync(MIGRATION_V2_SQL);
    await backfillContainerSizes(db);
    await db.runAsync('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)', [2]);
  }
}

async function backfillContainerSizes(db: SQLite.SQLiteDatabase): Promise<void> {
  const items = await db.getAllAsync<{ id: string; container_size: number | null }>(
    'SELECT id, container_size FROM items WHERE container_size IS NOT NULL'
  );
  for (const item of items) {
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM item_container_sizes WHERE item_id = ?',
      [item.id]
    );
    if ((existing?.count ?? 0) > 0) continue;

    const { v4: uuidv4 } = await import('uuid');
    await db.runAsync(
      `INSERT INTO item_container_sizes (id, item_id, label, size, is_default)
       VALUES (?, ?, ?, ?, 1)`,
      [uuidv4(), item.id, 'Standard', item.container_size]
    );
  }
}

export async function resetDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
  await SQLite.deleteDatabaseAsync(DB_NAME);
}

export { initializeDatabase, getRepositories } from './init';
export { createRepositories } from './repositories';
export type { Repositories } from './repositories';
