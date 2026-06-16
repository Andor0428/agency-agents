import {
  pcmChunkVolume,
  splitPcmIntoChunks,
  WISPR_CHUNK_SECONDS,
  WISPR_SAMPLE_RATE,
} from './audio.js';

const WISPR_WS_BASE = 'wss://platform-api.wisprflow.ai/api/v1/dash/ws';
const SESSION_TIMEOUT_MS = 120_000;

export type WisprFlowContext = {
  apiKey: string;
  dictionary: string[];
  localeLabel: string;
};

export type WisprFlowTextResponse = {
  status: 'text';
  position?: number;
  final?: boolean;
  body?: {
    text?: string;
    detected_language?: string;
  };
};

export type WisprFlowServerMessage =
  | { status: 'auth' }
  | { status: 'info'; message?: { event?: string } }
  | WisprFlowTextResponse
  | { status: 'error'; error?: string; message?: string };

export function buildWisprWebSocketUrl(apiKey: string): string {
  return `${WISPR_WS_BASE}?api_key=${encodeURIComponent(`Bearer ${apiKey}`)}`;
}

export function buildWisprAuthMessage(context: WisprFlowContext): Record<string, unknown> {
  return {
    type: 'auth',
    access_token: context.apiKey,
    language: ['en'],
    context: {
      app: {
        name: `Stock Take — ${context.localeLabel}`,
        type: 'other',
      },
      dictionary_context: context.dictionary,
    },
  };
}

export function buildWisprAppendMessage(
  position: number,
  chunk: Buffer,
  packetDuration = WISPR_CHUNK_SECONDS
): Record<string, unknown> {
  return {
    type: 'append',
    position,
    audio_packets: {
      packets: [chunk.toString('base64')],
      volumes: [pcmChunkVolume(chunk)],
      packet_duration: packetDuration,
      audio_encoding: 'wav',
      byte_encoding: 'base64',
    },
  };
}

export function parseWisprServerMessage(raw: string): WisprFlowServerMessage {
  return JSON.parse(raw) as WisprFlowServerMessage;
}

export function extractTranscriptFromMessages(messages: WisprFlowServerMessage[]): {
  text: string;
  detectedLanguage?: string;
} {
  let text = '';
  let detectedLanguage: string | undefined;

  for (const message of messages) {
    if (message.status !== 'text' || !message.body?.text) continue;
    text = message.body.text;
    detectedLanguage = message.body.detected_language ?? detectedLanguage;
  }

  return { text: text.trim(), detectedLanguage };
}

export async function transcribePcmViaWebSocket(
  pcm: Buffer,
  context: WisprFlowContext
): Promise<{ text: string; detectedLanguage?: string }> {
  const chunks = splitPcmIntoChunks(pcm, WISPR_SAMPLE_RATE, WISPR_CHUNK_SECONDS);
  const wsUrl = buildWisprWebSocketUrl(context.apiKey);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const responses: WisprFlowServerMessage[] = [];
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (error) {
        reject(error);
        return;
      }

      const { text, detectedLanguage } = extractTranscriptFromMessages(responses);
      if (!text) {
        reject(new Error('Wispr Flow returned an empty transcript.'));
        return;
      }

      resolve({ text, detectedLanguage });
    };

    const timeout = setTimeout(() => {
      ws.close();
      finish(new Error('Wispr Flow WebSocket timed out waiting for transcription.'));
    }, SESSION_TIMEOUT_MS);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify(buildWisprAuthMessage(context)));
    });

    ws.addEventListener('message', (event) => {
      let message: WisprFlowServerMessage;
      try {
        message = parseWisprServerMessage(String(event.data));
      } catch {
        finish(new Error('Wispr Flow returned invalid JSON.'));
        return;
      }

      responses.push(message);

      if (message.status === 'auth') {
        for (let position = 0; position < chunks.length; position += 1) {
          ws.send(JSON.stringify(buildWisprAppendMessage(position, chunks[position]!)));
        }
        ws.send(JSON.stringify({ type: 'commit', total_packets: chunks.length }));
        return;
      }

      if (message.status === 'error') {
        ws.close();
        finish(new Error(message.error ?? message.message ?? 'Wispr Flow transcription failed.'));
        return;
      }

      if (message.status === 'text' && message.final) {
        ws.close();
        finish();
      }
    });

    ws.addEventListener('error', () => {
      finish(new Error('Wispr Flow WebSocket connection error.'));
    });

    ws.addEventListener('close', () => {
      if (settled) return;

      const { text } = extractTranscriptFromMessages(responses);
      if (text) {
        finish();
        return;
      }

      finish(new Error('Wispr Flow WebSocket closed before transcription completed.'));
    });
  });
}
