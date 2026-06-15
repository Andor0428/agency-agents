import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useVerticalProfile } from '@/hooks/useVerticalProfile';
import { CatalogList } from '@/components/catalog/CatalogList';
import { colors, typography } from '@/config/theme';
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
      title="Catalog"
      subtitle={profile.features.sku ? 'SKUs, sizes, colors, and brands' : 'Manage items, units, and container sizes'}
      scroll={false}
    >
      <Link href="/catalog/new" asChild>
        <Button label="Add Item" onPress={() => {}} />
      </Link>
      {profile.features.variants ? (
        <Link href="/catalog/bulk-variants" asChild>
          <Button label="Bulk create variants" onPress={() => {}} variant="secondary" />
        </Link>
      ) : null}
      <Link href="/scan" asChild>
        <Button label="Scan barcode" onPress={() => {}} variant="secondary" />
      </Link>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No items in catalog. Import or reseed from Import & Sync.</Text>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
