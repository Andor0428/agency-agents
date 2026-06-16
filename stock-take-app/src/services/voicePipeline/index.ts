import type { MatchResult, ParsedUtterance } from '@/types';
import { createParserService } from '@/services/parser';
import { matchItemName, needsConfirmation, type MatchableCatalogEntry } from '@/services/matcher';
import { normalizeSpokenProductName } from '@/services/parser/spokenName';
import { matchRetailItem, retailNeedsVariantReview } from '@/services/matcher/retailMatch';
import { createTranscriptionService } from '@/services/transcription';
import { loadSettings } from '@/config/settings';
import type { PipelineCountItem, VoicePipelineRunResult } from './types';

export interface VoicePipelineConfig {
  useMockServices?: boolean;
  mockTranscript?: string;
  confidenceThreshold?: number;
  minScoreGap?: number;
  isRetail?: boolean;
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
      config.mockTranscript
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
    const parsed = await this.parser.parse(transcript, entries);

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
      ...overrides,
      useMockServices: useMock,
    },
    getCatalog,
    buildCatalogPrompt
  );
}

export function buildCatalogPrompt(catalog: MatchableCatalogEntry[]): string {
  const names: string[] = [];
  for (const entry of catalog) {
    const parts = [entry.item.name];
    if (entry.item.color) parts.push(entry.item.color);
    if (entry.item.size) parts.push(`size ${entry.item.size}`);
    if (entry.item.sku) parts.push(entry.item.sku);
    names.push(parts.join(' '));
    for (const alias of entry.aliases) {
      names.push(alias.alias_text);
    }
  }
  return names.join(', ');
}

export function getMatchCandidates(match: MatchResult) {
  const candidates = [];
  if (match.best) candidates.push(match.best);
  candidates.push(...match.runnersUp);
  return candidates.slice(0, 5);
}
