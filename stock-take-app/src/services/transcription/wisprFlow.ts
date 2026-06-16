import * as FileSystem from 'expo-file-system/legacy';
import { hasSupportApi, supportApi } from '@/config/supportApi';
import { ensureDeviceRegistered } from '@/services/support/client';
import type { TranscriptionService } from './types';
import { dictionaryFromCatalogPrompt } from './dictionaryFromPrompt';
import { assertRecordingReadable } from './recording';
import { VOICE_RECOGNITION_LOCALE } from './locale';

export class WisprFlowTranscriptionService implements TranscriptionService {
  async transcribe(audioUri: string, catalogPrompt: string): Promise<string> {
    if (!hasSupportApi()) {
      throw new Error(
        'Wispr Flow needs SUPPORT_API_URL in .env pointing at stock-take-api (e.g. http://192.168.1.x:3001).'
      );
    }

    await assertRecordingReadable(audioUri);

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
        audioBase64,
        mimeType: 'audio/mp4',
        dictionary: dictionaryFromCatalogPrompt(catalogPrompt),
        locale: VOICE_RECOGNITION_LOCALE,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Wispr Flow failed (${response.status})`);
    }

    const json = (await response.json()) as { text?: string };
    return json.text?.trim() ?? '';
  }
}
