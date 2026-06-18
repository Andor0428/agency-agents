import type { MatchResult, ParsedUtterance } from '@/types';
import { createParserService } from '@/services/parser';
import { matchItemName, needsConfirmation, type MatchableCatalogEntry } from '@/services/matcher';
import { normalizeSpokenProductName } from '@/services/parser/spokenName';
import { matchRetailItem, retailNeedsVariantReview } from '@/services/matcher/retailMatch';
import { createTranscriptionService, type TranscriptionProvider } from '@/services/transcription';
import { loadSettings } from '@/config/settings';
import { fallbackParseTranscript } from './fallbackParse';
import { consolidateParsedItems } from './consolidateParsedItems';
import type { PipelineCountItem, VoicePipelineRunResult } from './types';
import { buildWhisperPrompt } from './whisperPrompt';

export { buildWhisperPrompt };

export interface VoicePipelineConfig {
  useMockServices?: boolean;
  mockTranscript?: string;
  confidenceThreshold?: number;
  minScoreGap?: number;
  isRetail?: boolean;
  transcriptionProvider?: TranscriptionProvider;
}

export class VoicePipeline {
  private readonly transcription: ReturnType<typeof createTranscriptionService>;
  private readonly parser: ReturnType<typeof createParserService>;
  private readonly isRetail: boolean;

  constructor(
    private readonly config: VoicePipelineConfig = {},
    private readonly getCatalog: () => Promise<MatchableCatalogEntry[]>,
    private readonly buildCatalogPrompt: (catalog: MatchableCatalogEntry[]) => string
  ) {
    this.isRetail = config.isRetail ?? false;
    this.transcription = createTranscriptionService(
      config.useMockServices,
      config.mockTranscript,
      config.transcriptionProvider ?? 'groq'
    );
    this.parser = createParserService(config.useMockServices, this.isRetail);
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

    parsed = { items: consolidateParsedItems(parsed.items, entries) };

    if (parsed.items.length === 0 && transcript.trim()) {
      parsed = {
        items: consolidateParsedItems(fallbackParseTranscript(transcript, entries).items, entries),
      };
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
      const match = this.isRetail
        ? matchRetailItem({ ...item, name: matchQuery || item.name }, catalog)
        : matchItemName(matchQuery || item.name, catalog);

      const variantAmbiguous = this.isRetail && retailNeedsVariantReview(item, match, catalog);
      const itemNeedsConfirmation =
        needsConfirmation(match, threshold, minGap) || variantAmbiguous;

      return {
        key: `${Date.now()}-${index}`,
        parsedName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        parsedColor: item.color,
        parsedSize: item.size,
        parsedSku: item.sku,
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
  overrides?: VoicePipelineConfig
): Promise<VoicePipeline> {
  const settings = await loadSettings();
  const useMock = overrides?.useMockServices ?? settings.useMockServices;
  const isRetail = overrides?.isRetail ?? settings.businessType === 'retail';

  return new VoicePipeline(
    {
      confidenceThreshold: settings.confidenceThreshold,
      isRetail,
      transcriptionProvider: settings.transcriptionProvider,
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
