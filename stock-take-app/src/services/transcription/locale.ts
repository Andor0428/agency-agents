/** ISO locale for voice recognition — fixed to UK British English for this app. */
export const VOICE_RECOGNITION_LOCALE = 'en-GB';

/** Whisper/Wispr priming: biases toward UK accent and bar phrasing. */
export const BRITISH_ENGLISH_TRANSCRIPTION_PREFIX =
  'British English UK bar stock take. UK hospitality accent. Spirits and quantities: ';

/** ISO 639-1 language code passed to Whisper (no en-GB variant in the API). */
export const WHISPER_LANGUAGE_CODE = 'en';

export function applyBritishEnglishTranscriptionPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return BRITISH_ENGLISH_TRANSCRIPTION_PREFIX.trim();
  }
  if (trimmed.toLowerCase().startsWith('british english')) {
    return trimmed;
  }
  return `${BRITISH_ENGLISH_TRANSCRIPTION_PREFIX}${trimmed}`;
}
