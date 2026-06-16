import {
  DEFAULT_INVENTORY_HEADERS,
  DEFAULT_INVENTORY_TAB,
  pickDefaultTabName,
} from '@/services/spreadsheetSync/googlePicker';

describe('pickDefaultTabName', () => {
  it('prefers Inventory when present', () => {
    expect(pickDefaultTabName(['Catalog', 'Inventory', 'Archive'])).toBe('Inventory');
  });

  it('falls back to the first tab', () => {
    expect(pickDefaultTabName(['Catalog', 'Archive'])).toBe('Catalog');
  });

  it('falls back to Inventory when there are no tabs', () => {
    expect(pickDefaultTabName([])).toBe('Inventory');
  });
});

describe('DEFAULT_INVENTORY_HEADERS', () => {
  it('starts with sync columns and includes catalog fields', () => {
    expect(DEFAULT_INVENTORY_HEADERS[0]).toBe('name');
    expect(DEFAULT_INVENTORY_HEADERS[1]).toBe('quantity');
    expect(DEFAULT_INVENTORY_HEADERS[2]).toBe('notes');
    expect(DEFAULT_INVENTORY_HEADERS).toContain('sku');
    expect(DEFAULT_INVENTORY_HEADERS).toContain('aliases');
  });
});
