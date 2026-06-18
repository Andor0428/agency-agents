import { BRITISH_ENGLISH_TRANSCRIPTION_PREFIX } from './locale';

/** Extract spirit/product names from the Whisper/Wispr catalog priming string. */
export function dictionaryFromCatalogPrompt(catalogPrompt: string): string[] {
  const trimmed = catalogPrompt.trim();
  if (!trimmed) return [];

  let body = trimmed;
  if (body.toLowerCase().startsWith('british english')) {
    body = body.slice(BRITISH_ENGLISH_TRANSCRIPTION_PREFIX.length).trim();
  }

  const prefixes = ['Bar spirits inventory: ', 'Bar stock take spirits: '];
  for (const prefix of prefixes) {
    if (body.startsWith(prefix)) {
      body = body.slice(prefix.length);
      break;
    }
  }

  return [...new Set(body.split(',').map((name) => name.trim()).filter(Boolean))].slice(0, 200);
}
