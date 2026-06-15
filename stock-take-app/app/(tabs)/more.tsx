import { useCallback, useState } from 'react';
import { Link } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/config/theme';
import { loadSettings } from '@/config/settings';
import { getRepositories } from '@/services/db';
import { isOnline } from '@/services/spreadsheetSync';

export default function MoreScreen() {
  const [businessType, setBusinessType] = useState<'hospitality' | 'retail'>('hospitality');
  const [mockMode, setMockMode] = useState(true);
  const [provider, setProvider] = useState('none');
  const [pendingSync, setPendingSync] = useState(0);
  const [online, setOnline] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const settings = await loadSettings();
    setBusinessType(settings.businessType);
    setMockMode(settings.useMockServices);
    setProvider(settings.spreadsheetProvider);
    setOnline(await isOnline());

    const repos = await getRepositories();
    const counts = await repos.syncQueue.getStatusCounts();
    setPendingSync(counts.pending ?? 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const providerLabel =
    provider === 'google' ? 'Google Sheets' : provider === 'microsoft' ? 'Excel' : 'Off';

  return (
    <Screen title="More" subtitle="Import, sync, and settings">
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Quick status</Text>
        <Text style={styles.summaryLine}>
          Mode: {businessType === 'retail' ? 'Retail' : 'Hospitality'}
        </Text>
        <Text style={styles.summaryLine}>
          Voice: {mockMode ? 'Mock mode' : 'Live APIs'}
        </Text>
        <Text style={styles.summaryLine}>Spreadsheet: {providerLabel}</Text>
        <Text style={styles.summaryLine}>
          Sync queue: {pendingSync} pending · {online === null ? '…' : online ? 'Online' : 'Offline'}
        </Text>
      </View>

      <Link href="/import-sync" asChild>
        <Button label="Import & Sync" onPress={() => {}} variant="secondary" />
      </Link>
      <Link href="/settings" asChild>
        <Button label="Settings" onPress={() => {}} variant="secondary" />
      </Link>
      <Link href="/support" asChild>
        <Button label="Get support" onPress={() => {}} variant="secondary" />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryLine: {
    ...typography.body,
    color: colors.textMuted,
  },
});
