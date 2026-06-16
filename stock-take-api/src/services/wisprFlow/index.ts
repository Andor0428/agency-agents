import { config } from '../../config.js';
import { preparePcm16kMono } from './audio.js';
import { transcribePcmViaWebSocket } from './websocket.js';

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
  let pcm: Buffer;

  try {
    pcm = await preparePcm16kMono(input.audioBase64, mimeType);
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

  return transcribePcmViaWebSocket(pcm, {
    apiKey,
    dictionary,
    localeLabel,
  });
}

export function isWisprFlowConfigured(): boolean {
  return config.wisprFlowApiKey.length > 0;
}

export {
  buildWisprAppendMessage,
  buildWisprAuthMessage,
  buildWisprWebSocketUrl,
  extractTranscriptFromMessages,
} from './websocket.js';

export { pcmChunkVolume, splitPcmIntoChunks, WISPR_CHUNK_SECONDS, WISPR_SAMPLE_RATE } from './audio.js';
