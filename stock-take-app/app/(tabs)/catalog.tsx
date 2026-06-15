import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { CatalogList } from '@/components/catalog/CatalogList';
import { colors, typography } from '@/config/theme';
import { getRepositories } from '@/services/db';
import type { Item } from '@/types';

export default function CatalogScreen() {
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
    <Screen title="Catalog" subtitle="Manage items, units, and container sizes" scroll={false}>
      <Link href="/catalog/new" asChild>
        <Button label="Add Item" onPress={() => {}} />
      </Link>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No items in catalog. Import or reseed from Import & Sync.</Text>
      ) : (
        <CatalogList items={items} />
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
