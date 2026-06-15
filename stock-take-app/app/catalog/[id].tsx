import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors, typography } from '@/config/theme';
import { getRepositories } from '@/services/db';
import type { Item } from '@/types';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const repos = await getRepositories();
    const found = await repos.items.getById(id);
    setItem(found);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async () => {
    if (!item) return;
    const repos = await getRepositories();
    await repos.items.setActive(item.id, !item.is_active);
    await load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!item) {
    return (
      <Screen title="Item not found">
        <Text style={styles.meta}>This item may have been deleted.</Text>
      </Screen>
    );
  }

  return (
    <Screen title={item.name} scroll>
      <Text style={styles.meta}>Category: {item.category ?? '—'}</Text>
      <Text style={styles.meta}>
        Container: {item.container_size ?? '—'}
        {item.base_unit} ({item.display_unit})
      </Text>
      <Text style={styles.meta}>Location: {item.storage_location}</Text>
      <Text style={styles.meta}>Par level: {item.par_level ?? '—'}</Text>
      <Text style={styles.meta}>Fill granularity: {item.fill_granularity}</Text>
      <Text style={styles.meta}>Status: {item.is_active ? 'Active' : 'Inactive'}</Text>

      <Button
        label={item.is_active ? 'Mark Inactive' : 'Mark Active'}
        onPress={toggleActive}
        variant="secondary"
      />
      <Button label="Manage Aliases" onPress={() => router.push(`/aliases/${item.id}`)} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  meta: {
    ...typography.body,
    color: colors.textMuted,
  },
});
