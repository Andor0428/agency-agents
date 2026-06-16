import {
  applyBritishEnglishTranscriptionPrompt,
  BRITISH_ENGLISH_TRANSCRIPTION_PREFIX,
  VOICE_RECOGNITION_LOCALE,
} from '@/services/transcription/locale';

describe('voice locale', () => {
  it('uses en-GB as the app locale', () => {
    expect(VOICE_RECOGNITION_LOCALE).toBe('en-GB');
  });

  it('prefixes catalog prompts for British English Whisper priming', () => {
    const result = applyBritishEnglishTranscriptionPrompt('Bar spirits inventory: Belvedere');
    expect(result.startsWith(BRITISH_ENGLISH_TRANSCRIPTION_PREFIX)).toBe(true);
    expect(result).toContain('Belvedere');
  });
});
