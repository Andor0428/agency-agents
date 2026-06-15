import { env } from '@/config/env';
import type { ParsedUtterance } from '@/types';
import type { ParserService } from './types';
import { PARSED_UTTERANCE_JSON_SCHEMA } from './types';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAiParserService implements ParserService {
  async parse(transcript: string, catalogNames: string[]): Promise<ParsedUtterance> {
    if (!env.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Add it to your .env file.');
    }

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
              'Quantity is always numeric. Unit is optional.',
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

    return JSON.parse(content) as ParsedUtterance;
  }
}

export class MockParserService implements ParserService {
  async parse(transcript: string, _catalogNames: string[]): Promise<ParsedUtterance> {
    const parts = transcript
      .split(/\s*,\s*|\s+and\s+/i)
      .map((p) => p.trim())
      .filter(Boolean);

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

export function createParserService(useMock = false): ParserService {
  if (useMock) {
    return new MockParserService();
  }
  return new OpenAiParserService();
}
