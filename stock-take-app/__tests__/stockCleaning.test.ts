import { cleanStockLines } from '@/services/catalog/stockCleaning';

describe('cleanStockLines', () => {
  it('transfers quantities from following numeric lines and preserves units', () => {
    const result = cleanStockLines([
      'celery salt',
      '2',
      'mcallen',
      '1 bottles',
      'Johnny Walker 750ml 2 bottles',
    ]);

    expect(result.cleanList).toEqual([
      {
        product: 'Celery Salt',
        quantity: 2,
        unit: null,
        quantityText: '2',
        sourceLines: [1, 2],
      },
      {
        product: 'Johnnie Walker 750 ml',
        quantity: 2,
        unit: 'bottles',
        quantityText: '2 bottles',
        sourceLines: [5],
      },
      {
        product: 'Macallan',
        quantity: 1,
        unit: 'bottles',
        quantityText: '1 bottles',
        sourceLines: [3, 4],
      },
    ]);
    expect(result.flaggedItems).toEqual([]);
  });

  it('normalizes product spelling and merges duplicate products after standardization', () => {
    const result = cleanStockLines(`
      Johnny Walker 2 bottles
      Johnnie Walker 3 bottles
      mcallen 1 bottle
      Macallan 4 bottle
    `);

    expect(result.cleanList).toEqual([
      {
        product: 'Johnnie Walker',
        quantity: 5,
        unit: 'bottles',
        quantityText: '5 bottles',
        sourceLines: [2, 3],
      },
      {
        product: 'Macallan',
        quantity: 5,
        unit: 'bottle',
        quantityText: '5 bottle',
        sourceLines: [4, 5],
      },
    ]);
    expect(result.mergedDuplicates).toEqual([
      {
        product: 'Johnnie Walker',
        quantity: 5,
        unit: 'bottles',
        quantityText: '5 bottles',
        sourceLines: [2, 3],
        mergedFrom: [
          {
            product: 'Johnnie Walker',
            quantity: 2,
            unit: 'bottles',
            quantityText: '2 bottles',
            sourceLines: [2],
          },
          {
            product: 'Johnnie Walker',
            quantity: 3,
            unit: 'bottles',
            quantityText: '3 bottles',
            sourceLines: [3],
          },
        ],
      },
      {
        product: 'Macallan',
        quantity: 5,
        unit: 'bottle',
        quantityText: '5 bottle',
        sourceLines: [4, 5],
        mergedFrom: [
          {
            product: 'Macallan',
            quantity: 1,
            unit: 'bottle',
            quantityText: '1 bottle',
            sourceLines: [4],
          },
          {
            product: 'Macallan',
            quantity: 4,
            unit: 'bottle',
            quantityText: '4 bottle',
            sourceLines: [5],
          },
        ],
      },
    ]);
  });

  it('flags missing quantities, missing products, and unit ambiguity without inventing values', () => {
    const result = cleanStockLines([
      '200',
      'Macallan 750ml',
      'Johnnie Walker 2 bottles',
      'Johnnie Walker 750ml',
      'Johnnie Walker 1 case',
    ]);

    expect(result.cleanList).toEqual([
      {
        product: 'Johnnie Walker',
        quantity: 2,
        unit: 'bottles',
        quantityText: '2 bottles',
        sourceLines: [3],
      },
      {
        product: 'Johnnie Walker',
        quantity: 1,
        unit: 'case',
        quantityText: '1 case',
        sourceLines: [5],
      },
    ]);
    expect(result.flaggedItems).toEqual([
      {
        code: 'missing_product',
        severity: 'RED',
        raw: '200',
        quantityText: '200',
        message: 'Quantity has no product name.',
        sourceLines: [1],
      },
      {
        code: 'missing_quantity',
        severity: 'RED',
        raw: 'Macallan 750ml',
        product: 'Macallan 750 ml',
        message: 'Product has no quantity.',
        sourceLines: [2],
      },
      {
        code: 'missing_quantity',
        severity: 'RED',
        raw: 'Johnnie Walker 750ml',
        product: 'Johnnie Walker 750 ml',
        message: 'Product has no quantity.',
        sourceLines: [4],
      },
      {
        code: 'ambiguous',
        severity: 'WARNING',
        raw: 'Johnnie Walker',
        product: 'Johnnie Walker',
        message: 'Same product uses multiple units; quantities were not merged across units.',
        sourceLines: [3, 5],
      },
    ]);
  });

  it('cleans attached trailing numbers before parsing quantities', () => {
    const result = cleanStockLines('celery salt2\nmcallen2bottles');

    expect(result.cleanList).toEqual([
      {
        product: 'Celery Salt',
        quantity: 2,
        unit: null,
        quantityText: '2',
        sourceLines: [1],
      },
      {
        product: 'Macallan',
        quantity: 2,
        unit: 'bottles',
        quantityText: '2 bottles',
        sourceLines: [2],
      },
    ]);
    expect(result.flaggedItems).toEqual([]);
  });
});
