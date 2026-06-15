import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { PromptModal } from '@/components/ui/PromptModal';
import { RecipeEditor } from '@/components/recipes/RecipeEditor';
import { colors } from '@/config/theme';
import { getRepositories } from '@/services/db';
import type { Item, RecipeWithComponents } from '@/types';
import type { RecipeComponentInput } from '@/services/db/repositories/recipes';

export default function RecipeEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [batchItem, setBatchItem] = useState<Item | null>(null);
  const [recipe, setRecipe] = useState<RecipeWithComponents | null>(null);
  const [versions, setVersions] = useState<
    Array<{ id: string; version: number; is_current: boolean; created_at: string }>
  >([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);

  const load = useCallback(
    async (recipeId?: string) => {
      if (!id) return;
      setLoading(true);
      const repos = await getRepositories();
      const item = await repos.items.getById(id);
      if (!item) {
        setBatchItem(null);
        setLoading(false);
        return;
      }

      const items = await repos.items.getAll({ activeOnly: true });
      const versionList = await repos.recipes.getVersions(id);
      const activeRecipe = recipeId
        ? await repos.recipes.getById(recipeId)
        : await repos.recipes.getCurrent(id);

      setBatchItem(item);
      setAllItems(items);
      setVersions(
        versionList.map((v) => ({
          id: v.id,
          version: v.version,
          is_current: v.is_current,
          created_at: v.created_at,
        }))
      );
      setRecipe(activeRecipe);
      setLoading(false);
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (yieldPct: number, components: RecipeComponentInput[]) => {
    if (!id) return;
    const repos = await getRepositories();
    await repos.recipes.createVersion(id, yieldPct, components);
    Alert.alert('Saved', 'New recipe version created.');
    await load();
  };

  const handleDuplicate = async (name: string) => {
    if (!duplicateSourceId || !name.trim()) return;
    const repos = await getRepositories();
    const target = await repos.items.create({
      name: name.trim(),
      category: 'batch',
      is_batch: true,
      container_size: batchItem?.container_size ?? 750,
      display_unit: 'batch',
    });
    await repos.containerSizes.create(target.id, 'Standard', target.container_size ?? 750, true);
    await repos.recipes.duplicateAsTemplate(duplicateSourceId, target.id);
    setDuplicateSourceId(null);
    router.push(`/recipes/${target.id}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!batchItem) {
    return <Screen title="Not found">Batch item not found.</Screen>;
  }

  return (
    <Screen title={batchItem.name} scroll>
      <RecipeEditor
        batchItem={batchItem}
        recipe={recipe}
        versions={versions}
        allItems={allItems}
        onSave={handleSave}
        onSelectVersion={(recipeId) => load(recipeId)}
        onDuplicateTemplate={(recipeId) => setDuplicateSourceId(recipeId)}
      />

      <PromptModal
        visible={duplicateSourceId != null}
        title="Duplicate recipe"
        message="Enter name for the new batch item"
        placeholder="New batch name"
        submitLabel="Duplicate"
        onSubmit={handleDuplicate}
        onCancel={() => setDuplicateSourceId(null)}
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
});
