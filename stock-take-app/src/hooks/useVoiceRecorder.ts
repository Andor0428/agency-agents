import { useCallback, useEffect, useState } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type RecorderState,
} from 'expo-audio';
import { deleteRecordingFile } from '@/services/transcription';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'denied' | 'error';

const IDLE_RECORDER_STATE: RecorderState = {
  canRecord: false,
  isRecording: false,
  durationMillis: 0,
  mediaServicesDidReset: false,
  url: null,
};

function readRecorderState(
  recorder: ReturnType<typeof useAudioRecorder>
): RecorderState | null {
  try {
    return recorder.getStatus();
  } catch {
    // AppContextLost during fast refresh / reload — native recorder is gone.
    return null;
  }
}

/** Polls recorder status without crashing when Expo reloads native modules. */
function useSafeAudioRecorderState(
  recorder: ReturnType<typeof useAudioRecorder>,
  active: boolean,
  intervalMs = 200
): RecorderState {
  const [state, setState] = useState<RecorderState>(() => {
    return readRecorderState(recorder) ?? IDLE_RECORDER_STATE;
  });

  useEffect(() => {
    if (!active) {
      setState(IDLE_RECORDER_STATE);
      return;
    }

    const poll = () => {
      const next = readRecorderState(recorder);
      if (!next) return;

      setState((prev) => {
        if (
          prev.canRecord !== next.canRecord ||
          prev.isRecording !== next.isRecording ||
          prev.mediaServicesDidReset !== next.mediaServicesDidReset ||
          prev.url !== next.url ||
          Math.abs(prev.durationMillis - next.durationMillis) > 250
        ) {
          return next;
        }
        return prev;
      });
    };

    poll();
    const interval = setInterval(poll, intervalMs);
    return () => clearInterval(interval);
  }, [active, intervalMs, recorder]);

  return state;
}

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const recorderState = useSafeAudioRecorderState(recorder, status === 'recording', 200);

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
    if (status !== 'recording') {
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
  }, [recorder, status]);

  const cleanupRecording = useCallback(async (uri: string | null) => {
    if (uri) await deleteRecordingFile(uri);
  }, []);

  return {
    status,
    error,
    isRecording: status === 'recording',
    durationMs: Math.round(recorderState.durationMillis ?? 0),
    metering: recorderState.metering,
    startRecording,
    stopRecording,
    cleanupRecording,
  };
}
