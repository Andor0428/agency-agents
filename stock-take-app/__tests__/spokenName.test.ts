import { normalizeSpokenProductName } from '@/services/parser/spokenName';

describe('normalizeSpokenProductName', () => {
  it('removes leading filler phrases', () => {
    expect(normalizeSpokenProductName('okay so grey goose')).toBe('grey goose');
    expect(normalizeSpokenProductName("I see we've got tanqueray")).toBe('tanqueray');
  });

  it('removes container and counting filler words', () => {
    expect(normalizeSpokenProductName('two bottles of belvedere')).toBe('belvedere');
    expect(normalizeSpokenProductName('on the shelf bacardi')).toBe('bacardi');
  });

  it('preserves product names', () => {
    expect(normalizeSpokenProductName('Grey Goose')).toBe('Grey Goose');
    expect(normalizeSpokenProductName("Hendrick's gin")).toBe("Hendrick's gin");
  });
});
