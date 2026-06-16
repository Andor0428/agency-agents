import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const WISPR_SAMPLE_RATE = 16_000;
export const WISPR_CHUNK_SECONDS = 1;

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'm4a';
}

async function convertToPcm16kMono(inputPath: string): Promise<Buffer> {
  const outPath = join(tmpdir(), `wispr-pcm-${randomUUID()}.raw`);
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      inputPath,
      '-ar',
      String(WISPR_SAMPLE_RATE),
      '-ac',
      '1',
      '-f',
      's16le',
      outPath,
    ]);
    return await readFile(outPath);
  } finally {
    await unlink(outPath).catch(() => undefined);
  }
}

export async function preparePcm16kMono(audioBase64: string, mimeType: string): Promise<Buffer> {
  const inputPath = join(tmpdir(), `wispr-in-${randomUUID()}.${extensionForMime(mimeType)}`);
  const raw = Buffer.from(audioBase64, 'base64');

  try {
    await writeFile(inputPath, raw);
    return await convertToPcm16kMono(inputPath);
  } finally {
    await unlink(inputPath).catch(() => undefined);
  }
}

export function splitPcmIntoChunks(
  pcm: Buffer,
  sampleRate = WISPR_SAMPLE_RATE,
  chunkSeconds = WISPR_CHUNK_SECONDS
): Buffer[] {
  const bytesPerChunk = sampleRate * 2 * chunkSeconds;
  if (bytesPerChunk <= 0 || pcm.length === 0) {
    return [Buffer.alloc(0)];
  }

  const chunks: Buffer[] = [];
  for (let offset = 0; offset < pcm.length; offset += bytesPerChunk) {
    chunks.push(pcm.subarray(offset, offset + bytesPerChunk));
  }
  return chunks;
}

/** RMS volume for Wispr append packets (0–1 range). */
export function pcmChunkVolume(chunk: Buffer): number {
  if (chunk.length < 2) return 0;

  const sampleCount = Math.floor(chunk.length / 2);
  let sum = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const sample = chunk.readInt16LE(i * 2) / 32768;
    sum += sample * sample;
  }
  return Math.sqrt(sum / sampleCount);
}
