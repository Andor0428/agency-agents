import type { Repositories } from '@/services/db/repositories';
import type { BaseUnit, Item, StorageLocation } from '@/types';

export type CsvImportRow = {
  name: string;
  brand?: string | null;
  sku?: string | null;
  color?: string | null;
  size?: string | null;
  category?: string | null;
  barcode?: string | null;
  storage_location?: StorageLocation;
  base_unit?: BaseUnit;
  display_unit?: string;
  container_size?: number | null;
  is_batch?: boolean;
  par_level?: number | null;
  fill_granularity?: number;
  aliases?: string[];
};

export type CsvImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(lower)) return true;
  if (['0', 'false', 'no', 'n'].includes(lower)) return false;
  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export function parseCatalogCsv(csvText: string): CsvImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const nameIdx = header.indexOf('name');
  if (nameIdx === -1) {
    throw new Error('CSV must include a "name" column');
  }

  const col = (key: string) => header.indexOf(key);

  const rows: CsvImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const name = values[nameIdx]?.trim();
    if (!name) continue;

    const aliasesRaw = values[col('aliases')];
    rows.push({
      name,
      brand: values[col('brand')] || null,
      sku: values[col('sku')] || null,
      barcode: values[col('barcode')] || null,
      color: values[col('color')] || null,
      size: values[col('size')] || null,
      category: values[col('category')] || null,
      storage_location: (values[col('storage_location')] as StorageLocation) || undefined,
      base_unit: (values[col('base_unit')] as BaseUnit) || undefined,
      display_unit: values[col('display_unit')] || undefined,
      container_size: parseNumber(values[col('container_size')]),
      is_batch: parseBool(values[col('is_batch')]),
      par_level: parseNumber(values[col('par_level')]),
      fill_granularity: parseNumber(values[col('fill_granularity')]),
      aliases: aliasesRaw
        ? aliasesRaw
            .split(';')
            .map((a) => a.trim())
            .filter(Boolean)
        : undefined,
    });
  }

  return rows;
}

export function catalogToCsv(
  items: Array<{
    name: string;
    brand?: string | null;
    sku?: string | null;
    barcode?: string | null;
    color?: string | null;
    size?: string | null;
    category: string | null;
    storage_location: string;
    base_unit: string;
    display_unit: string;
    container_size: number | null;
    is_batch: boolean;
    par_level: number | null;
    fill_granularity: number;
    aliases?: string[];
  }>
): string {
  const header =
    'name,brand,sku,barcode,color,size,category,storage_location,base_unit,display_unit,container_size,is_batch,par_level,fill_granularity,aliases';
  const lines = items.map((item) => {
    const fields = [
      `"${item.name.replace(/"/g, '""')}"`,
      item.brand ?? '',
      item.sku ?? '',
      item.barcode ?? '',
      item.color ?? '',
      item.size ?? '',
      item.category ?? '',
      item.storage_location,
      item.base_unit,
      item.display_unit,
      item.container_size ?? '',
      item.is_batch ? 'true' : 'false',
      item.par_level ?? '',
      item.fill_granularity,
      (item.aliases ?? []).join(';'),
    ];
    return fields.join(',');
  });
  return [header, ...lines].join('\n');
}

export async function importCatalogCsv(
  repos: Repositories,
  csvText: string,
  options?: { skipDuplicates?: boolean }
): Promise<CsvImportResult> {
  const skipDuplicates = options?.skipDuplicates ?? true;
  const rows = parseCatalogCsv(csvText);
  const existing = await repos.items.getAll();
  const existingNames = new Set(existing.map((i: Item) => i.name.toLowerCase()));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (skipDuplicates && existingNames.has(row.name.toLowerCase())) {
      skipped++;
      continue;
    }

    try {
      const item = await repos.items.create({
        name: row.name,
        brand: row.brand,
        sku: row.sku,
        barcode: row.barcode,
        color: row.color,
        size: row.size,
        category: row.category,
        storage_location: row.storage_location,
        base_unit: row.base_unit,
        display_unit: row.display_unit,
        container_size: row.container_size,
        is_batch: row.is_batch,
        par_level: row.par_level,
        fill_granularity: row.fill_granularity,
      });

      if (row.aliases?.length) {
        await repos.aliases.createMany(
          row.aliases.map((aliasText) => ({ itemId: item.id, aliasText }))
        );
      }

      existingNames.add(row.name.toLowerCase());
      imported++;
    } catch (error) {
      errors.push(`${row.name}: ${error instanceof Error ? error.message : 'import failed'}`);
    }
  }

  return { imported, skipped, errors };
}
