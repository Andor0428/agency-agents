import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormField } from '@/components/forms/FormField';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/config/theme';
import { useVerticalProfile } from '@/hooks/useVerticalProfile';
import { generateBulkVariants, parseListInput } from '@/services/catalog/bulkVariants';
import { getRepositories } from '@/services/db';

export default function BulkVariantsScreen() {
  const router = useRouter();
  const { profile, settings } = useVerticalProfile();
  const [styleName, setStyleName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [skuPrefix, setSkuPrefix] = useState('');
  const [sizesText, setSizesText] = useState('S, M, L, XL');
  const [colorsText, setColorsText] = useState('Black, White, Navy');
  const [saving, setSaving] = useState(false);

  const previewCount =
    parseListInput(sizesText).length * parseListInput(colorsText).length;

  const handleCreate = async () => {
    if (!styleName.trim() || !brand.trim()) {
      Alert.alert('Required', 'Enter style name and brand.');
      return;
    }
    const sizes = parseListInput(sizesText);
    const colors = parseListInput(colorsText);
    if (sizes.length === 0 || colors.length === 0) {
      Alert.alert('Required', 'Enter at least one size and one color.');
      return;
    }

    setSaving(true);
    try {
      const variants = generateBulkVariants({
        styleName: styleName.trim(),
        brand: brand.trim(),
        category: category.trim() || 'general',
        skuPrefix: skuPrefix.trim() || brand.trim().slice(0, 3).toUpperCase(),
        sizes,
        colors,
        storage_location: settings?.defaultLocation ?? profile.defaultLocation,
        base_unit: profile.defaultUnit,
        display_unit: profile.displayUnit,
      });

      const repos = await getRepositories();
      await repos.items.createMany(variants);
      Alert.alert('Created', `${variants.length} variants added to catalog.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Failed', error instanceof Error ? error.message : 'Could not create variants');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Bulk variants" subtitle="Create a size × color matrix for one style">
      <FormField label="Style name" value={styleName} onChangeText={setStyleName} placeholder="501 Original Fit" />
      <FormField label="Brand" value={brand} onChangeText={setBrand} placeholder="Levi's" />
      <FormField label="Category" value={category} onChangeText={setCategory} placeholder="denim" />
      <FormField
        label="SKU prefix"
        value={skuPrefix}
        onChangeText={setSkuPrefix}
        placeholder="LEV-501"
        hint="SKUs generated as PREFIX-COL-SIZE"
      />
      <FormField
        label="Sizes"
        value={sizesText}
        onChangeText={setSizesText}
        placeholder="S, M, L, XL or 8, 9, 10, 11"
        multiline
      />
      <FormField
        label="Colors"
        value={colorsText}
        onChangeText={setColorsText}
        placeholder="Black, White, Navy"
        multiline
      />

      <Text style={styles.preview}>
        Will create {previewCount} variant{previewCount === 1 ? '' : 's'}
      </Text>

      <Button
        label={saving ? 'Creating…' : `Create ${previewCount} variants`}
        onPress={handleCreate}
        disabled={saving || previewCount === 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    ...typography.body,
    color: colors.textMuted,
  },
});
