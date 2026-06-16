import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PromptModal } from '@/components/ui/PromptModal';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing, typography, tapTarget } from '@/config/theme';
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
    <Screen eyebrow="Batches" title="Recipes" subtitle="Batch recipes with nested components and versioning" scroll={false}>
      <Button label="New batch item" icon="add" onPress={() => setPromptOpen(true)} />

      <FlatList
        data={batches}
        keyExtractor={(row) => row.item_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyBadge}>
              <Ionicons name="flask-outline" size={26} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>No batch items</Text>
            <Text style={styles.empty}>Create one to build a recipe with components.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const hasRecipe = item.recipe_version != null;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(`/recipes/${item.item_id}`)}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="flask" size={18} color={colors.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.item_name}</Text>
                <Text style={styles.meta}>
                  {hasRecipe ? `Recipe v${item.recipe_version}` : 'No recipe yet'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </Pressable>
          );
        }}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sep: {
    height: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: tapTarget.minHeight + 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  emptyBadge: {
    width: 56,
    height: 56,
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
