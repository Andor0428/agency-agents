import { v4 as uuidv4 } from 'uuid';
import type * as SQLite from 'expo-sqlite';
import type { Item, StorageLocation, BaseUnit } from '@/types';
import { mapItemRow, mapItemToParams, type ItemRow } from '../mappers';

export type CreateItemInput = {
  name: string;
  category?: string | null;
  storage_location?: StorageLocation;
  base_unit?: BaseUnit;
  display_unit?: string;
  container_size?: number | null;
  is_batch?: boolean;
  is_active?: boolean;
  par_level?: number | null;
  fill_granularity?: number;
  sku?: string | null;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
};

export type UpdateItemInput = Partial<CreateItemInput>;

export class ItemsRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async count(): Promise<number> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM items'
    );
    return row?.count ?? 0;
  }

  async getAll(options?: { activeOnly?: boolean; search?: string }): Promise<Item[]> {
    const clauses: string[] = [];
    const params: string[] = [];

    if (options?.activeOnly) {
      clauses.push('is_active = 1');
    }
    if (options?.search?.trim()) {
      clauses.push(
        '(name LIKE ? OR category LIKE ? OR sku LIKE ? OR brand LIKE ? OR color LIKE ? OR size LIKE ?)'
      );
      const term = `%${options.search.trim()}%`;
      params.push(term, term, term, term, term, term);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await this.db.getAllAsync<ItemRow>(
      `SELECT * FROM items ${where} ORDER BY name COLLATE NOCASE ASC`,
      params
    );
    return rows.map(mapItemRow);
  }

  async getBySku(sku: string): Promise<Item | null> {
    const row = await this.db.getFirstAsync<ItemRow>(
      'SELECT * FROM items WHERE lower(sku) = lower(?)',
      [sku.trim()]
    );
    return row ? mapItemRow(row) : null;
  }

  async getById(id: string): Promise<Item | null> {
    const row = await this.db.getFirstAsync<ItemRow>('SELECT * FROM items WHERE id = ?', [id]);
    return row ? mapItemRow(row) : null;
  }

  async create(input: CreateItemInput): Promise<Item> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const item: Omit<Item, 'created_at' | 'updated_at'> = {
      id,
      name: input.name.trim(),
      category: input.category ?? null,
      storage_location: input.storage_location ?? 'bar',
      base_unit: input.base_unit ?? 'ml',
      display_unit: input.display_unit ?? 'bottle',
      container_size: input.container_size ?? 750,
      is_batch: input.is_batch ?? false,
      is_active: input.is_active ?? true,
      par_level: input.par_level ?? null,
      fill_granularity: input.fill_granularity ?? 0.1,
      sku: input.sku?.trim() || null,
      brand: input.brand?.trim() || null,
      color: input.color?.trim() || null,
      size: input.size?.trim() || null,
    };

    await this.db.runAsync(
      `INSERT INTO items (
        id, name, category, storage_location, base_unit, display_unit,
        container_size, is_batch, is_active, par_level, fill_granularity,
        sku, brand, color, size, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...mapItemToParams(item), now, now]
    );

    return { ...item, created_at: now, updated_at: now };
  }

  async createMany(inputs: CreateItemInput[]): Promise<Item[]> {
    const created: Item[] = [];
    await this.db.withTransactionAsync(async () => {
      for (const input of inputs) {
        created.push(await this.create(input));
      }
    });
    return created;
  }

  async update(id: string, input: UpdateItemInput): Promise<Item | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Item = {
      ...existing,
      ...input,
      name: input.name?.trim() ?? existing.name,
      sku: input.sku !== undefined ? input.sku?.trim() || null : existing.sku,
      brand: input.brand !== undefined ? input.brand?.trim() || null : existing.brand,
      color: input.color !== undefined ? input.color?.trim() || null : existing.color,
      size: input.size !== undefined ? input.size?.trim() || null : existing.size,
      updated_at: new Date().toISOString(),
    };

    await this.db.runAsync(
      `UPDATE items SET
        name = ?, category = ?, storage_location = ?, base_unit = ?, display_unit = ?,
        container_size = ?, is_batch = ?, is_active = ?, par_level = ?, fill_granularity = ?,
        sku = ?, brand = ?, color = ?, size = ?, updated_at = ?
      WHERE id = ?`,
      [
        updated.name,
        updated.category,
        updated.storage_location,
        updated.base_unit,
        updated.display_unit,
        updated.container_size,
        updated.is_batch ? 1 : 0,
        updated.is_active ? 1 : 0,
        updated.par_level,
        updated.fill_granularity,
        updated.sku,
        updated.brand,
        updated.color,
        updated.size,
        updated.updated_at,
        id,
      ]
    );

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync('DELETE FROM items WHERE id = ?', [id]);
    return (result.changes ?? 0) > 0;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.db.runAsync(
      'UPDATE items SET is_active = ?, updated_at = ? WHERE id = ?',
      [isActive ? 1 : 0, new Date().toISOString(), id]
    );
  }
}
