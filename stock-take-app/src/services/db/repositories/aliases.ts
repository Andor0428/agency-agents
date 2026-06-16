import { createId as uuidv4 } from '@/utils/uuid';
import type * as SQLite from 'expo-sqlite';
import type { Alias } from '@/types';
import { mapAliasRow } from '../mappers';

export class AliasesRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async getByItemId(itemId: string): Promise<Alias[]> {
    const rows = await this.db.getAllAsync<Alias>(
      'SELECT * FROM aliases WHERE item_id = ? ORDER BY alias_text COLLATE NOCASE ASC',
      [itemId]
    );
    return rows.map(mapAliasRow);
  }

  async getAll(): Promise<Alias[]> {
    const rows = await this.db.getAllAsync<Alias>(
      'SELECT * FROM aliases ORDER BY alias_text COLLATE NOCASE ASC'
    );
    return rows.map(mapAliasRow);
  }

  async create(itemId: string, aliasText: string): Promise<Alias> {
    const alias: Alias = {
      id: uuidv4(),
      item_id: itemId,
      alias_text: aliasText.trim(),
    };
    await this.db.runAsync(
      'INSERT INTO aliases (id, item_id, alias_text) VALUES (?, ?, ?)',
      [alias.id, alias.item_id, alias.alias_text]
    );
    return alias;
  }

  async createMany(entries: Array<{ itemId: string; aliasText: string }>): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      for (const entry of entries) {
        await this.create(entry.itemId, entry.aliasText);
      }
    });
  }

  async update(id: string, aliasText: string): Promise<Alias | null> {
    const existing = await this.db.getFirstAsync<Alias>('SELECT * FROM aliases WHERE id = ?', [id]);
    if (!existing) return null;

    const trimmed = aliasText.trim();
    await this.db.runAsync('UPDATE aliases SET alias_text = ? WHERE id = ?', [trimmed, id]);
    return { ...existing, alias_text: trimmed };
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM aliases WHERE id = ?', [id]);
  }

  async deleteByItemId(itemId: string): Promise<void> {
    await this.db.runAsync('DELETE FROM aliases WHERE item_id = ?', [itemId]);
  }
}
