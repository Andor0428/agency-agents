import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PromptModal } from '@/components/ui/PromptModal';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography, tapTarget } from '@/config/theme';
import { getRepositories } from '@/services/db';

type BatchRow = {
  item_id: string;
  item_name: string;
  recipe_version: number | null;
};

export default function RecipesScreen() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [promptOpen, setPromptOpen] = useState(false);

  const load = useCallback(async () => {
    const repos = await getRepositories();
    const rows = await repos.recipes.getBatchItems();
    setBatches(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const createBatchItem = async (name: string) => {
    if (!name.trim()) return;
    const repos = await getRepositories();
    const item = await repos.items.create({
      name: name.trim(),
      category: 'batch',
      is_batch: true,
      container_size: 750,
      display_unit: 'batch',
    });
    await repos.containerSizes.create(item.id, 'Standard', 750, true);
    setPromptOpen(false);
    router.push(`/recipes/${item.id}`);
  };

  return (
    <Screen title="Recipes" subtitle="Batch recipes with nested components and versioning" scroll={false}>
      <Button label="New batch item" onPress={() => setPromptOpen(true)} />

      <FlatList
        data={batches}
        keyExtractor={(row) => row.item_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No batch items yet. Create one to build a recipe with components.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/recipes/${item.item_id}`)}>
            <View>
              <Text style={styles.name}>{item.item_name}</Text>
              <Text style={styles.meta}>
                {item.recipe_version != null ? `Recipe v${item.recipe_version}` : 'No recipe yet'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />

      <PromptModal
        visible={promptOpen}
        title="New batch item"
        message="Enter the batch name (e.g. Trailblazer)"
        placeholder="Trailblazer"
        submitLabel="Create"
        onSubmit={createBatchItem}
        onCancel={() => setPromptOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: tapTarget.minHeight + 8,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chevron: {
    ...typography.heading,
    color: colors.textMuted,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
