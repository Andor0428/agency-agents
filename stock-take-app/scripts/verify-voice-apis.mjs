#!/usr/bin/env node
/**
 * End-to-end API verification for voice stock-take.
 * Run from stock-take-app: npm run verify:apis
 *
 * Requires stock-take-app/.env with GROQ_API_KEY and OPENAI_API_KEY.
 */
import { config as loadEnv } from 'dotenv';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

loadEnv({ path: join(process.cwd(), '.env') });

const PARSED_UTTERANCE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: ['string', 'null'] },
        },
        required: ['name', 'quantity', 'unit'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

function trimKey(value) {
  return (value ?? '').trim().replace(/^['"]|['"]$/g, '');
}

function fingerprint(key) {
  if (!key) return '(empty)';
  if (key.length <= 8) return '***';
  return `${key.slice(0, 4)}…${key.slice(-4)} (${key.length} chars)`;
}

function pass(label, detail = '') {
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail = '') {
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}

function warn(label, detail = '') {
  console.log(`  ⚠️  ${label}${detail ? ` — ${detail}` : ''}`);
}

function createSilentWav(durationSec = 1, sampleRate = 16000) {
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function testGroqKey(groqKey) {
  console.log('\n── Groq (Whisper transcription) ──');

  if (!groqKey) {
    fail('GROQ_API_KEY missing in .env');
    return false;
  }

  if (!groqKey.startsWith('gsk_')) {
    warn('GROQ_API_KEY format', `expected gsk_ prefix, got ${fingerprint(groqKey)}`);
  } else {
    pass('GROQ_API_KEY format', fingerprint(groqKey));
  }

  const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${groqKey}` },
  });
  if (!modelsRes.ok) {
    fail('Groq auth / models', `${modelsRes.status} ${await modelsRes.text()}`);
    return false;
  }
  pass('Groq auth', `HTTP ${modelsRes.status}`);

  const tmpDir = mkdtempSync(join(tmpdir(), 'stocktake-verify-'));
  const wavPath = join(tmpDir, 'silence.wav');
  writeFileSync(wavPath, createSilentWav());

  try {
    const wav = readFileSync(wavPath);
    const form = new FormData();
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'silence.wav');
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');
    form.append('language', 'en');

    const txRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: form,
    });

    if (!txRes.ok) {
      const body = await txRes.text();
      if (txRes.status === 400 && body.includes('too short')) {
        pass('Groq transcription endpoint', 'reachable (silence clip rejected as expected)');
        return true;
      }
      fail('Groq transcription', `${txRes.status} ${body.slice(0, 300)}`);
      return false;
    }

    const json = await txRes.json();
    pass('Groq transcription', `HTTP ${txRes.status}, text="${json.text ?? ''}"`);
    return true;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function testOpenAiKey(openaiKey) {
  console.log('\n── OpenAI (GPT-4o-mini parse) ──');

  if (!openaiKey) {
    fail('OPENAI_API_KEY missing in .env');
    return false;
  }

  if (!openaiKey.startsWith('sk-')) {
    warn('OPENAI_API_KEY format', `expected sk- prefix, got ${fingerprint(openaiKey)}`);
  } else {
    pass('OPENAI_API_KEY format', fingerprint(openaiKey));
  }

  const modelsRes = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${openaiKey}` },
  });
  if (!modelsRes.ok) {
    fail('OpenAI auth / models', `${modelsRes.status} ${await modelsRes.text()}`);
    return false;
  }
  pass('OpenAI auth', `HTTP ${modelsRes.status}`);

  const parseRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Extract inventory counts from natural speech. "two grey goose" -> name grey goose, quantity 2, unit null.',
        },
        { role: 'user', content: 'two grey goose and one belvedere point six' },
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

  if (!parseRes.ok) {
    fail('OpenAI structured parse', `${parseRes.status} ${await parseRes.text()}`);
    return false;
  }

  const json = await parseRes.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    fail('OpenAI structured parse', 'empty response');
    return false;
  }

  const parsed = JSON.parse(content);
  const itemCount = parsed.items?.length ?? 0;
  pass('OpenAI structured parse', `HTTP ${parseRes.status}, ${itemCount} item(s)`);
  console.log(`     → ${content.slice(0, 200)}${content.length > 200 ? '…' : ''}`);
  return true;
}

function checkEnvFile() {
  console.log('── Environment file ──');
  try {
    readFileSync(join(process.cwd(), '.env'), 'utf8');
    pass('.env file found');
    return true;
  } catch {
    fail('.env file missing', 'copy .env.example → .env and add your keys');
    return false;
  }
}

function checkSchema() {
  console.log('\n── JSON schema (local) ──');
  const item = PARSED_UTTERANCE_JSON_SCHEMA.properties.items.items;
  if (item.required.includes('unit')) {
    pass("unit in required", item.required.join(', '));
  } else {
    fail("unit missing from required", item.required.join(', '));
    return false;
  }
  if (JSON.stringify(item.properties.unit) === JSON.stringify({ type: ['string', 'null'] })) {
    pass('unit is nullable string');
  } else {
    fail('unit type wrong', JSON.stringify(item.properties.unit));
    return false;
  }
  return true;
}

async function main() {
  console.log('Stock Take — voice API verification\n');

  const hasEnv = checkEnvFile();
  const schemaOk = checkSchema();

  const groqKey = trimKey(process.env.GROQ_API_KEY);
  const openaiKey = trimKey(process.env.OPENAI_API_KEY);
  const googleSheetsKey = trimKey(process.env.GOOGLE_SHEETS_API_KEY);
  const googleSpreadsheetId = trimKey(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);

  console.log('\n── Optional integrations ──');
  if (googleSheetsKey && googleSpreadsheetId) {
    pass('Google Sheets (legacy API key)', fingerprint(googleSheetsKey));
  } else {
    warn('Google Sheets (legacy)', 'GOOGLE_SHEETS_API_KEY + GOOGLE_SHEETS_SPREADSHEET_ID not both set');
  }

  let groqOk = false;
  let openaiOk = false;

  if (hasEnv && groqKey) groqOk = await testGroqKey(groqKey);
  if (hasEnv && openaiKey) openaiOk = await testOpenAiKey(openaiKey);

  console.log('\n══════════════════════════════════════');
  console.log('Summary');
  console.log('══════════════════════════════════════');
  console.log(`  Schema fix:     ${schemaOk ? '✅ OK' : '❌ FAIL'}`);
  console.log(`  Groq (Whisper): ${groqOk ? '✅ OK' : '❌ FAIL / skipped'}`);
  console.log(`  OpenAI (parse): ${openaiOk ? '✅ OK' : '❌ FAIL / skipped'}`);

  if (groqOk && openaiOk && schemaOk) {
    console.log('\nAll voice APIs look good. Next steps on your phone/simulator:');
    console.log('  1. Settings → turn OFF mock mode');
    console.log('  2. npx expo start --clear');
    console.log('  3. Hold to Talk → say "two grey goose"');
    process.exit(0);
  }

  console.log('\nFix the failures above, then re-run: npm run verify:apis');
  process.exit(1);
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
