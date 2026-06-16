import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, spacing, typography } from '@/config/theme';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <View style={styles.container} accessibilityLabel={label} accessibilityRole="progressbar">
      <LinearGradient
        colors={[colors.backgroundAlt, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient colors={gradients.accent} style={styles.badge}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.subheading,
    color: colors.textMuted,
  },
});
