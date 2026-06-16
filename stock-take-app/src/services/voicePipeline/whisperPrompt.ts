import type { MatchableCatalogEntry } from '@/services/matcher';
import { truncateWhisperPrompt } from '@/services/transcription/whisperPrompt';

/** Whisper priming works best as example utterances, not bare word lists. */
export function buildWhisperPrompt(catalog: MatchableCatalogEntry[]): string {
  const snippets: string[] = [];

  for (const entry of catalog) {
    if (!entry.item.is_active) continue;
    snippets.push(`${entry.item.name} 2`);
    for (const alias of entry.aliases) {
      if (alias.alias_text.trim()) {
        snippets.push(`${alias.alias_text} 1`);
      }
    }
  }

  const examples = snippets.slice(0, 50).join(', ');
  const prefix = 'Bar stock take spirits: ';
  return truncateWhisperPrompt(`${prefix}${examples}`);
}
