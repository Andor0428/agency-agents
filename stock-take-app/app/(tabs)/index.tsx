import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';
import { colors, spacing, typography } from '@/config/theme';

export default function CountScreen() {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <Screen
      title="Stock Take"
      subtitle="Hold to speak an item and quantity"
      scroll={false}
      footer={
        <View style={styles.micContainer}>
          <Button
            label={isRecording ? 'Recording… release to stop' : 'Hold to Talk'}
            onPress={() => setIsRecording((v) => !v)}
            variant={isRecording ? 'danger' : 'primary'}
            accessibilityLabel="Push to talk microphone button"
            style={styles.micButton}
          />
        </View>
      }
    >
      <PlaceholderCard
        title="Voice pipeline ready"
        description="Recording → Groq Whisper → GPT-4o-mini parse → fuzzy/phonetic match → confirm → persist. Full flow lands in milestone 4."
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session totals</Text>
        <Text style={styles.empty}>No items counted yet. Start a session from the Sessions tab.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    flex: 1,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
  micContainer: {
    alignItems: 'center',
  },
  micButton: {
    width: '100%',
    minHeight: 64,
  },
});
