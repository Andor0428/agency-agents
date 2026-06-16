import { dictionaryFromCatalogPrompt } from '@/services/transcription/dictionaryFromPrompt';
import { BRITISH_ENGLISH_TRANSCRIPTION_PREFIX } from '@/services/transcription/locale';

describe('dictionaryFromCatalogPrompt', () => {
  it('extracts spirit names from a British English catalog prompt', () => {
    const names = dictionaryFromCatalogPrompt(
      `${BRITISH_ENGLISH_TRANSCRIPTION_PREFIX}Bar spirits inventory: Belvedere, Grey Goose, Tanqueray`
    );
    expect(names).toEqual(['Belvedere', 'Grey Goose', 'Tanqueray']);
  });

  it('deduplicates names and caps at 200 entries', () => {
    const names = dictionaryFromCatalogPrompt('Bar spirits inventory: Belvedere, Belvedere, Carpano');
    expect(names).toEqual(['Belvedere', 'Carpano']);
  });
});
