import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, tapTarget } from '@/config/theme';

interface PushToTalkButtonProps {
  isRecording: boolean;
  disabled?: boolean;
  durationMs?: number;
  onPressIn: () => void;
  onPressOut: () => void;
}

export function PushToTalkButton({
  isRecording,
  disabled = false,
  durationMs = 0,
  onPressIn,
  onPressOut,
}: PushToTalkButtonProps) {
  const seconds = (durationMs / 1000).toFixed(1);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isRecording ? 'Release to stop recording' : 'Hold to talk'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.button,
        isRecording && styles.recording,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.icon}>{isRecording ? '◉' : '🎤'}</Text>
      <Text style={styles.label}>
        {isRecording ? `Recording ${seconds}s — release to stop` : 'Hold to Talk'}
      </Text>
      {isRecording ? (
        <View style={styles.waveRow}>
          <View style={[styles.waveBar, styles.waveBarTall]} />
          <View style={[styles.waveBar, styles.waveBarMid]} />
          <View style={[styles.waveBar, styles.waveBarTall]} />
          <View style={[styles.waveBar, styles.waveBarShort]} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: colors.micIdle,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  recording: {
    backgroundColor: colors.micActive,
    borderColor: colors.success,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
  icon: {
    fontSize: 28,
  },
  label: {
    ...typography.largeButton,
    color: colors.text,
    textAlign: 'center',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 20,
    marginTop: spacing.xs,
  },
  waveBar: {
    width: 6,
    backgroundColor: colors.text,
    borderRadius: 3,
  },
  waveBarTall: {
    height: 18,
  },
  waveBarMid: {
    height: 12,
  },
  waveBarShort: {
    height: 8,
  },
});
