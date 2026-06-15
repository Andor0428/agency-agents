import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ItemForm, formValuesToInput, itemToFormValues, type ItemFormValues } from '@/components/catalog/ItemForm';
import { VoiceAddPanel } from '@/components/catalog/VoiceAddPanel';
import { loadSettings } from '@/config/settings';
import { getRepositories } from '@/services/db';

export default function NewItemScreen() {
  const router = useRouter();
  const [seedValues, setSeedValues] = useState<Partial<ItemFormValues>>({});

  useEffect(() => {
    loadSettings().then((settings) => {
      setSeedValues((current) => ({
        ...current,
        storage_location: current.storage_location ?? settings.defaultLocation,
      }));
    });
  }, []);

  const handleSubmit = async (values: ItemFormValues) => {
    const repos = await getRepositories();
    const item = await repos.items.create(formValuesToInput(values));
    if (values.container_size) {
      await repos.containerSizes.create(
        item.id,
        'Standard',
        Number(values.container_size),
        true
      );
    }
    Alert.alert('Created', `${item.name} added to catalog.`);
    router.replace(`/catalog/${item.id}`);
  };

  return (
    <Screen title="New Item" scroll>
      <VoiceAddPanel onParsed={setSeedValues} />
      <ItemForm seedValues={seedValues} onSubmit={handleSubmit} submitLabel="Create Item" />
    </Screen>
  );
}
