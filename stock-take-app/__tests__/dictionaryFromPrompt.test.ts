import { dictionaryFromCatalogPrompt } from '@/services/transcription/dictionaryFromPrompt';

describe('dictionaryFromCatalogPrompt', () => {
  it('extracts names from bar spirits inventory prompt', () => {
    const names = dictionaryFromCatalogPrompt(
      'Bar spirits inventory: Belvedere, Grey Goose, Carpano Antica Formula'
    );
    expect(names).toEqual(['Belvedere', 'Grey Goose', 'Carpano Antica Formula']);
  });
});
