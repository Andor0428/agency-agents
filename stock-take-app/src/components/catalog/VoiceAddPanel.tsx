import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/config/theme';
import { parseVoiceAddTranscript } from '@/services/voiceAdd/parseVoiceAdd';
import type { ItemFormValues } from '@/components/catalog/ItemForm';
import { itemToFormValues } from '@/components/catalog/ItemForm';

interface VoiceAddPanelProps {
  onParsed: (values: Partial<ItemFormValues>) => void;
}

export function VoiceAddPanel({ onParsed }: VoiceAddPanelProps) {
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleParse = () => {
    const parsed = parseVoiceAddTranscript(transcript);
    if (!parsed?.name) {
      setMessage('Could not parse. Try: "new item, Hendrick\'s gin, 700ml, bottle"');
      return;
    }

    const base = itemToFormValues(null);
    onParsed({
      ...base,
      name: parsed.name,
      category: parsed.category ?? base.category,
      storage_location: parsed.storage_location ?? base.storage_location,
      base_unit: parsed.base_unit ?? base.base_unit,
      display_unit: parsed.display_unit ?? base.display_unit,
      container_size:
        parsed.container_size != null ? String(parsed.container_size) : base.container_size,
    });
    setMessage(`Parsed: ${parsed.name}`);
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Voice / quick add</Text>
      <Text style={styles.hint}>
        Say or type: &quot;new item, Hendrick&apos;s gin, 700ml, bottle&quot;
      </Text>
      <FormField
        label="Transcript"
        value={transcript}
        onChangeText={setTranscript}
        placeholder="new item, Hendrick's gin, 700ml, bottle"
        multiline
      />
      <Button label="Parse into form" onPress={handleParse} variant="secondary" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  message: {
    ...typography.caption,
    color: colors.success,
  },
});
