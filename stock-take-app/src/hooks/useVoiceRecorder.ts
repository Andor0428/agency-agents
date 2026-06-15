import { useCallback, useEffect, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { deleteRecordingFile } from '@/services/transcription';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'denied' | 'error';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    }).catch(() => undefined);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setStatus('requesting');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setStatus('denied');
        setError('Microphone permission is required for voice counting.');
        return false;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');
      return true;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not start recording');
      return false;
    }
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recorderState.isRecording) {
      setStatus('idle');
      return null;
    }

    setStatus('processing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      setStatus('idle');
      return uri;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not stop recording');
      return null;
    }
  }, [recorder, recorderState.isRecording]);

  const cleanupRecording = useCallback(async (uri: string | null) => {
    if (uri) await deleteRecordingFile(uri);
  }, []);

  return {
    status,
    error,
    isRecording: recorderState.isRecording,
    durationMs: Math.round(recorderState.durationMillis ?? 0),
    metering: recorderState.metering,
    startRecording,
    stopRecording,
    cleanupRecording,
  };
}
