import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/config/theme';

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
}

export function Screen({ title, subtitle, children, scroll = true, footer, contentStyle }: ScreenProps) {
  const body = (
    <View style={[styles.content, !scroll && styles.contentFill, contentStyle]}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  contentFill: {
    flex: 1,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
});
