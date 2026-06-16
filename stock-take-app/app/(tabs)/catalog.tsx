import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useVerticalProfile } from '@/hooks/useVerticalProfile';
import { CatalogList } from '@/components/catalog/CatalogList';
import { colors, radii, spacing, typography } from '@/config/theme';
import { getRepositories } from '@/services/db';
import type { Item } from '@/types';

export default function CatalogScreen() {
  const { profile } = useVerticalProfile();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const repos = await getRepositories();
      const all = await repos.items.getAll();
      setItems(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  return (
    <Screen
      eyebrow={`${items.length} items`}
      title="Catalog"
      subtitle={profile.features.sku ? 'SKUs, sizes, colors, and brands' : 'Manage items, units, and container sizes'}
      scroll={false}
    >
      <View style={styles.actions}>
        <Link href="/catalog/new" asChild>
          <Button label="Add item" icon="add" onPress={() => {}} style={styles.flex} />
        </Link>
        <Link href="/scan" asChild>
          <Button label="Scan" icon="barcode-outline" variant="secondary" onPress={() => {}} style={styles.flex} />
        </Link>
      </View>
      {profile.features.variants ? (
        <Link href="/catalog/bulk-variants" asChild>
          <Button label="Bulk create variants" icon="duplicate-outline" onPress={() => {}} variant="secondary" />
        </Link>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyBadge}>
            <Ionicons name="cube-outline" size={28} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Catalog is empty</Text>
          <Text style={styles.empty}>Add an item, or import a sheet from Import &amp; Sync.</Text>
        </View>
      ) : (
        <CatalogList
          items={items}
          searchPlaceholder={profile.catalogSearchPlaceholder}
          isRetail={profile.features.sku}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  emptyBadge: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.subheading,
    color: colors.text,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
