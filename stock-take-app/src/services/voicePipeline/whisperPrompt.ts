import type { MatchableCatalogEntry } from '@/services/matcher';
import { truncateWhisperPrompt } from '@/services/transcription/whisperPrompt';
import { applyBritishEnglishTranscriptionPrompt } from '@/services/transcription/locale';

/**
 * Whisper prompt: catalog NAMES only — no quantities.
 * Quantity examples in the prompt cause comma-separated hallucinations
 * like "Carpano 2, Carpano 3, Cp".
 */
export function buildWhisperPrompt(catalog: MatchableCatalogEntry[]): string {
  const names: string[] = [];

  for (const entry of catalog) {
    if (!entry.item.is_active) continue;
    names.push(entry.item.name);
    for (const alias of entry.aliases) {
      const aliasText = alias.alias_text.trim();
      if (aliasText) names.push(aliasText);
    }
  }

  const unique = [...new Set(names)];
  return truncateWhisperPrompt(`Bar spirits inventory: ${unique.slice(0, 80).join(', ')}`);
}
