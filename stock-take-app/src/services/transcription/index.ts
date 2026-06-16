import * as FileSystem from 'expo-file-system/legacy';
import { env } from '@/config/env';
import type { TranscriptionService } from './types';

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export class GroqWhisperTranscriptionService implements TranscriptionService {
  async transcribe(audioUri: string, catalogPrompt: string): Promise<string> {
    if (!env.groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured. Add it to your .env file.');
    }

    const parameters: Record<string, string> = {
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
    };
    if (catalogPrompt.trim()) {
      parameters.prompt = catalogPrompt.trim();
    }

    // RN 0.85 fetch+FormData file uploads throw "Unsupported FormDataPart implementation".
    // Native multipart upload via expo-file-system avoids that regression.
    const response = await FileSystem.uploadAsync(GROQ_TRANSCRIPTION_URL, audioUri, {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'audio/m4a',
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

export function createTranscriptionService(
  useMock = false,
  mockText = 'Belvedere 2'
): TranscriptionService {
  if (useMock) {
    return new MockTranscriptionService(mockText);
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
