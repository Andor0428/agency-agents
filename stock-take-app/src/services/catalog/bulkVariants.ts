import type { CreateItemInput } from '@/services/db/repositories/items';

export type BulkVariantInput = {
  styleName: string;
  brand: string;
  category: string;
  skuPrefix: string;
  sizes: string[];
  colors: string[];
  storage_location?: CreateItemInput['storage_location'];
  base_unit?: CreateItemInput['base_unit'];
  display_unit?: string;
};

export function parseListInput(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function generateBulkVariants(input: BulkVariantInput): CreateItemInput[] {
  const variants: CreateItemInput[] = [];
  const prefix = input.skuPrefix.trim().toUpperCase().replace(/\s+/g, '-');

  for (const color of input.colors) {
    for (const size of input.sizes) {
      const colorCode = color.slice(0, 3).toUpperCase();
      const sizeCode = size.toUpperCase().replace(/\s+/g, '');
      const sku = `${prefix}-${colorCode}-${sizeCode}`;
      variants.push({
        name: `${input.brand} ${input.styleName}`.trim(),
        brand: input.brand.trim(),
        category: input.category.trim(),
        sku,
        color,
        size,
        storage_location: input.storage_location,
        base_unit: input.base_unit ?? 'each',
        display_unit: input.display_unit ?? 'unit',
        container_size: null,
        is_batch: false,
        fill_granularity: 1,
      });
    }
  }

  return variants;
}
