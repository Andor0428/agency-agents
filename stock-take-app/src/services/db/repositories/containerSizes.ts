import { createId as uuidv4 } from '@/utils/uuid';
import type * as SQLite from 'expo-sqlite';
import type { ItemContainerSize } from '@/types';

type ContainerSizeRow = {
  id: string;
  item_id: string;
  label: string;
  size: number;
  is_default: number;
};

function mapRow(row: ContainerSizeRow): ItemContainerSize {
  return {
    id: row.id,
    item_id: row.item_id,
    label: row.label,
    size: row.size,
    is_default: row.is_default === 1,
  };
}

export class ContainerSizesRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async getByItemId(itemId: string): Promise<ItemContainerSize[]> {
    const rows = await this.db.getAllAsync<ContainerSizeRow>(
      'SELECT * FROM item_container_sizes WHERE item_id = ? ORDER BY is_default DESC, label ASC',
      [itemId]
    );
    return rows.map(mapRow);
  }

  async create(itemId: string, label: string, size: number, isDefault = false): Promise<ItemContainerSize> {
    if (isDefault) {
      await this.db.runAsync(
        'UPDATE item_container_sizes SET is_default = 0 WHERE item_id = ?',
        [itemId]
      );
    }

    const entry: ItemContainerSize = {
      id: uuidv4(),
      item_id: itemId,
      label: label.trim(),
      size,
      is_default: isDefault,
    };

    await this.db.runAsync(
      `INSERT INTO item_container_sizes (id, item_id, label, size, is_default)
       VALUES (?, ?, ?, ?, ?)`,
      [entry.id, entry.item_id, entry.label, entry.size, isDefault ? 1 : 0]
    );

    if (isDefault) {
      await this.db.runAsync('UPDATE items SET container_size = ?, updated_at = ? WHERE id = ?', [
        size,
        new Date().toISOString(),
        itemId,
      ]);
    }

    return entry;
  }

  async setDefault(itemId: string, containerSizeId: string): Promise<void> {
    const row = await this.db.getFirstAsync<ContainerSizeRow>(
      'SELECT * FROM item_container_sizes WHERE id = ? AND item_id = ?',
      [containerSizeId, itemId]
    );
    if (!row) return;

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'UPDATE item_container_sizes SET is_default = 0 WHERE item_id = ?',
        [itemId]
      );
      await this.db.runAsync('UPDATE item_container_sizes SET is_default = 1 WHERE id = ?', [
        containerSizeId,
      ]);
      await this.db.runAsync('UPDATE items SET container_size = ?, updated_at = ? WHERE id = ?', [
        row.size,
        new Date().toISOString(),
        itemId,
      ]);
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM item_container_sizes WHERE id = ?', [id]);
  }
}
