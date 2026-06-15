import { parseCatalogCsv, catalogToCsv } from '@/services/import/csv';

describe('parseCatalogCsv', () => {
  const sample = `name,category,storage_location,base_unit,display_unit,container_size,is_batch,par_level,fill_granularity,aliases
Belvedere,vodka,bar,ml,bottle,750,false,6,0.1,Bel;Bellvedere
Tanqueray,gin,bar,ml,bottle,750,false,,0.1,Tankeray`;

  it('parses header and rows', () => {
    const rows = parseCatalogCsv(sample);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Belvedere');
    expect(rows[0].aliases).toEqual(['Bel', 'Bellvedere']);
    expect(rows[0].container_size).toBe(750);
    expect(rows[1].name).toBe('Tanqueray');
  });

  it('throws when name column is missing', () => {
    expect(() => parseCatalogCsv('category,base_unit\nvodka,ml')).toThrow(/name/i);
  });
});

describe('catalogToCsv', () => {
  it('round-trips core fields', () => {
    const csv = catalogToCsv([
      {
        name: 'Belvedere',
        category: 'vodka',
        storage_location: 'bar',
        base_unit: 'ml',
        display_unit: 'bottle',
        container_size: 750,
        is_batch: false,
        par_level: 6,
        fill_granularity: 0.1,
        aliases: ['Bel'],
      },
    ]);
    const rows = parseCatalogCsv(csv);
    expect(rows[0].name).toBe('Belvedere');
    expect(rows[0].aliases).toEqual(['Bel']);
  });
});

describe('TOP_100_SPIRITS seed', () => {
  it('contains exactly 100 spirits', async () => {
    const { TOP_100_SPIRITS } = await import('@/services/db/seed/spirits');
    expect(TOP_100_SPIRITS).toHaveLength(100);
  });
});
