import type { MatchableCatalogEntry } from '@/services/matcher';
import type { ParsedUtterance } from '@/types';
import type { ParserService } from './types';
import { buildHospitalityParserPrompt, buildParserCatalogHint } from './catalogHint';
import { normalizeSpokenProductName } from './spokenName';
import { normalizeParsedUtterance, PARSED_UTTERANCE_JSON_SCHEMA } from './types';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAiParserService implements ParserService {
  async parse(transcript: string, catalog: MatchableCatalogEntry[]): Promise<ParsedUtterance> {
    const { env } = await import('@/config/env');
    if (!env.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Add it to your .env file.');
    }

    const catalogHint = buildParserCatalogHint(catalog);
    const systemPrompt = buildHospitalityParserPrompt(catalogHint);

    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'parsed_utterance',
            strict: true,
            schema: PARSED_UTTERANCE_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI parse failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty parse result');
    }

    return normalizeParsedUtterance(JSON.parse(content) as ParsedUtterance);
  }
}

const SPOKEN_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  a: 1,
  an: 1,
};

function parseSpokenQuantity(text: string): number | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('point six') || lower.includes('sixty percent') || lower.includes('60%')) {
    return 0.6;
  }
  if (lower.includes('one and a half')) return 1.5;
  if (lower.includes('half')) return 0.5;

  const digit = text.match(/(\d+(?:\.\d+)?)/);
  if (digit) return Number(digit[1]);

  for (const [word, value] of Object.entries(SPOKEN_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) return value;
  }

  return undefined;
}

function parseHospitalityPart(part: string): ParsedUtterance['items'][0] {
  const quantity = parseSpokenQuantity(part) ?? 1;
  let name = part
    .replace(/(\d+(?:\.\d+)?)/g, '')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, '')
    .replace(/\bpoint six\b/gi, '')
    .trim();
  name = normalizeSpokenProductName(name) || 'Unknown';
  return { name, quantity };
}

export class MockParserService implements ParserService {
  async parse(transcript: string, _catalog: MatchableCatalogEntry[]): Promise<ParsedUtterance> {
    const parts = transcript
      .split(/\s*,\s*|\s+and\s+/i)
      .map((p) => p.trim())
      .filter(Boolean);

    const items = (parts.length ? parts : [transcript]).map(parseHospitalityPart);
    return { items };
  }
}

export function createParserService(useMock = false): ParserService {
  if (useMock) {
    return new MockParserService();
  }
  return new OpenAiParserService();
}
