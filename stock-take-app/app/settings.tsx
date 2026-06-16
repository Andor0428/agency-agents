import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { FormField } from '@/components/forms/FormField';
import { OptionChipGroup } from '@/components/forms/OptionChip';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { colors, radii, spacing, typography } from '@/config/theme';
import {
  env,
  hasGroqKey,
  hasOpenAiKey,
  hasGoogleSheetsConfig,
} from '@/config/env';
import { loadSettings, saveSettings } from '@/config/settings';
import { hasSupportApi } from '@/config/supportApi';
import { isSupportConfigured, updateOrgAlertEmail } from '@/services/support/client';
import { getRetailSubTypeLabel, getVerticalProfile } from '@/config/vertical';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type BusinessType,
  type StorageLocation,
  type TranscriptionProvider,
} from '@/types';

type SpreadsheetProvider = AppSettings['spreadsheetProvider'];

const PROVIDERS: Array<{ id: SpreadsheetProvider; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'google', label: 'Google Sheets' },
  { id: 'microsoft', label: 'Excel' },
];

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
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [thresholdText, setThresholdText] = useState('80');
  const [alertEmailText, setAlertEmailText] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await loadSettings();
      setSettings(loaded);
      setThresholdText(String(loaded.confidenceThreshold));
      setAlertEmailText(loaded.supportAlertEmail ?? '');
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const persist = async (patch: Partial<AppSettings>) => {
    try {
      const updated = await saveSettings(patch);
      setSettings(updated);
      setSaveError(null);
      return updated;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings');
      return null;
    }
  };

  const toggleMock = async (value: boolean) => {
    await persist({ useMockServices: value });
  };

  const setProvider = async (provider: SpreadsheetProvider) => {
    await persist({ spreadsheetProvider: provider });
  };

  const setTranscriptionProvider = async (provider: TranscriptionProvider) => {
    await persist({ transcriptionProvider: provider });
  };

  const saveThreshold = async () => {
    const parsed = Number(thresholdText);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setSaveError('Confidence threshold must be between 0 and 100');
      return;
    }
    await persist({ confidenceThreshold: Math.round(parsed) });
  };

  const saveAlertEmail = async () => {
    const updated = await persist({ supportAlertEmail: alertEmailText.trim() });
    if (updated && isSupportConfigured()) {
      try {
        await updateOrgAlertEmail(alertEmailText.trim());
      } catch {
        setSaveError('Saved locally but could not sync alert email to support API');
      }
    }
  };

  const resetDefaults = () => {
    Alert.alert('Reset settings?', 'This restores app defaults. API keys in .env are unchanged.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          const updated = await persist(DEFAULT_SETTINGS);
          if (updated) {
            setThresholdText(String(updated.confidenceThreshold));
          }
        },
      },
    ]);
  };

  if (loading || !settings) {
    return <LoadingState label="Loading settings" />;
  }

  const liveVoiceReady =
    hasOpenAiKey() &&
    (settings.transcriptionProvider === 'wispr' ? hasSupportApi() : hasGroqKey());
  const showLiveVoiceWarning = !settings.useMockServices && !liveVoiceReady;
  const profile = getVerticalProfile(settings);

  const switchBusinessType = (type: BusinessType) => {
    if (type === settings.businessType) return;
    Alert.alert(
      'Switch business type?',
      'This changes locations, catalog fields, and voice counting. Reseed catalog to load sample items for the new type.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            const nextProfile = getVerticalProfile({ businessType: type });
            await persist({
              businessType: type,
              defaultLocation: nextProfile.defaultLocation,
              defaultBaseUnit: nextProfile.defaultUnit,
            });
          },
        },
      ]
    );
  };

  return (
    <Screen eyebrow="Configuration" title="Settings" subtitle="API keys, defaults, and voice pipeline mode">
      {saveError ? <StatusMessage message={saveError} variant="error" live /> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business type</Text>
        <Text style={styles.hint}>
          {settings.businessType === 'retail'
            ? `Retail · ${getRetailSubTypeLabel(settings.retailSubType)}`
            : 'Hospitality'}
          {settings.storeName ? ` · ${settings.storeName}` : ''}
        </Text>
        <View style={styles.providerRow}>
          {(['hospitality', 'retail'] as BusinessType[]).map((type) => {
            const selected = settings.businessType === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => switchBusinessType(type)}
                style={[styles.providerChip, selected && styles.providerChipSelected]}
              >
                <Text style={[styles.providerLabel, selected && styles.providerLabelSelected]}>
                  {type === 'hospitality' ? 'Hospitality' : 'Retail'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Voice pipeline</Text>
        <Text style={styles.hint}>Speech recognition: British English (UK)</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Use mock services</Text>
            <Text style={styles.hint}>
              Mock transcription and parsing — no API keys required
            </Text>
          </View>
          <Switch
            accessibilityLabel="Use mock voice services"
            value={settings.useMockServices}
            onValueChange={toggleMock}
            trackColor={{ false: colors.border, true: colors.accentMuted }}
            thumbColor={colors.text}
          />
        </View>
        {showLiveVoiceWarning ? (
          <StatusMessage
            message={
              settings.transcriptionProvider === 'wispr'
                ? 'Live voice needs OPENAI_API_KEY and SUPPORT_API_URL (Wispr Flow on stock-take-api)'
                : 'Live voice needs GROQ_API_KEY and OPENAI_API_KEY in .env'
            }
            variant="warning"
          />
        ) : null}
        <Text style={styles.hint}>Transcription engine (OpenAI still parses counts)</Text>
        <View style={styles.providerRow}>
          {(
            [
              { id: 'groq' as const, label: 'Groq Whisper' },
              { id: 'wispr' as const, label: 'Wispr Flow' },
            ] as const
          ).map((option) => {
            const selected = settings.transcriptionProvider === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setTranscriptionProvider(option.id)}
                style={[styles.providerChip, selected && styles.providerChipSelected]}
              >
                <Text style={[styles.providerLabel, selected && styles.providerLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {settings.transcriptionProvider === 'wispr' ? (
          <Text style={styles.hint}>
            Wispr Flow (same tech as the WhisperFlow keyboard) runs on your stock-take-api server.
            Add WISPR_FLOW_API_KEY to stock-take-api/.env and install ffmpeg. Spirit names from your
            catalog are sent as a custom dictionary for better accuracy.
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spreadsheet sync</Text>
        <Text style={styles.hint}>Session totals sync to your sheet when online.</Text>
        <View style={styles.providerRow}>
          {PROVIDERS.map((option) => {
            const selected = settings.spreadsheetProvider === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={`Spreadsheet provider ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => setProvider(option.id)}
                style={[styles.providerChip, selected && styles.providerChipSelected]}
              >
                <Text style={[styles.providerLabel, selected && styles.providerLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {settings.spreadsheetProvider === 'google' ? (
          <Text style={styles.hint}>
            Sheet tab: {env.googleSheetsSheetName}. Add GOOGLE_SHEETS_API_KEY and
            GOOGLE_SHEETS_SPREADSHEET_ID to .env.
          </Text>
        ) : null}
        {settings.spreadsheetProvider === 'microsoft' ? (
          <Text style={styles.hint}>
            Add MICROSOFT_GRAPH_CLIENT_ID to .env for Excel sync.
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>API keys</Text>
        <StatusRow label="Groq (Whisper)" configured={hasGroqKey()} />
        <StatusRow label="Wispr Flow (via API)" configured={hasSupportApi()} />
        <StatusRow label="OpenAI (Parser)" configured={hasOpenAiKey()} />
        {hasGroqKey() ? (
          <Text style={styles.hint}>
            Groq key: {env.groqApiKey.slice(0, 8)}… ({env.groqApiKey.length} chars)
          </Text>
        ) : null}
        {hasOpenAiKey() ? (
          <Text style={styles.hint}>
            OpenAI key: {env.openaiApiKey.slice(0, 7)}… ({env.openaiApiKey.length} chars)
          </Text>
        ) : null}
        <StatusRow label="Google Sheets" configured={hasGoogleSheetsConfig()} />
        <StatusRow
          label="Microsoft Graph"
          configured={env.microsoftGraphClientId.length > 0}
        />
        <Text style={styles.hint}>Add keys to .env for live APIs. Never commit .env.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Defaults</Text>
        <FormField
          label="Confidence threshold"
          hint="Matches at or above this score auto-apply without review (0–100)"
          value={thresholdText}
          onChangeText={setThresholdText}
          keyboardType="number-pad"
          onSubmitEditing={saveThreshold}
          onBlur={saveThreshold}
        />
        <OptionChipGroup
          label="Default storage location"
          options={profile.locations.map((loc) => ({ value: loc.value, label: loc.label }))}
          value={settings.defaultLocation}
          onChange={(value) => persist({ defaultLocation: value as StorageLocation })}
        />
        <Text style={styles.hint}>
          New items use the default location. Env fallback threshold: {env.confidenceThreshold}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Technical support</Text>
        <Text style={styles.hint}>
          Generate a one-time code so support can view your sessions and counts. They cannot edit
          without your approval.
        </Text>
        <FormField
          label="Support alert email"
          hint="Optional — notified via webhook when support accesses your data (set ALERT_WEBHOOK_URL on server)"
          value={alertEmailText}
          onChangeText={setAlertEmailText}
          keyboardType="email-address"
          autoCapitalize="none"
          onBlur={saveAlertEmail}
        />
        <Button
          label="Get support"
          onPress={() => router.push('/support')}
          variant="secondary"
        />
        {!isSupportConfigured() ? (
          <Text style={styles.hint}>Set SUPPORT_API_URL in .env to enable remote support.</Text>
        ) : null}
      </View>

      <Button label="Reset to defaults" onPress={resetDefaults} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
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
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  ok: {
    backgroundColor: colors.successSoft,
    color: colors.success,
  },
  missing: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  providerChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  providerChipSelected: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentMuted,
  },
  providerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  providerLabelSelected: {
    color: colors.text,
  },
});
