import {
  applyBritishEnglishTranscriptionPrompt,
  BRITISH_ENGLISH_TRANSCRIPTION_PREFIX,
  NEMOTRON_LANGUAGE_CODE,
  VOICE_RECOGNITION_LOCALE,
} from '@/services/transcription/locale';
import { buildWhisperPrompt } from '@/services/voicePipeline/whisperPrompt';

describe('voice locale', () => {
  it('uses en-GB as the app locale', () => {
    expect(VOICE_RECOGNITION_LOCALE).toBe('en-GB');
  });

  it('maps Nemotron ASR to en-GB for British English', () => {
    expect(NEMOTRON_LANGUAGE_CODE).toBe('en-GB');
  });

  it('prefixes catalog prompts for British English Whisper priming', () => {
    const result = applyBritishEnglishTranscriptionPrompt('Bar spirits inventory: Belvedere');
    expect(result.startsWith(BRITISH_ENGLISH_TRANSCRIPTION_PREFIX)).toBe(true);
    expect(result).toContain('Belvedere');
  });

  it('buildWhisperPrompt includes British English priming', () => {
    const prompt = buildWhisperPrompt([
      {
        item: {
          id: '1',
          name: 'Belvedere',
          is_active: true,
        } as Parameters<typeof buildWhisperPrompt>[0][0]['item'],
        aliases: [],
      },
    ]);
    expect(prompt.startsWith(BRITISH_ENGLISH_TRANSCRIPTION_PREFIX)).toBe(true);
    expect(prompt).toContain('Belvedere');
  });
});
