import * as FileSystem from 'expo-file-system/legacy';

const MIN_RECORDING_BYTES = 1000;

export async function assertRecordingReadable(audioUri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(audioUri);
  if (!info.exists) {
    throw new Error('Recording file is missing. Try recording again.');
  }

  const size = 'size' in info && typeof info.size === 'number' ? info.size : 0;
  if (size < MIN_RECORDING_BYTES) {
    throw new Error('Recording too short. Hold the button for at least 1 second while speaking.');
  }
}
