import * as FileSystem from 'expo-file-system/legacy';
import { env } from '@/config/env';
import type { TranscriptionService } from './types';

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export class GroqWhisperTranscriptionService implements TranscriptionService {
  async transcribe(audioUri: string, catalogPrompt: string): Promise<string> {
    if (!env.groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured. Add it to your .env file.');
    }

    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    if (catalogPrompt.trim()) {
      formData.append('prompt', catalogPrompt);
    }

    const response = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Groq transcription failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as { text?: string };
    return json.text?.trim() ?? '';
  }
}

export class MockTranscriptionService implements TranscriptionService {
  constructor(private readonly mockText = 'Belvedere 2') {}

  async transcribe(_audioUri: string, _catalogPrompt: string): Promise<string> {
    return this.mockText;
  }
}

export function createTranscriptionService(useMock = false): TranscriptionService {
  if (useMock) {
    return new MockTranscriptionService();
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
