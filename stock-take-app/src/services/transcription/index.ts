import * as FileSystem from 'expo-file-system/legacy';
import { env } from '@/config/env';
import type { TranscriptionService } from './types';
import { truncateWhisperPrompt } from './whisperPrompt';
import { assertRecordingReadable } from './recording';
import { WisprFlowTranscriptionService } from './wisprFlow';

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export class GroqWhisperTranscriptionService implements TranscriptionService {
  async transcribe(audioUri: string, catalogPrompt: string): Promise<string> {
    if (!env.groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured. Add it to your .env file.');
    }

    await assertRecordingReadable(audioUri);

    const parameters: Record<string, string> = {
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      language: 'en',
    };

    const prompt = truncateWhisperPrompt(catalogPrompt);
    if (prompt) {
      parameters.prompt = prompt;
    }

    const response = await FileSystem.uploadAsync(GROQ_TRANSCRIPTION_URL, audioUri, {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'audio/mp4',
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      parameters,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Groq transcription failed (${response.status}): ${response.body}`);
    }

    const json = JSON.parse(response.body) as { text?: string };
    return json.text?.trim() ?? '';
  }
}

export class MockTranscriptionService implements TranscriptionService {
  constructor(private readonly mockText = 'Belvedere 2') {}

  async transcribe(_audioUri: string, _catalogPrompt: string): Promise<string> {
    return this.mockText;
  }
}

export type TranscriptionProvider = 'groq' | 'wispr';

export function createTranscriptionService(
  useMock = false,
  mockText = 'Belvedere 2',
  provider: TranscriptionProvider = 'groq'
): TranscriptionService {
  if (useMock) {
    return new MockTranscriptionService(mockText);
  }
  if (provider === 'wispr') {
    return new WisprFlowTranscriptionService();
  }
  return new GroqWhisperTranscriptionService();
}

export async function deleteRecordingFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort cleanup
  }
}
