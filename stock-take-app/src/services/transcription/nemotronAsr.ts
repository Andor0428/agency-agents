import * as FileSystem from 'expo-file-system/legacy';
import { env, hasTogetherKey } from '@/config/env';
import { hasSupportApi, supportApi } from '@/config/supportApi';
import { ensureDeviceRegistered } from '@/services/support/client';
import type { TranscriptionService } from './types';
import { assertRecordingReadable } from './recording';
import { NEMOTRON_ASR_MODEL, NEMOTRON_LANGUAGE_CODE } from './nemotronConstants';
import { VOICE_RECOGNITION_LOCALE } from './locale';

const TOGETHER_TRANSCRIPTION_URL = 'https://api.together.xyz/v1/audio/transcriptions';

async function transcribeViaTogether(audioUri: string): Promise<string> {
  const response = await FileSystem.uploadAsync(TOGETHER_TRANSCRIPTION_URL, audioUri, {
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'audio/mp4',
    headers: {
      Authorization: `Bearer ${env.togetherApiKey}`,
    },
    parameters: {
      model: NEMOTRON_ASR_MODEL,
      language: NEMOTRON_LANGUAGE_CODE,
      response_format: 'json',
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Nemotron ASR failed (${response.status}): ${response.body}`);
  }

  const json = JSON.parse(response.body) as { text?: string };
  return json.text?.trim() ?? '';
}

async function transcribeViaSupportApi(audioUri: string): Promise<string> {
  const credentials = await ensureDeviceRegistered();
  const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch(`${supportApi.baseUrl}/api/device/voice/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': credentials.deviceId,
      'X-Device-Secret': credentials.deviceSecret,
    },
    body: JSON.stringify({
      engine: 'nemotron',
      audioBase64,
      mimeType: 'audio/mp4',
      locale: VOICE_RECOGNITION_LOCALE,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Nemotron ASR failed (${response.status})`);
  }

  const json = (await response.json()) as { text?: string };
  return json.text?.trim() ?? '';
}

export class NemotronAsrTranscriptionService implements TranscriptionService {
  async transcribe(audioUri: string, _catalogPrompt: string): Promise<string> {
    if (!hasTogetherKey() && !hasSupportApi()) {
      throw new Error(
        'Nemotron ASR needs TOGETHER_API_KEY in .env, or SUPPORT_API_URL with TOGETHER_API_KEY on stock-take-api.'
      );
    }

    await assertRecordingReadable(audioUri);

    if (hasTogetherKey()) {
      return transcribeViaTogether(audioUri);
    }

    return transcribeViaSupportApi(audioUri);
  }
}
