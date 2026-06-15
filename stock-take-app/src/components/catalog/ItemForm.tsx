import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { FormField } from '@/components/forms/FormField';
import { OptionChipGroup } from '@/components/forms/OptionChip';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/config/theme';
import type { BaseUnit, Item, ItemContainerSize, StorageLocation } from '@/types';
import type { CreateItemInput } from '@/services/db/repositories/items';

export type ItemFormValues = {
  name: string;
  category: string;
  storage_location: StorageLocation;
  base_unit: BaseUnit;
  display_unit: string;
  container_size: string;
  is_batch: boolean;
  is_active: boolean;
  par_level: string;
  fill_granularity: string;
};

export function itemToFormValues(item?: Item | null): ItemFormValues {
  return {
    name: item?.name ?? '',
    category: item?.category ?? '',
    storage_location: item?.storage_location ?? 'bar',
    base_unit: item?.base_unit ?? 'ml',
    display_unit: item?.display_unit ?? 'bottle',
    container_size: item?.container_size != null ? String(item.container_size) : '750',
    is_batch: item?.is_batch ?? false,
    is_active: item?.is_active ?? true,
    par_level: item?.par_level != null ? String(item.par_level) : '',
    fill_granularity: item?.fill_granularity != null ? String(item.fill_granularity) : '0.1',
  };
}

export function formValuesToInput(values: ItemFormValues): CreateItemInput {
  return {
    name: values.name.trim(),
    category: values.category.trim() || null,
    storage_location: values.storage_location,
    base_unit: values.base_unit,
    display_unit: values.display_unit.trim() || 'bottle',
    container_size: values.container_size ? Number(values.container_size) : null,
    is_batch: values.is_batch,
    is_active: values.is_active,
    par_level: values.par_level ? Number(values.par_level) : null,
    fill_granularity: values.fill_granularity ? Number(values.fill_granularity) : 0.1,
  };
}

interface ItemFormProps {
  initial?: Item | null;
  seedValues?: Partial<ItemFormValues>;
  containerSizes?: ItemContainerSize[];
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onAddContainerSize?: (label: string, size: number) => Promise<void>;
  onSetDefaultContainer?: (containerSizeId: string) => Promise<void>;
  onDeleteContainerSize?: (containerSizeId: string) => Promise<void>;
  submitLabel?: string;
  voiceAddSlot?: React.ReactNode;
}

export function ItemForm({
  initial,
  seedValues,
  containerSizes = [],
  onSubmit,
  onDelete,
  onAddContainerSize,
  onSetDefaultContainer,
  onDeleteContainerSize,
  submitLabel = 'Save Item',
  voiceAddSlot,
}: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>(() => ({
    ...itemToFormValues(initial),
    ...seedValues,
  }));
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [newSizeValue, setNewSizeValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues({ ...itemToFormValues(initial), ...seedValues });
  }, [initial, seedValues]);

  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!values.name.trim()) {
      Alert.alert('Name required', 'Enter an item name.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSize = async () => {
    if (!onAddContainerSize || !newSizeLabel.trim() || !newSizeValue) return;
    await onAddContainerSize(newSizeLabel.trim(), Number(newSizeValue));
    setNewSizeLabel('');
    setNewSizeValue('');
  };

  return (
    <View style={styles.form}>
      {voiceAddSlot}

      <FormField label="Name" value={values.name} onChangeText={(v) => set('name', v)} />

      <FormField
        label="Category"
        value={values.category}
        onChangeText={(v) => set('category', v)}
        placeholder="vodka, gin, batch…"
      />

      <OptionChipGroup
        label="Storage location"
        value={values.storage_location}
        onChange={(v) => set('storage_location', v as StorageLocation)}
        options={[
          { value: 'bar', label: 'Bar' },
          { value: 'cellar', label: 'Cellar' },
          { value: 'kitchen', label: 'Kitchen' },
          { value: 'custom', label: 'Custom' },
        ]}
      />

      <OptionChipGroup
        label="Base unit"
        value={values.base_unit}
        onChange={(v) => set('base_unit', v as BaseUnit)}
        options={[
          { value: 'ml', label: 'ml' },
          { value: 'g', label: 'g' },
          { value: 'each', label: 'each' },
        ]}
      />

      <FormField
        label="Display unit"
        value={values.display_unit}
        onChangeText={(v) => set('display_unit', v)}
        placeholder="bottle, keg, bag…"
      />

      <FormField
        label="Default container size"
        value={values.container_size}
        onChangeText={(v) => set('container_size', v)}
        keyboardType="decimal-pad"
        hint="Primary size used for fill-level batch counts"
      />

      <FormField
        label="Par level"
        value={values.par_level}
        onChangeText={(v) => set('par_level', v)}
        keyboardType="decimal-pad"
        placeholder="Optional reorder target"
      />

      <FormField
        label="Fill granularity"
        value={values.fill_granularity}
        onChangeText={(v) => set('fill_granularity', v)}
        keyboardType="decimal-pad"
        hint="Snap increment for batch fill slider (e.g. 0.1)"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Batch item (fill-level counting)</Text>
        <Switch
          accessibilityLabel="Batch item fill-level counting"
          value={values.is_batch}
          onValueChange={(v) => set('is_batch', v)}
          trackColor={{ false: colors.border, true: colors.accentMuted }}
          thumbColor={colors.text}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Active in catalog</Text>
        <Switch
          accessibilityLabel="Active in catalog"
          value={values.is_active}
          onValueChange={(v) => set('is_active', v)}
          trackColor={{ false: colors.border, true: colors.accentMuted }}
          thumbColor={colors.text}
        />
      </View>

      {initial && onAddContainerSize ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Container sizes</Text>
          {containerSizes.map((size) => (
            <View key={size.id} style={styles.sizeRow}>
              <View style={styles.sizeInfo}>
                <Text style={styles.sizeLabel}>
                  {size.label} — {size.size}
                  {values.base_unit}
                  {size.is_default ? ' (default)' : ''}
                </Text>
              </View>
              <View style={styles.sizeActions}>
                {!size.is_default && onSetDefaultContainer ? (
                  <Button
                    label="Default"
                    variant="ghost"
                    onPress={() => onSetDefaultContainer(size.id)}
                  />
                ) : null}
                {onDeleteContainerSize && !size.is_default ? (
                  <Button
                    label="Remove"
                    variant="ghost"
                    onPress={() => onDeleteContainerSize(size.id)}
                  />
                ) : null}
              </View>
            </View>
          ))}
          <FormField
            label="New size label"
            value={newSizeLabel}
            onChangeText={setNewSizeLabel}
            placeholder="Magnum, Half bottle…"
          />
          <FormField
            label="New size value"
            value={newSizeValue}
            onChangeText={setNewSizeValue}
            keyboardType="decimal-pad"
          />
          <Button label="Add container size" variant="secondary" onPress={handleAddSize} />
        </View>
      ) : null}

      <Button label={saving ? 'Saving…' : submitLabel} onPress={handleSubmit} disabled={saving} />

      {onDelete ? (
        <Button label="Delete Item" variant="danger" onPress={onDelete} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  switchLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingRight: spacing.md,
  },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sizeInfo: {
    flex: 1,
  },
  sizeLabel: {
    ...typography.body,
    color: colors.text,
  },
  sizeActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
