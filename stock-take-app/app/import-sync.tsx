import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { colors, spacing, typography } from '@/config/theme';
import { env, hasGoogleSheetsConfig } from '@/config/env';
import { loadSettings } from '@/config/settings';
import { getRepositories } from '@/services/db';
import { useVerticalProfile } from '@/hooks/useVerticalProfile';
import { reseedCatalog } from '@/services/db/seed';
import { catalogToCsv, importCatalogCsv } from '@/services/import/csv';
import {
  createSpreadsheetSyncService,
  flushSyncQueue,
  isOnline,
} from '@/services/spreadsheetSync';
import type { FlushSyncResult, SpreadsheetConflict } from '@/services/spreadsheetSync/types';
import type { Item } from '@/types';

export default function ImportSyncScreen() {
  const { profile, settings } = useVerticalProfile();
  const [status, setStatus] = useState<string | null>(null);
  const [statusVariant, setStatusVariant] = useState<'success' | 'warning' | 'error' | 'info'>('info');
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<FlushSyncResult | null>(null);
  const [conflicts, setConflicts] = useState<SpreadsheetConflict[]>([]);
  const [provider, setProvider] = useState<string>('none');
  const [online, setOnline] = useState<boolean | null>(null);

  const refreshQueue = useCallback(async () => {
    const repos = await getRepositories();
    const counts = await repos.syncQueue.getStatusCounts();
    setQueueCounts(counts);

    const settings = await loadSettings();
    setProvider(settings.spreadsheetProvider);
    setOnline(await isOnline());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshQueue();
    }, [refreshQueue])
  );

  const setStatusMessage = (message: string, variant: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setStatus(message);
    setStatusVariant(variant);
  };

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    setStatus(null);

    try {
      const connected = await isOnline();
      if (!connected) {
        setStatusMessage('Offline — connect to sync with your spreadsheet', 'warning');
        return;
      }

      const settings = await loadSettings();
      if (settings.spreadsheetProvider === 'none') {
        setStatusMessage('Choose a spreadsheet provider in Settings first', 'warning');
        return;
      }

      const service = await createSpreadsheetSyncService();
      const repos = await getRepositories();
      const result = await flushSyncQueue(repos, service);
      setLastSync(result);
      setConflicts(result.conflicts);

      if (result.error) {
        setStatusMessage(`Sync failed: ${result.error}`, 'error');
      } else if (result.processed === 0) {
        setStatusMessage('Nothing to sync — queue is empty', 'info');
      } else {
        const variant = result.failed > 0 ? 'warning' : result.conflicts.length ? 'warning' : 'success';
        setStatusMessage(
          `Synced ${result.completed} entries` +
            (result.failed ? `, ${result.failed} failed` : '') +
            (result.conflicts.length ? `, ${result.conflicts.length} conflicts` : ''),
          variant
        );
      }

      await refreshQueue();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }, [refreshQueue]);

  const handlePullFromSheet = useCallback(async () => {
    setSyncing(true);
    try {
      const connected = await isOnline();
      if (!connected) {
        setStatusMessage('Offline — connect to pull from your spreadsheet', 'warning');
        return;
      }

      const service = await createSpreadsheetSyncService();
      if (!service.pullCatalog) {
        setStatusMessage('Configure Google Sheets in Settings and .env first', 'warning');
        return;
      }

      const rows = await service.pullCatalog();
      setStatusMessage(`Pulled ${rows.length} rows from sheet (${env.googleSheetsSheetName})`, 'success');

      if (rows.length > 0) {
        const preview = rows
          .slice(0, 5)
          .map((row) => `${row.name}: ${row.quantity || '—'}`)
          .join('\n');
        Alert.alert('Sheet preview', preview + (rows.length > 5 ? `\n…and ${rows.length - 5} more` : ''));
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Pull failed', 'error');
    } finally {
      setSyncing(false);
    }
  }, []);

  const handleRetryFailed = useCallback(async () => {
    const repos = await getRepositories();
    const retried = await repos.syncQueue.retryFailed();
    setStatusMessage(
      retried ? `Re-queued ${retried} failed entries` : 'No failed entries to retry',
      retried ? 'success' : 'info'
    );
    await refreshQueue();
  }, [refreshQueue]);

  const handleImportCsv = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const uri = result.assets[0].uri;
      const csvText = await FileSystem.readAsStringAsync(uri);
      const repos = await getRepositories();
      const importResult = await importCatalogCsv(repos, csvText);

      setStatusMessage(
        `Imported ${importResult.imported}, skipped ${importResult.skipped}` +
          (importResult.errors.length ? `, ${importResult.errors.length} errors` : ''),
        importResult.errors.length ? 'warning' : 'success'
      );

      if (importResult.errors.length) {
        Alert.alert('Import warnings', importResult.errors.slice(0, 5).join('\n'));
      }
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);

  const handleExportCsv = useCallback(async () => {
    try {
      const repos = await getRepositories();
      const items = await repos.items.getAll();
      const withAliases = await Promise.all(
        items.map(async (item: Item) => {
          const aliases = await repos.aliases.getByItemId(item.id);
          return {
            name: item.name,
            brand: item.brand,
            sku: item.sku,
            color: item.color,
            size: item.size,
            category: item.category,
            storage_location: item.storage_location,
            base_unit: item.base_unit,
            display_unit: item.display_unit,
            container_size: item.container_size,
            is_batch: item.is_batch,
            par_level: item.par_level,
            fill_granularity: item.fill_granularity,
            aliases: aliases.map((a: { alias_text: string }) => a.alias_text),
          };
        })
      );

      const csv = catalogToCsv(withAliases);
      const path = `${FileSystem.cacheDirectory}catalog-export.csv`;
      await FileSystem.writeAsStringAsync(path, csv);
      setStatusMessage(`Exported ${items.length} items to cache (${path})`, 'success');
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);

  const handleReseed = useCallback(async () => {
    Alert.alert(
      'Reseed catalog?',
      `This deletes all items and reloads the sample ${profile.label.toLowerCase()} catalog. Count history is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reseed',
          style: 'destructive',
          onPress: async () => {
            const repos = await getRepositories();
            const count = await reseedCatalog(repos, {
              businessType: settings?.businessType ?? 'hospitality',
              retailSubType: settings?.retailSubType ?? 'apparel',
            });
            setStatusMessage(`Reseeded ${count} items`, 'success');
          },
        },
      ]
    );
  }, [profile.label, settings?.businessType, settings?.retailSubType]);

  const providerLabel =
    provider === 'google'
      ? 'Google Sheets'
      : provider === 'microsoft'
        ? 'Microsoft Excel'
        : 'None';

  return (
    <Screen title="Import & Sync" subtitle="Spreadsheet sync, CSV import, offline queue">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spreadsheet sync</Text>
        <Text style={styles.meta}>
          Provider: {providerLabel} · {online === null ? '…' : online ? 'Online' : 'Offline'}
        </Text>
        <Text style={styles.meta}>
          Sheet: {env.googleSheetsSheetName} ·{' '}
          {hasGoogleSheetsConfig() ? 'API configured' : 'API keys missing'}
        </Text>
        <Button
          label={syncing ? 'Syncing…' : 'Sync now'}
          onPress={handleSyncNow}
          disabled={syncing}
        />
        <Button
          label="Pull from sheet"
          onPress={handlePullFromSheet}
          variant="secondary"
          disabled={syncing || provider !== 'google'}
        />
        <Button label="Retry failed" onPress={handleRetryFailed} variant="ghost" />
        {status ? <StatusMessage message={status} variant={statusVariant} live /> : null}
        {lastSync && lastSync.processed > 0 ? (
          <Text style={styles.meta}>
            Last sync: {lastSync.completed} completed, {lastSync.failed} failed
          </Text>
        ) : null}
        {conflicts.length > 0 ? (
          <View style={styles.conflictBox}>
            <Text style={styles.conflictTitle}>Quantity conflicts</Text>
            {conflicts.map((conflict) => (
              <Text key={conflict.itemName} style={styles.conflictLine}>
                {conflict.itemName}: sheet {conflict.sheetQuantity} vs local {conflict.localQuantity}
              </Text>
            ))}
            <Text style={styles.hint}>Local totals were written — review your sheet if needed.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Catalog import / export</Text>
        <Button label="Import CSV" onPress={handleImportCsv} />
        <Button label="Export CSV to cache" onPress={handleExportCsv} variant="secondary" />
        <Button label={profile.seedLabel} onPress={handleReseed} variant="secondary" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync queue</Text>
        <Button label="Refresh queue status" onPress={refreshQueue} variant="ghost" />
        <Text style={styles.queueLine}>Pending: {queueCounts.pending ?? 0}</Text>
        <Text style={styles.queueLine}>Failed: {queueCounts.failed ?? 0}</Text>
        <Text style={styles.queueLine}>Completed: {queueCounts.completed ?? 0}</Text>
      </View>

      <Text style={styles.hint}>
        Counts auto-sync when online. CSV columns: name, category, storage_location, base_unit,
        display_unit, container_size, is_batch, par_level, fill_granularity, aliases
        (semicolon-separated)
      </Text>
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
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  queueLine: {
    ...typography.body,
    color: colors.text,
  },
  conflictBox: {
    backgroundColor: '#F8514911',
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  conflictTitle: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  conflictLine: {
    ...typography.caption,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
