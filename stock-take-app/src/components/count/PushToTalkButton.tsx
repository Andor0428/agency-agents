import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, radii, shadows, spacing, typography } from '@/config/theme';

interface PushToTalkButtonProps {
  isRecording: boolean;
  disabled?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

const RecordingTimer = memo(function RecordingTimer() {
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    setDurationMs(0);
    const interval = setInterval(() => {
      setDurationMs(Date.now() - startedAt);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const seconds = (durationMs / 1000).toFixed(1);
  return (
    <Text style={styles.label} numberOfLines={1}>
      Recording <Text style={styles.timer}>{seconds}s</Text> — release
    </Text>
  );
});

export const PushToTalkButton = memo(function PushToTalkButton({
  isRecording,
  disabled = false,
  onPressIn,
  onPressOut,
}: PushToTalkButtonProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const holdingRef = useRef(false);

  useEffect(() => {
    if (!isRecording) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  const beginHold = () => {
    if (disabled || holdingRef.current) return;
    holdingRef.current = true;
    onPressIn();
  };

  const endHold = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    onPressOut();
  };

  const pointerProps =
    Platform.OS === 'web'
      ? ({
          onPointerDown: (event: { pointerId: number; currentTarget: { setPointerCapture: (id: number) => void } }) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            beginHold();
          },
          onPointerUp: () => endHold(),
          onPointerCancel: () => endHold(),
        } as const)
      : {};

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            opacity: isRecording ? ringOpacity : 0,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Release to stop recording' : 'Hold to talk'}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={Platform.OS === 'web' ? undefined : beginHold}
        onPressOut={Platform.OS === 'web' ? undefined : endHold}
        {...pointerProps}
        style={({ pressed }) => [
          styles.button,
          isRecording ? styles.buttonRecording : styles.buttonIdle,
          pressed && !disabled && !isRecording && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <LinearGradient
          colors={isRecording ? gradients.mic : gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          <Ionicons
            name={isRecording ? 'radio-button-on' : 'mic'}
            size={26}
            color="#FFFFFF"
          />
          {isRecording ? (
            <RecordingTimer />
          ) : (
            <Text style={styles.label}>Hold to Talk</Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: '100%',
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.micActive,
  },
  button: {
    width: '100%',
    minHeight: 72,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  buttonIdle: {
    ...shadows.glow,
  },
  buttonRecording: {
    ...shadows.micGlow,
  },
  fill: {
    flex: 1,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    ...typography.largeButton,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  timer: {
    ...typography.largeButton,
    fontSize: 18,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    textAlign: 'center',
  },
});
