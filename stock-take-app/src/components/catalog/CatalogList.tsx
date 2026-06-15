import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import type { Item } from '@/types';
import { colors, spacing, typography, tapTarget } from '@/config/theme';

interface CatalogListProps {
  items: Item[];
  onRefresh?: () => void;
}

export function CatalogList({ items }: CatalogListProps) {
  const [search, setSearch] = useState('');

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      (item.category?.toLowerCase().includes(term) ?? false)
    );
  });

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <Link href={`/catalog/${item.id}`} asChild>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.rowMain}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemMeta}>
              {item.category ?? 'uncategorized'} · {item.container_size ?? '—'}
              {item.base_unit} · {item.display_unit}
              {item.is_batch ? ' · batch' : ''}
            </Text>
          </View>
          <View style={[styles.badge, item.is_active ? styles.active : styles.inactive]}>
            <Text style={styles.badgeText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </Pressable>
      </Link>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Search catalog"
        placeholder="Search spirits…"
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.count}>
        {filtered.length} item{filtered.length === 1 ? '' : 's'}
        {search ? ` matching "${search}"` : ''}
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  search: {
    minHeight: tapTarget.minHeight,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    color: colors.text,
    ...typography.body,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: tapTarget.minHeight + 12,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowPressed: {
    opacity: 0.8,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  itemMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  active: {
    backgroundColor: '#23863633',
  },
  inactive: {
    backgroundColor: '#8B949E33',
  },
  badgeText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
});
