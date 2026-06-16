import { truncateWhisperPrompt } from '@/services/transcription/whisperPrompt';

describe('truncateWhisperPrompt', () => {
  it('returns short prompts unchanged', () => {
    expect(truncateWhisperPrompt('Belvedere, Tanqueray')).toBe('Belvedere, Tanqueray');
  });

  it('truncates long catalog prompts under the Groq token limit', () => {
    const longPrompt = Array.from({ length: 200 }, (_, i) => `Item ${i}`).join(', ');
    const result = truncateWhisperPrompt(longPrompt);
    expect(result.length).toBeLessThanOrEqual(800);
    expect(result).not.toBe(longPrompt);
  });

  it('prefers breaking on comma boundaries', () => {
    const prompt = `${'alpha, '.repeat(200)}omega`;
    const result = truncateWhisperPrompt(prompt, 40);
    expect(result.endsWith(',')).toBe(false);
  });
});
