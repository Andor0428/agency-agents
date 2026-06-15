import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography, tapTarget } from '@/config/theme';
import type { Item, RecipeWithComponents } from '@/types';
import type { RecipeComponentInput } from '@/services/db/repositories/recipes';

export type ComponentDraft = RecipeComponentInput & {
  componentName: string;
  key: string;
};

interface RecipeEditorProps {
  batchItem: Item;
  recipe: RecipeWithComponents | null;
  versions: Array<{ id: string; version: number; is_current: boolean; created_at: string }>;
  allItems: Item[];
  onSave: (yieldPct: number, components: RecipeComponentInput[]) => Promise<void>;
  onSelectVersion: (recipeId: string) => void;
  onDuplicateTemplate?: (recipeId: string) => void;
}

export function RecipeEditor({
  batchItem,
  recipe,
  versions,
  allItems,
  onSave,
  onSelectVersion,
  onDuplicateTemplate,
}: RecipeEditorProps) {
  const [yieldPct, setYieldPct] = useState(recipe ? String(recipe.yield_pct) : '100');
  const [components, setComponents] = useState<ComponentDraft[]>(
    () =>
      recipe?.components.map((c) => ({
        key: c.id,
        componentItemId: c.component_item_id,
        componentName: c.component_name ?? 'Unknown',
        qty: c.qty,
        unit: c.unit,
      })) ?? []
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setYieldPct(recipe ? String(recipe.yield_pct) : '100');
    setComponents(
      recipe?.components.map((c) => ({
        key: c.id,
        componentItemId: c.component_item_id,
        componentName: c.component_name ?? 'Unknown',
        qty: c.qty,
        unit: c.unit,
      })) ?? []
    );
  }, [recipe?.id, recipe?.yield_pct, recipe?.components.length]);

  const addComponent = (item: Item) => {
    setComponents((prev) => [
      ...prev,
      {
        key: `${item.id}-${Date.now()}`,
        componentItemId: item.id,
        componentName: item.name,
        qty: 50,
        unit: item.base_unit,
      },
    ]);
    setPickerOpen(false);
  };

  const updateComponent = (key: string, patch: Partial<ComponentDraft>) => {
    setComponents((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  const removeComponent = (key: string) => {
    setComponents((prev) => prev.filter((c) => c.key !== key));
  };

  const handleSave = async () => {
    if (components.length === 0) {
      Alert.alert('Add components', 'A recipe needs at least one component.');
      return;
    }
    setSaving(true);
    try {
      await onSave(
        Number(yieldPct) || 100,
        components.map((c) => ({
          componentItemId: c.componentItemId,
          qty: c.qty,
          unit: c.unit,
        }))
      );
    } finally {
      setSaving(false);
    }
  };

  const selectableItems = allItems.filter(
    (item) => item.id !== batchItem.id && item.is_active
  );

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Batch: {batchItem.name} · {batchItem.container_size}
        {batchItem.base_unit}
      </Text>

      <FormField
        label="Yield %"
        value={yieldPct}
        onChangeText={setYieldPct}
        keyboardType="decimal-pad"
        hint="Adjusts ingredient quantities after batch prep loss"
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Components</Text>
        {components.map((component) => (
          <View key={component.key} style={styles.componentRow}>
            <Text style={styles.componentName}>{component.componentName}</Text>
            <FormField
              label="Qty"
              value={String(component.qty)}
              onChangeText={(v) => updateComponent(component.key, { qty: Number(v) || 0 })}
              keyboardType="decimal-pad"
            />
            <FormField
              label="Unit"
              value={component.unit}
              onChangeText={(v) => updateComponent(component.key, { unit: v })}
            />
            <Button label="Remove" variant="ghost" onPress={() => removeComponent(component.key)} />
          </View>
        ))}
        <Button label="Add component" variant="secondary" onPress={() => setPickerOpen((v) => !v)} />
      </View>

      {pickerOpen ? (
        <View style={styles.picker}>
          <Text style={styles.pickerTitle}>Select item</Text>
          {selectableItems.slice(0, 20).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => addComponent(item)}
              style={styles.pickerRow}
            >
              <Text style={styles.pickerName}>{item.name}</Text>
              <Text style={styles.pickerMeta}>{item.category ?? '—'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Button label={saving ? 'Saving…' : 'Save new version'} onPress={handleSave} disabled={saving} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Version history</Text>
        {versions.map((version) => (
          <Pressable
            key={version.id}
            onPress={() => onSelectVersion(version.id)}
            style={[styles.versionRow, version.is_current && styles.versionCurrent]}
          >
            <Text style={styles.versionText}>
              v{version.version}
              {version.is_current ? ' (current)' : ''}
            </Text>
            <Text style={styles.versionDate}>{new Date(version.created_at).toLocaleDateString()}</Text>
            {onDuplicateTemplate ? (
              <Button
                label="Duplicate"
                variant="ghost"
                onPress={() => onDuplicateTemplate(version.id)}
              />
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
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
  componentRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  componentName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  picker: {
    gap: spacing.xs,
    maxHeight: 240,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.sm,
  },
  pickerTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  pickerRow: {
    minHeight: tapTarget.minHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
  },
  pickerName: {
    ...typography.body,
    color: colors.text,
  },
  pickerMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  versionCurrent: {
    backgroundColor: '#1F6FEB22',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  versionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  versionDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
