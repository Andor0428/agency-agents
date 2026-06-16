/** Groq Whisper `prompt` is limited to 224 tokens (~800 chars). */
export const WHISPER_PROMPT_MAX_CHARS = 800;

export function truncateWhisperPrompt(prompt: string, maxChars = WHISPER_PROMPT_MAX_CHARS): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const slice = trimmed.slice(0, maxChars);
  const lastComma = slice.lastIndexOf(',');
  if (lastComma > maxChars * 0.5) {
    return slice.slice(0, lastComma).trim();
  }
  return slice.trim();
}
