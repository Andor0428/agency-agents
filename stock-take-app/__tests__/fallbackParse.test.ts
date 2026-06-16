import type { MatchableCatalogEntry } from '@/services/matcher';
import { fallbackParseTranscript } from '@/services/voicePipeline/fallbackParse';

const catalog: MatchableCatalogEntry[] = [
  {
    item: {
      id: '1',
      name: 'Belvedere',
      category: 'vodka',
      storage_location: 'bar',
      base_unit: 'ml',
      display_unit: 'bottle',
      container_size: 700,
      is_batch: false,
      is_active: true,
      par_level: null,
      fill_granularity: 0.1,
      created_at: '',
      updated_at: '',
    },
    aliases: [],
  },
  {
    item: {
      id: '2',
      name: 'Grey Goose',
      category: 'vodka',
      storage_location: 'bar',
      base_unit: 'ml',
      display_unit: 'bottle',
      container_size: 700,
      is_batch: false,
      is_active: true,
      par_level: null,
      fill_granularity: 0.1,
      created_at: '',
      updated_at: '',
    },
    aliases: [],
  },
];

describe('fallbackParseTranscript', () => {
  it('recovers Belvedere 2 from Bravader Tu mis-transcription', () => {
    const result = fallbackParseTranscript('Bravader Tu', catalog);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Belvedere');
    expect(result.items[0].quantity).toBe(2);
  });

  it('parses two grey goose style utterances', () => {
    const result = fallbackParseTranscript('two grey goose', catalog);
    expect(result.items[0].name).toBe('Grey Goose');
    expect(result.items[0].quantity).toBe(2);
  });

  it('parses digit quantities', () => {
    const result = fallbackParseTranscript('Belvedere 2', catalog);
    expect(result.items[0].name).toBe('Belvedere');
    expect(result.items[0].quantity).toBe(2);
  });
});
