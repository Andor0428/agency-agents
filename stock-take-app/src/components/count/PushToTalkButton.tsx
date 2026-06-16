import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, radii, shadows, spacing, typography } from '@/config/theme';

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
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(0);
    return undefined;
  }, [isRecording, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={styles.wrap}>
      {isRecording ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Release to stop recording' : 'Hold to talk'}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.button,
          !isRecording && shadows.glow,
          isRecording && shadows.micGlow,
          pressed && !disabled && styles.pressed,
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
          <Text style={styles.label}>
            {isRecording ? `Recording ${seconds}s — release` : 'Hold to Talk'}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

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
});
