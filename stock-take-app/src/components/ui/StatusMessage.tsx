import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/config/theme';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info';

interface StatusMessageProps {
  message: string;
  variant?: StatusVariant;
  live?: boolean;
}

const variantColors: Record<StatusVariant, string> = {
  success: colors.success,
  warning: colors.warning,
  error: colors.danger,
  info: colors.textMuted,
};

export function StatusMessage({ message, variant = 'info', live = false }: StatusMessageProps) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion={live ? 'polite' : undefined}
      style={[styles.box, variant === 'warning' && styles.warningBox, variant === 'error' && styles.errorBox]}
    >
      <Text style={[styles.text, { color: variantColors[variant] }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 8,
    padding: spacing.sm,
  },
  warningBox: {
    backgroundColor: '#D2992211',
  },
  errorBox: {
    backgroundColor: '#F8514911',
  },
  text: {
    ...typography.caption,
    fontWeight: '500',
  },
});
