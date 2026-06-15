import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/config/theme';

interface PromptModalProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({
  visible,
  title,
  message,
  placeholder,
  submitLabel = 'OK',
  onSubmit,
  onCancel,
}: PromptModalProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    onSubmit(value);
    setValue('');
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={handleCancel} accessibilityLabel="Dismiss dialog" />
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <FormField
            label="Name"
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            autoFocus
          />
          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={handleCancel} />
            <Button label={submitLabel} onPress={handleSubmit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdropPress: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
