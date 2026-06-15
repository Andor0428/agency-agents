import { generateBulkVariants, parseListInput } from '@/services/catalog/bulkVariants';
import { parseSheetCatalogRows } from '@/services/spreadsheetSync/importCatalog';

describe('parseListInput', () => {
  it('splits comma and newline separated values', () => {
    expect(parseListInput('S, M, L')).toEqual(['S', 'M', 'L']);
    expect(parseListInput('Black\nWhite')).toEqual(['Black', 'White']);
  });
});

describe('generateBulkVariants', () => {
  it('creates size x color matrix', () => {
    const variants = generateBulkVariants({
      styleName: '501',
      brand: "Levi's",
      category: 'denim',
      skuPrefix: 'LEV-501',
      sizes: ['32', '34'],
      colors: ['Blue', 'Black'],
    });
    expect(variants).toHaveLength(4);
    expect(variants[0].sku).toContain('LEV-501');
    expect(variants[0].color).toBe('Blue');
  });
});

describe('parseSheetCatalogRows', () => {
  it('parses catalog header and rows', () => {
    const rows = [
      ['name', 'sku', 'brand', 'color', 'size', 'category'],
      ['Nike Air Max', 'NIKE-1', 'Nike', 'Black', '10', 'footwear'],
    ];
    const parsed = parseSheetCatalogRows(rows);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].sku).toBe('NIKE-1');
    expect(parsed[0].brand).toBe('Nike');
  });
});
