import type { MatchResult, ParsedUtterance } from '@/types';
import { createParserService } from '@/services/parser';
import { matchItemName, needsConfirmation, type MatchableCatalogEntry } from '@/services/matcher';
import { createTranscriptionService } from '@/services/transcription';
import { shouldUseMockServices } from '@/config/settings';

export interface VoicePipelineConfig {
  useMockServices?: boolean;
  confidenceThreshold?: number;
  minScoreGap?: number;
}

export interface VoicePipelineResult {
  transcript: string;
  parsed: ParsedUtterance;
  matches: MatchResult[];
  requiresConfirmation: boolean;
}

export class VoicePipeline {
  private readonly transcription: ReturnType<typeof createTranscriptionService>;
  private readonly parser: ReturnType<typeof createParserService>;

  constructor(
    private readonly config: VoicePipelineConfig = {},
    private readonly getCatalog: () => Promise<MatchableCatalogEntry[]>,
    private readonly buildCatalogPrompt: (catalog: MatchableCatalogEntry[]) => string
  ) {
    this.transcription = createTranscriptionService(config.useMockServices);
    this.parser = createParserService(config.useMockServices);
  }

  async run(audioUri: string): Promise<VoicePipelineResult> {
    const catalog = await this.getCatalog();
    const prompt = this.buildCatalogPrompt(catalog);

    const transcript = await this.transcription.transcribe(audioUri, prompt);
    const parsed = await this.parser.parse(
      transcript,
      catalog.map((c) => c.item.name)
    );

    const matches = parsed.items.map((item) => matchItemName(item.name, catalog));
    const threshold = this.config.confidenceThreshold ?? 80;
    const minGap = this.config.minScoreGap ?? 10;
    const requiresConfirmation = matches.some((m) => needsConfirmation(m, threshold, minGap));

    return { transcript, parsed, matches, requiresConfirmation };
  }
}

export async function createVoicePipeline(
  getCatalog: () => Promise<MatchableCatalogEntry[]>,
  buildCatalogPrompt: (catalog: MatchableCatalogEntry[]) => string,
  overrides?: VoicePipelineConfig
): Promise<VoicePipeline> {
  const useMock = overrides?.useMockServices ?? (await shouldUseMockServices());
  return new VoicePipeline({ ...overrides, useMockServices: useMock }, getCatalog, buildCatalogPrompt);
}

export function buildCatalogPrompt(catalog: MatchableCatalogEntry[]): string {
  const names: string[] = [];
  for (const entry of catalog) {
    names.push(entry.item.name);
    for (const alias of entry.aliases) {
      names.push(alias.alias_text);
    }
  }
  return names.join(', ');
}
