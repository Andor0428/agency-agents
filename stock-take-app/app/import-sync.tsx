import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { PlaceholderCard } from '@/components/ui/PlaceholderCard';
import { colors, spacing, typography } from '@/config/theme';
import { getRepositories } from '@/services/db';
import type { Item } from '@/types';
import { reseedCatalog } from '@/services/db/seed';
import { catalogToCsv, importCatalogCsv } from '@/services/import/csv';

export default function ImportSyncScreen() {
  const [status, setStatus] = useState<string | null>(null);
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});

  const refreshQueue = useCallback(async () => {
    const repos = await getRepositories();
    const counts = await repos.syncQueue.getStatusCounts();
    setQueueCounts(counts);
  }, []);

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

      setStatus(
        `Imported ${importResult.imported}, skipped ${importResult.skipped}` +
          (importResult.errors.length ? `, ${importResult.errors.length} errors` : '')
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
      setStatus(`Exported ${items.length} items to cache (${path})`);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);

  const handleReseed = useCallback(async () => {
    Alert.alert(
      'Reseed catalog?',
      'This deletes all items and reloads the top 100 spirits. Count history is preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reseed',
          style: 'destructive',
          onPress: async () => {
            const repos = await getRepositories();
            const count = await reseedCatalog(repos);
            setStatus(`Reseeded ${count} spirits`);
          },
        },
      ]
    );
  }, []);

  return (
    <Screen title="Import & Sync" subtitle="CSV import and offline sync queue">
      <PlaceholderCard
        title="Spreadsheet sync"
        description="Google Sheets and Excel sync will be configured in a later milestone. The offline sync queue is ready for when you connect a sheet."
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Catalog import / export</Text>
        <Button label="Import CSV" onPress={handleImportCsv} />
        <Button label="Export CSV to cache" onPress={handleExportCsv} variant="secondary" />
        <Button label="Reseed top 100 spirits" onPress={handleReseed} variant="secondary" />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync queue</Text>
        <Button label="Refresh queue status" onPress={refreshQueue} variant="ghost" />
        <Text style={styles.queueLine}>Pending: {queueCounts.pending ?? 0}</Text>
        <Text style={styles.queueLine}>Failed: {queueCounts.failed ?? 0}</Text>
        <Text style={styles.queueLine}>Completed: {queueCounts.completed ?? 0}</Text>
      </View>

      <Text style={styles.hint}>
        CSV columns: name, category, storage_location, base_unit, display_unit, container_size,
        is_batch, par_level, fill_granularity, aliases (semicolon-separated)
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
  status: {
    ...typography.caption,
    color: colors.success,
  },
  queueLine: {
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
