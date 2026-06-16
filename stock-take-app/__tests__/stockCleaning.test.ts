import {
  applyQuantityTransfer,
  cleanStockList,
  cleanupFormat,
  formatStockCleaningResult,
} from '@/services/stockCleaning';

describe('cleanupFormat', () => {
  it('separates attached trailing numbers', () => {
    expect(cleanupFormat('celery salt2')).toBe('celery salt 2');
  });

  it('separates attached units while preserving them', () => {
    expect(cleanupFormat('Belvedere 750ml')).toBe('Belvedere 750 ml');
    expect(cleanupFormat('2bottles')).toBe('2 bottles');
  });

  it('collapses extra whitespace', () => {
    expect(cleanupFormat('  Tanqueray   gin  ')).toBe('Tanqueray gin');
  });
});

describe('applyQuantityTransfer', () => {
  it('moves a standalone quantity to the previous product line', () => {
    const entries = applyQuantityTransfer(['Belvedere', '3', 'Tanqueray 2']);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ product: 'Belvedere', quantity: 3 });
    expect(entries[1]).toMatchObject({ product: 'Tanqueray', quantity: 2 });
  });

  it('moves quantity with unit on the next line', () => {
    const entries = applyQuantityTransfer(['Grey Goose', '6 bottles']);
    expect(entries[0]).toMatchObject({ product: 'Grey Goose', quantity: 6, unit: 'bottle' });
  });
});

describe('cleanStockList', () => {
  it('applies spelling normalization without guessing unknown products', () => {
    const result = cleanStockList(['johnny walker', '3', 'mcallen 2']);
    const johnnie = result.cleanList.find((item) => item.normalizedProduct === 'Johnnie Walker');
    const macallan = result.cleanList.find((item) => item.normalizedProduct === 'Macallan');
    expect(johnnie?.quantity).toBe(3);
    expect(macallan?.quantity).toBe(2);
  });

  it('flags missing quantities clearly', () => {
    const result = cleanStockList(['Belvedere', 'Tanqueray']);
    const missing = result.flaggedItems.filter((item) => item.reason === 'missing_quantity');
    expect(missing).toHaveLength(2);
    expect(missing[0].severity).toBe('error');
    expect(missing[0].message).toMatch(/🔴 Missing quantity/);
  });

  it('flags numeric-only lines as unknown products', () => {
    const result = cleanStockList(['12']);
    expect(result.flaggedItems).toHaveLength(1);
    expect(result.flaggedItems[0].reason).toBe('missing_product');
    expect(result.flaggedItems[0].message).toMatch(/Unknown product/);
    expect(result.cleanList).toHaveLength(0);
  });

  it('merges identical products and sums quantities', () => {
    const result = cleanStockList(['Belvedere 2', 'bellvedere 3']);
    expect(result.cleanList).toHaveLength(1);
    expect(result.cleanList[0].normalizedProduct).toBe('Belvedere');
    expect(result.cleanList[0].quantity).toBe(5);
    expect(result.mergedDuplicates).toHaveLength(1);
    expect(result.mergedDuplicates[0].mergedCount).toBe(2);
  });

  it('preserves units and never invents missing values', () => {
    const result = cleanStockList(['Ketel One 4 bottles', 'Bombay', 'walker 1']);
    expect(result.cleanList[0]).toMatchObject({ quantity: 4, unit: 'bottle' });
    const bombay = result.cleanList.find((item) => item.normalizedProduct === 'Bombay Sapphire');
    expect(bombay?.quantity).toBeNull();
    const ambiguous = result.flaggedItems.find((item) => item.reason === 'ambiguous');
    expect(ambiguous?.message).toMatch(/walker/i);
  });

  it('formats output with clean, flagged, and merged sections', () => {
    const result = cleanStockList(['Belvedere 2', 'bellvedere 1', '12']);
    const formatted = formatStockCleaningResult(result);
    expect(formatted).toContain('## Clean List');
    expect(formatted).toContain('## Flagged Items');
    expect(formatted).toContain('## Merged Duplicates');
    expect(formatted).toContain('Belvedere: 3');
  });
});
