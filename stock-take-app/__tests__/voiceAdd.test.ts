import { parseVoiceAddTranscript } from '@/services/voiceAdd/parseVoiceAdd';

describe('parseVoiceAddTranscript', () => {
  it('parses a typical voice-add phrase', () => {
    const result = parseVoiceAddTranscript("new item, Hendrick's gin, 700ml, bottle");
    expect(result?.name).toBe("Hendrick's gin");
    expect(result?.container_size).toBe(700);
    expect(result?.base_unit).toBe('ml');
    expect(result?.display_unit).toBe('bottle');
  });

  it('parses category and storage location', () => {
    const result = parseVoiceAddTranscript('new item, Tanqueray, 750ml, bottle, gin, bar');
    expect(result?.name).toBe('Tanqueray');
    expect(result?.category).toBe('gin');
    expect(result?.storage_location).toBe('bar');
    expect(result?.container_size).toBe(750);
  });

  it('returns null for non voice-add phrases', () => {
    expect(parseVoiceAddTranscript('Belvedere 2')).toBeNull();
  });
});
