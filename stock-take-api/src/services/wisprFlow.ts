import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { config } from '../config.js';

const execFileAsync = promisify(execFile);

const WISPR_REST_URL = 'https://platform-api.wisprflow.ai/api/v1/dash/api';

export type WisprTranscribeInput = {
  audioBase64: string;
  mimeType?: string;
  dictionary?: string[];
  locale?: string;
};

export type WisprTranscribeResult = {
  text: string;
  detectedLanguage?: string;
};

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'm4a';
}

async function convertToWav16kMono(inputPath: string): Promise<Buffer> {
  const outPath = join(tmpdir(), `wispr-${randomUUID()}.wav`);
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      inputPath,
      '-ar',
      '16000',
      '-ac',
      '1',
      '-f',
      'wav',
      outPath,
    ]);
    return await readFile(outPath);
  } finally {
    await unlink(outPath).catch(() => undefined);
  }
}

async function prepareWavBuffer(audioBase64: string, mimeType: string): Promise<Buffer> {
  const inputPath = join(tmpdir(), `wispr-in-${randomUUID()}.${extensionForMime(mimeType)}`);
  const raw = Buffer.from(audioBase64, 'base64');

  try {
    await writeFile(inputPath, raw);

    if (mimeType.includes('wav')) {
      return raw;
    }

    return await convertToWav16kMono(inputPath);
  } finally {
    await unlink(inputPath).catch(() => undefined);
  }
}

export async function transcribeWithWisprFlow(
  input: WisprTranscribeInput
): Promise<WisprTranscribeResult> {
  const apiKey = config.wisprFlowApiKey;
  if (!apiKey) {
    throw new Error('WISPR_FLOW_API_KEY is not configured on the support API server.');
  }

  if (!input.audioBase64?.trim()) {
    throw new Error('No audio data provided.');
  }

  const mimeType = input.mimeType ?? 'audio/mp4';
  let wavBuffer: Buffer;

  try {
    wavBuffer = await prepareWavBuffer(input.audioBase64, mimeType);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audio conversion failed';
    throw new Error(
      `Could not prepare audio for Wispr Flow (ffmpeg required on server): ${message}`
    );
  }

  const dictionary = (input.dictionary ?? []).map((word) => word.trim()).filter(Boolean).slice(0, 200);
  const localeLabel =
    input.locale === 'en-GB' || !input.locale
      ? 'British English UK bar stock take'
      : `Stock take (${input.locale})`;

  const response = await fetch(WISPR_REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: wavBuffer.toString('base64'),
      language: ['en'],
      context: {
        app: {
          name: `Stock Take — ${localeLabel}`,
          type: 'other',
        },
        dictionary_context: dictionary,
      },
      properties: {
        language: 'en',
        app_type: 'other',
        dictionary,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Wispr Flow transcription failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const json = (await response.json()) as {
    text?: string;
    detected_language?: string;
  };

  const text = json.text?.trim() ?? '';
  if (!text) {
    throw new Error('Wispr Flow returned an empty transcript.');
  }

  return {
    text,
    detectedLanguage: json.detected_language,
  };
}

export function isWisprFlowConfigured(): boolean {
  return config.wisprFlowApiKey.length > 0;
}
