import type { MatchResult, ParsedUtterance } from '@/types';
import { createParserService } from '@/services/parser';
import { matchItemName, needsConfirmation, type MatchableCatalogEntry } from '@/services/matcher';
import { normalizeSpokenProductName } from '@/services/parser/spokenName';
import { createTranscriptionService } from '@/services/transcription';
import { loadSettings } from '@/config/settings';
import { fallbackParseTranscript } from './fallbackParse';
import type { PipelineCountItem, VoicePipelineRunResult } from './types';
import { buildWhisperPrompt } from './whisperPrompt';

export { buildWhisperPrompt };

export interface VoicePipelineConfig {
  useMockServices?: boolean;
  mockTranscript?: string;
  confidenceThreshold?: number;
  minScoreGap?: number;
}

export class VoicePipeline {
  private readonly transcription: ReturnType<typeof createTranscriptionService>;
  private readonly parser: ReturnType<typeof createParserService>;

  constructor(
    private readonly config: VoicePipelineConfig = {},
    private readonly getCatalog: () => Promise<MatchableCatalogEntry[]>,
    private readonly buildCatalogPrompt: (catalog: MatchableCatalogEntry[]) => string
  ) {
    this.transcription = createTranscriptionService(
      config.useMockServices,
      config.mockTranscript
    );
    this.parser = createParserService(config.useMockServices);
  }

  async run(audioUri: string): Promise<VoicePipelineRunResult> {
    const catalog = await this.getCatalog();
    const prompt = this.buildCatalogPrompt(catalog);

    const transcript = await this.transcription.transcribe(audioUri, prompt);
    return this.runFromTranscript(transcript, catalog);
  }

  async runFromTranscript(
    transcript: string,
    catalog?: MatchableCatalogEntry[]
  ): Promise<VoicePipelineRunResult> {
    const entries = catalog ?? (await this.getCatalog());
    let parsed = await this.parser.parse(transcript, entries);

    if (parsed.items.length === 0 && transcript.trim()) {
      parsed = fallbackParseTranscript(transcript, entries);
    }

    return this.buildResult(transcript, parsed, entries);
  }

  buildResult(
    transcript: string,
    parsed: ParsedUtterance,
    catalog: MatchableCatalogEntry[]
  ): VoicePipelineRunResult {
    const threshold = this.config.confidenceThreshold ?? 80;
    const minGap = this.config.minScoreGap ?? 10;

    const items: PipelineCountItem[] = parsed.items.map((item, index) => {
      const matchQuery = normalizeSpokenProductName(item.name);
      const match = matchItemName(matchQuery || item.name, catalog);
      const itemNeedsConfirmation = needsConfirmation(match, threshold, minGap);
      return {
        key: `${Date.now()}-${index}`,
        parsedName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        match,
        needsConfirmation: itemNeedsConfirmation,
      };
    });

    return {
      transcript,
      items,
      requiresConfirmation: items.some((i) => i.needsConfirmation),
    };
  }
}

export async function createVoicePipeline(
  getCatalog: () => Promise<MatchableCatalogEntry[]>,
  buildCatalogPrompt: (catalog: MatchableCatalogEntry[]) => string,
  overrides?: Partial<VoicePipelineConfig>
): Promise<VoicePipeline> {
  const settings = await loadSettings();
  const useMock = overrides?.useMockServices ?? settings.useMockServices;

  return new VoicePipeline(
    {
      confidenceThreshold: settings.confidenceThreshold,
      ...overrides,
      useMockServices: useMock,
    },
    getCatalog,
    buildCatalogPrompt
  );
}

export function buildCatalogPrompt(catalog: MatchableCatalogEntry[]): string {
  return buildWhisperPrompt(catalog);
}

export function getMatchCandidates(match: MatchResult) {
  const candidates = [];
  if (match.best) candidates.push(match.best);
  candidates.push(...match.runnersUp);
  return candidates.slice(0, 5);
}
