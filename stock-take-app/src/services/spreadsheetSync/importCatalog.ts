import type { AppSettings } from '@/types';
import { getVerticalProfile } from '@/config/vertical';
import type { Repositories } from '@/services/db/repositories';
import type { CreateItemInput } from '@/services/db/repositories/items';
import type { BaseUnit, StorageLocation } from '@/types';
import type { SheetCatalogRow } from './types';

export type SheetCatalogImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function colIndex(header: string[], key: string): number {
  return header.indexOf(key);
}

export function parseSheetCatalogRows(rows: string[][]): SheetCatalogRow[] {
  if (rows.length <= 1) return [];

  const header = rows[0].map((cell) => cell.toLowerCase().trim().replace(/\s+/g, '_'));
  const idx = (key: string) => colIndex(header, key);

  const nameIdx = idx('name');
  if (nameIdx === -1) {
    throw new Error('Sheet must include a "name" column');
  }

  const parsed: SheetCatalogRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = row[nameIdx]?.trim();
    if (!name) continue;

    const get = (key: string) => {
      const index = idx(key);
      return index >= 0 ? row[index]?.trim() ?? '' : '';
    };

    parsed.push({
      name,
      brand: get('brand') || null,
      sku: get('sku') || null,
      barcode: get('barcode') || null,
      color: get('color') || null,
      size: get('size') || null,
      category: get('category') || null,
      storage_location: (get('storage_location') as StorageLocation) || undefined,
      base_unit: (get('base_unit') as BaseUnit) || undefined,
      display_unit: get('display_unit') || undefined,
      container_size: get('container_size') ? Number(get('container_size')) : undefined,
      par_level: get('par_level') ? Number(get('par_level')) : undefined,
      aliases: get('aliases')
        ? get('aliases')
            .split(';')
            .map((a) => a.trim())
            .filter(Boolean)
        : undefined,
    });
  }

  return parsed;
}

function rowToCreateInput(row: SheetCatalogRow, settings: AppSettings): CreateItemInput {
  const profile = getVerticalProfile(settings);
  return {
    name: row.name,
    brand: row.brand,
    sku: row.sku,
    barcode: row.barcode,
    color: row.color,
    size: row.size,
    category: row.category,
    storage_location:
      (row.storage_location as StorageLocation | undefined) ?? settings.defaultLocation,
    base_unit: (row.base_unit as BaseUnit | undefined) ?? profile.defaultUnit,
    display_unit: row.display_unit ?? profile.displayUnit,
    container_size: row.container_size ?? (profile.features.fillLevel ? 750 : null),
    is_batch: false,
    par_level: row.par_level ?? null,
    fill_granularity: profile.features.fillLevel ? 0.1 : 1,
  };
}

export async function importSheetCatalogToDb(
  repos: Repositories,
  rows: SheetCatalogRow[],
  settings: AppSettings
): Promise<SheetCatalogImportResult> {
  const existing = await repos.items.getAll();
  const bySku = new Map(
    existing.filter((i) => i.sku).map((i) => [i.sku!.toLowerCase(), i])
  );
  const byName = new Map(existing.map((i) => [i.name.toLowerCase(), i]));

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const input = rowToCreateInput(row, settings);
      const skuKey = row.sku?.toLowerCase();
      const existingItem =
        (skuKey ? bySku.get(skuKey) : undefined) ?? byName.get(row.name.toLowerCase());

      if (existingItem) {
        await repos.items.update(existingItem.id, input);
        if (row.aliases?.length) {
          for (const aliasText of row.aliases) {
            try {
              await repos.aliases.create(existingItem.id, aliasText);
            } catch {
              // duplicate alias
            }
          }
        }
        updated++;
        continue;
      }

      const item = await repos.items.create(input);
      if (row.aliases?.length) {
        await repos.aliases.createMany(
          row.aliases.map((aliasText) => ({ itemId: item.id, aliasText }))
        );
      }
      if (item.sku) bySku.set(item.sku.toLowerCase(), item);
      byName.set(item.name.toLowerCase(), item);
      imported++;
    } catch (error) {
      errors.push(`${row.name}: ${error instanceof Error ? error.message : 'import failed'}`);
      skipped++;
    }
  }

  return { imported, updated, skipped, errors };
}
