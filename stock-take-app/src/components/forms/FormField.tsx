import { ReactNode, useId, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing, tapTarget, typography } from '@/config/theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  children?: ReactNode;
}

export function FormField({ label, hint, children, style, ...inputProps }: FormFieldProps) {
  const fieldId = useId();
  const [focused, setFocused] = useState(false);

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
          placeholderTextColor={colors.textFaint}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, focused && styles.inputFocused, style]}
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
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  input: {
    minHeight: tapTarget.minHeight,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    ...typography.body,
  },
  inputFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceHover,
  },
  hint: {
    ...typography.caption,
    color: colors.textFaint,
  },
});
