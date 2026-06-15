import { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing, typography } from '@/config/theme';
import { env, hasGroqKey, hasOpenAiKey, hasGoogleSheetsConfig } from '@/config/env';
import { loadSettings, saveSettings } from '@/config/settings';
import type { AppSettings } from '@/types';

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
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
    }, [])
  );

  const toggleMock = async (value: boolean) => {
    const updated = await saveSettings({ useMockServices: value });
    setSettings(updated);
  };

  return (
    <Screen title="Settings" subtitle="API keys, defaults, and voice pipeline mode">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Voice pipeline</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Use mock services</Text>
            <Text style={styles.hint}>
              Mock transcription and parsing — no API keys required
            </Text>
          </View>
          <Switch
            accessibilityLabel="Use mock voice services"
            value={settings?.useMockServices ?? true}
            onValueChange={toggleMock}
            trackColor={{ false: colors.border, true: colors.accentMuted }}
            thumbColor={colors.text}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>API keys</Text>
        <StatusRow label="Groq (Whisper)" configured={hasGroqKey()} />
        <StatusRow label="OpenAI (Parser)" configured={hasOpenAiKey()} />
        <StatusRow label="Google Sheets" configured={hasGoogleSheetsConfig()} />
        <Text style={styles.hint}>
          Add keys to .env for live APIs. Spreadsheet sync setup comes later.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Defaults</Text>
        <Text style={styles.value}>Confidence threshold: {env.confidenceThreshold}</Text>
        <Text style={styles.value}>Default location: {settings?.defaultLocation ?? 'bar'}</Text>
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
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
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
