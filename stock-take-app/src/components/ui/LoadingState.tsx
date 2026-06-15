import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/config/theme';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <View style={styles.container} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.accent} />
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
  label: {
    ...typography.body,
    color: colors.textMuted,
  },
});
