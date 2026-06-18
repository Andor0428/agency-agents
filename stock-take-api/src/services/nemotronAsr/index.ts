import { readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { config } from '../../config.js';
import { preparePcm16kMono, WISPR_SAMPLE_RATE } from '../wisprFlow/audio.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const NEMOTRON_ASR_MODEL = 'nvidia/nemotron-3.5-asr-streaming-0.6b';
const TOGETHER_TRANSCRIPTION_URL = 'https://api.together.xyz/v1/audio/transcriptions';

export type NemotronTranscribeInput = {
  audioBase64: string;
  mimeType?: string;
  locale?: string;
};

export type NemotronTranscribeResult = {
  text: string;
  detectedLanguage?: string;
};

/** Map app locale to Nemotron language-locale (supports en-GB natively). */
export function nemotronLanguageForLocale(locale?: string): string {
  if (!locale || locale === 'en-GB') return 'en-GB';
  if (locale === 'en-US') return 'en-US';
  if (locale.startsWith('en-')) return locale;
  return locale;
}

async function pcmToWav(pcm: Buffer, sampleRate = WISPR_SAMPLE_RATE): Promise<Buffer> {
  const outPath = join(tmpdir(), `nemotron-${randomUUID()}.wav`);
  const inPath = join(tmpdir(), `nemotron-${randomUUID()}.raw`);

  try {
    await writeFile(inPath, pcm);
    await execFileAsync('ffmpeg', [
      '-y',
      '-f',
      's16le',
      '-ar',
      String(sampleRate),
      '-ac',
      '1',
      '-i',
      inPath,
      outPath,
    ]);
    return await readFile(outPath);
  } finally {
    await unlink(inPath).catch(() => undefined);
    await unlink(outPath).catch(() => undefined);
  }
}

export async function transcribeWithNemotronAsr(
  input: NemotronTranscribeInput
): Promise<NemotronTranscribeResult> {
  const apiKey = config.togetherApiKey;
  if (!apiKey) {
    throw new Error('TOGETHER_API_KEY is not configured on the support API server.');
  }

  if (!input.audioBase64?.trim()) {
    throw new Error('No audio data provided.');
  }

  const mimeType = input.mimeType ?? 'audio/mp4';
  let wavBuffer: Buffer;

  try {
    const pcm = await preparePcm16kMono(input.audioBase64, mimeType);
    wavBuffer = await pcmToWav(pcm);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audio conversion failed';
    throw new Error(
      `Could not prepare audio for Nemotron ASR (ffmpeg required on server): ${message}`
    );
  }

  const language = nemotronLanguageForLocale(input.locale);
  const form = new FormData();
  form.append('model', NEMOTRON_ASR_MODEL);
  form.append('language', language);
  form.append('response_format', 'json');
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav');

  const response = await fetch(TOGETHER_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Nemotron ASR failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const json = (await response.json()) as { text?: string; language?: string };
  const text = json.text?.trim() ?? '';
  if (!text) {
    throw new Error('Nemotron ASR returned an empty transcript.');
  }

  return {
    text,
    detectedLanguage: json.language,
  };
}

export function isNemotronAsrConfigured(): boolean {
  return config.togetherApiKey.length > 0;
}
