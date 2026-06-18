import { buildParserCatalogHint } from '@/services/parser/catalogHint';
import type { MatchableCatalogEntry } from '@/services/matcher';

function entry(name: string, aliases: string[] = []): MatchableCatalogEntry {
  return {
    item: {
      id: name,
      name,
      is_active: true,
    } as MatchableCatalogEntry['item'],
    aliases: aliases.map((alias_text, i) => ({
      id: `${name}-${i}`,
      item_id: name,
      alias_text,
    })) as MatchableCatalogEntry['aliases'],
  };
}

describe('buildParserCatalogHint', () => {
  it('includes aliases in the hint', () => {
    const hint = buildParserCatalogHint([entry('Grey Goose', ['goose', 'gg'])]);
    expect(hint).toContain('Grey Goose');
    expect(hint).toContain('goose');
  });

  it('truncates very large catalogs', () => {
    const catalog = Array.from({ length: 200 }, (_, i) => entry(`Spirit Number ${i}`));
    const hint = buildParserCatalogHint(catalog);
    expect(hint.length).toBeLessThanOrEqual(2600);
    expect(hint).toContain('more catalog items');
  });
});
