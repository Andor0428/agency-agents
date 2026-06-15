import { ReactNode, useId } from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, spacing, tapTarget, typography } from '@/config/theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  children?: ReactNode;
}

export function FormField({ label, hint, children, style, ...inputProps }: FormFieldProps) {
  const fieldId = useId();

  return (
    <View style={styles.field}>
      <Text
        nativeID={fieldId}
        style={styles.label}
        accessibilityRole={Platform.OS === 'web' ? undefined : 'text'}
      >
        {label}
      </Text>
      {children ?? (
        <TextInput
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          accessibilityHint={hint}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          {...(Platform.OS === 'ios' ? { accessibilityLabelledBy: fieldId } : {})}
          {...inputProps}
        />
      )}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    minHeight: tapTarget.minHeight,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    color: colors.text,
    ...typography.body,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
