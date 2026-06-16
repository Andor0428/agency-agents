import { pickDefaultTabName } from '@/services/spreadsheetSync/googlePicker';

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
