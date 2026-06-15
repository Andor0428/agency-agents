import {
  dedupeSpreadsheetUpdates,
  findRowIndexByName,
} from '@/services/spreadsheetSync/sessionTotals';
import type { SpreadsheetRowUpdate } from '@/services/spreadsheetSync/types';

describe('findRowIndexByName', () => {
  const rows = [
    ['name', 'quantity', 'notes'],
    ['Belvedere', '2', '2 = 2'],
    ['Tanqueray', '1', '1 = 1'],
    ['  trailblazer ', '450', '60%'],
  ];

  it('finds rows case-insensitively with trimmed names', () => {
    expect(findRowIndexByName(rows, 'belvedere')).toBe(1);
    expect(findRowIndexByName(rows, 'Trailblazer')).toBe(3);
  });

  it('returns -1 when name is missing', () => {
    expect(findRowIndexByName(rows, 'Hendricks')).toBe(-1);
  });
});

describe('dedupeSpreadsheetUpdates', () => {
  it('keeps the last update per item name', () => {
    const updates: SpreadsheetRowUpdate[] = [
      { itemName: 'Belvedere', quantity: 2, auditTrail: '2 = 2' },
      { itemName: 'belvedere', quantity: 5, auditTrail: '5 = 5' },
      { itemName: 'Tanqueray', quantity: 1, auditTrail: '1 = 1' },
    ];

    const deduped = dedupeSpreadsheetUpdates(updates);
    expect(deduped).toHaveLength(2);
    const belvedere = deduped.find((row) => row.itemName.toLowerCase() === 'belvedere');
    expect(belvedere?.quantity).toBe(5);
  });
});
