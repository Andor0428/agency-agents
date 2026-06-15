import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing, typography } from '@/config/theme';
import { env, hasGroqKey, hasOpenAiKey, hasGoogleSheetsConfig } from '@/config/env';

function StatusRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.badge, configured ? styles.ok : styles.missing]}>
        {configured ? 'Configured' : 'Missing'}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <Screen title="Settings" subtitle="API keys, defaults, and thresholds">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>API Keys</Text>
        <StatusRow label="Groq (Whisper)" configured={hasGroqKey()} />
        <StatusRow label="OpenAI (Parser)" configured={hasOpenAiKey()} />
        <StatusRow label="Google Sheets" configured={hasGoogleSheetsConfig()} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Defaults</Text>
        <Text style={styles.value}>Confidence threshold: {env.confidenceThreshold}</Text>
        <Text style={styles.hint}>Edit via CONFIDENCE_THRESHOLD in .env or in-app settings in a later milestone.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
  badge: {
    ...typography.caption,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ok: {
    backgroundColor: '#23863633',
    color: colors.success,
  },
  missing: {
    backgroundColor: '#F8514933',
    color: colors.danger,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
