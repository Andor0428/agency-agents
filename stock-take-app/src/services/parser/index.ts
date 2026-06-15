import type { ParsedUtterance } from '@/types';
import type { ParserService } from './types';
import { PARSED_UTTERANCE_JSON_SCHEMA, PARSED_UTTERANCE_RETAIL_JSON_SCHEMA } from './types';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAiParserService implements ParserService {
  constructor(private readonly isRetail = false) {}

  async parse(transcript: string, catalogNames: string[]): Promise<ParsedUtterance> {
    const { env } = await import('@/config/env');
    if (!env.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Add it to your .env file.');
    }

    const schema = this.isRetail ? PARSED_UTTERANCE_RETAIL_JSON_SCHEMA : PARSED_UTTERANCE_JSON_SCHEMA;
    const retailHint = this.isRetail
      ? 'For retail, extract style/name, optional color, size, and SKU. Quantity is unit count (whole numbers).'
      : 'Quantity is always numeric. Unit is optional.';

    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: [
              'You parse spoken inventory counts into structured JSON.',
              'Handle multi-item utterances and spoken decimals (e.g. "point six" -> 0.6, "one and a half" -> 1.5).',
              retailHint,
              `Known catalog items: ${catalogNames.join(', ')}`,
            ].join(' '),
          },
          { role: 'user', content: transcript },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'parsed_utterance',
            strict: true,
            schema,
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

    return JSON.parse(content) as ParsedUtterance;
  }
}

const SIZE_WORDS: Record<string, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
  'extra large': 'XL',
  extralarge: 'XL',
};

function parseRetailPart(part: string): ParsedUtterance['items'][0] {
  const lower = part.toLowerCase();
  const skuMatch = part.match(/\bSKU\s*[-\s]?([A-Z0-9-]+)/i);
  const numberMatches = [...part.matchAll(/(\d+(?:\.\d+)?)/g)];
  const quantity = numberMatches.length
    ? Number(numberMatches[numberMatches.length - 1][1])
    : 1;

  let size: string | undefined;
  const sizeWord = Object.keys(SIZE_WORDS).find((word) => lower.includes(word));
  if (sizeWord) {
    size = SIZE_WORDS[sizeWord];
  } else {
    const sizeNum = part.match(/\bsize\s*(\d+|[xsml]+)\b/i);
    if (sizeNum) size = sizeNum[1].toUpperCase();
  }

  const colors = [
    'black',
    'white',
    'blue',
    'grey',
    'gray',
    'red',
    'green',
    'navy',
    'tan',
    'brown',
    'khaki',
  ];
  const color = colors.find((c) => lower.includes(c));

  let name = part
    .replace(/\bSKU\s*[-\s]?[A-Z0-9-]+/gi, '')
    .replace(/(\d+(?:\.\d+)?)/g, '')
    .replace(/\b(size|pair|units?|each)\b/gi, '')
    .replace(
      /\b(black|white|blue|grey|gray|red|green|navy|tan|brown|khaki|small|medium|large)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) name = 'Unknown';

  return {
    name,
    quantity,
    color: color ? color.replace('gray', 'grey') : undefined,
    size,
    sku: skuMatch?.[1],
  };
}

export class MockParserService implements ParserService {
  constructor(private readonly isRetail = false) {}

  async parse(transcript: string, _catalogNames: string[]): Promise<ParsedUtterance> {
    const parts = transcript
      .split(/\s*,\s*|\s+and\s+/i)
      .map((p) => p.trim())
      .filter(Boolean);

    if (this.isRetail) {
      const items = (parts.length ? parts : [transcript]).map(parseRetailPart);
      return { items };
    }

    const items = (parts.length ? parts : [transcript]).map((part) => {
      const lower = part.toLowerCase();
      const pointSix = lower.includes('point six');
      const numberMatch = part.match(/(\d+(?:\.\d+)?)/);
      const quantity = pointSix ? 0.6 : numberMatch ? Number(numberMatch[1]) : 1;
      const name = part.replace(/(\d+(?:\.\d+)?|point six)/gi, '').trim() || 'Unknown';
      return { name, quantity };
    });

    return { items };
  }
}

export function createParserService(useMock = false, isRetail = false): ParserService {
  if (useMock) {
    return new MockParserService(isRetail);
  }
  return new OpenAiParserService(isRetail);
}
