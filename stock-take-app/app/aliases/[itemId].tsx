import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography, tapTarget } from '@/config/theme';
import { getRepositories } from '@/services/db';
import type { Alias, Item } from '@/types';

export default function AliasManagerScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    const repos = await getRepositories();
    const found = await repos.items.getById(itemId);
    const list = await repos.aliases.getByItemId(itemId);
    setItem(found);
    setAliases(list);
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!itemId || !newAlias.trim()) return;
    const repos = await getRepositories();
    try {
      await repos.aliases.create(itemId, newAlias);
      setNewAlias('');
      await load();
    } catch {
      Alert.alert('Duplicate', 'That alias already exists for this item.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    const repos = await getRepositories();
    await repos.aliases.update(editingId, editingText);
    setEditingId(null);
    setEditingText('');
    await load();
  };

  const handleDelete = async (aliasId: string) => {
    const repos = await getRepositories();
    await repos.aliases.delete(aliasId);
    await load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Screen title="Aliases" subtitle={item?.name} scroll={false}>
      <FormField
        label="New alias"
        value={newAlias}
        onChangeText={setNewAlias}
        placeholder="Bel, Tankeray…"
        onSubmitEditing={handleAdd}
      />
      <Button label="Add alias" onPress={handleAdd} />

      <FlatList
        data={aliases}
        keyExtractor={(alias) => alias.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No aliases yet.</Text>}
        renderItem={({ item: alias }) => (
          <View style={styles.row}>
            {editingId === alias.id ? (
              <>
                <FormField
                  label="Edit alias"
                  value={editingText}
                  onChangeText={setEditingText}
                />
                <View style={styles.rowActions}>
                  <Button label="Save" onPress={handleSaveEdit} />
                  <Button label="Cancel" variant="ghost" onPress={() => setEditingId(null)} />
                </View>
              </>
            ) : (
              <>
                <Pressable
                  style={styles.aliasPress}
                  onPress={() => {
                    setEditingId(alias.id);
                    setEditingText(alias.alias_text);
                  }}
                >
                  <Text style={styles.aliasText}>{alias.alias_text}</Text>
                </Pressable>
                <Button label="Delete" variant="ghost" onPress={() => handleDelete(alias.id)} />
              </>
            )}
          </View>
        )}
      />
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
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aliasPress: {
    minHeight: tapTarget.minHeight,
    justifyContent: 'center',
  },
  aliasText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
