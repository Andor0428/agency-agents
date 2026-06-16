import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/config/theme';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info';

interface StatusMessageProps {
  message: string;
  variant?: StatusVariant;
  live?: boolean;
}

const config: Record<
  StatusVariant,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  success: { color: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' },
  warning: { color: colors.warning, bg: colors.warningSoft, icon: 'alert-circle' },
  error: { color: colors.danger, bg: colors.dangerSoft, icon: 'close-circle' },
  info: { color: colors.accent, bg: colors.accentSoft, icon: 'information-circle' },
};

export function StatusMessage({ message, variant = 'info', live = false }: StatusMessageProps) {
  const c = config[variant];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion={live ? 'polite' : undefined}
      style={[styles.box, { backgroundColor: c.bg, borderColor: c.color }]}
    >
      <Ionicons name={c.icon} size={18} color={c.color} style={styles.icon} />
      <Text style={[styles.text, { color: c.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    ...typography.caption,
    flex: 1,
    fontWeight: '600',
  },
});
