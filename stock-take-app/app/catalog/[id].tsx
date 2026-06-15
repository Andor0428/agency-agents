import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import {
  ItemForm,
  formValuesToInput,
  type ItemFormValues,
} from '@/components/catalog/ItemForm';
import { colors } from '@/config/theme';
import { getRepositories } from '@/services/db';
import type { Item, ItemContainerSize } from '@/types';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [containerSizes, setContainerSizes] = useState<ItemContainerSize[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const repos = await getRepositories();
    const found = await repos.items.getById(id);
    const sizes = found ? await repos.containerSizes.getByItemId(id) : [];
    setItem(found);
    setContainerSizes(sizes);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (values: ItemFormValues) => {
    if (!id) return;
    const repos = await getRepositories();
    await repos.items.update(id, formValuesToInput(values));
    Alert.alert('Saved', 'Item updated.');
    await load();
  };

  const handleDelete = async () => {
    if (!id || !item) return;
    Alert.alert('Delete item?', `Remove ${item.name} from catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const repos = await getRepositories();
          await repos.items.delete(id);
          router.back();
        },
      },
    ]);
  };

  const handleAddContainerSize = async (label: string, size: number) => {
    if (!id) return;
    const repos = await getRepositories();
    await repos.containerSizes.create(id, label, size, containerSizes.length === 0);
    await load();
  };

  const handleSetDefault = async (containerSizeId: string) => {
    if (!id) return;
    const repos = await getRepositories();
    await repos.containerSizes.setDefault(id, containerSizeId);
    await load();
  };

  const handleDeleteContainerSize = async (containerSizeId: string) => {
    const repos = await getRepositories();
    await repos.containerSizes.delete(containerSizeId);
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
        <View />
      </Screen>
    );
  }

  return (
    <Screen title="Edit Item" scroll>
      <ItemForm
        initial={item}
        containerSizes={containerSizes}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        onAddContainerSize={handleAddContainerSize}
        onSetDefaultContainer={handleSetDefault}
        onDeleteContainerSize={handleDeleteContainerSize}
        submitLabel="Save Changes"
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
});
