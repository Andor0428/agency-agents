import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FillLevelSlider } from '@/components/count/FillLevelSlider';
import { colors, spacing, typography, tapTarget } from '@/config/theme';
import { snapFillLevel } from '@/services/business';
import type { BomComponent } from '@/services/business';
import type { Item, MatchCandidate } from '@/types';

interface CountConfirmCardProps {
  parsedName: string;
  quantity: number;
  unit?: string;
  item: Item | null;
  candidates: MatchCandidate[];
  selectedItemId?: string;
  showMatchPicker: boolean;
  bomPreview?: BomComponent[];
  onSelectItem: (itemId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onFillLevelChange: (fillLevel: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CountConfirmCard({
  parsedName,
  quantity,
  unit,
  item,
  candidates,
  selectedItemId,
  showMatchPicker,
  bomPreview = [],
  onSelectItem,
  onQuantityChange,
  onFillLevelChange,
  onConfirm,
  onCancel,
}: CountConfirmCardProps) {
  const activeId = selectedItemId ?? candidates[0]?.itemId;
  const isBatch = item?.is_batch ?? false;
  const initialFill = isBatch
    ? snapFillLevel(quantity <= 1 ? quantity : quantity / (item?.container_size || 1), item?.fill_granularity ?? 0.1)
    : 0;

  const [qtyText, setQtyText] = useState(String(quantity));
  const [fillLevel, setFillLevel] = useState(initialFill);

  useEffect(() => {
    setQtyText(String(quantity));
    setFillLevel(initialFill);
  }, [quantity, initialFill, parsedName]);

  const handleQtyChange = (text: string) => {
    setQtyText(text);
    const parsed = Number(text);
    if (Number.isFinite(parsed)) {
      onQuantityChange(parsed);
      if (isBatch && parsed <= 1) {
        const snapped = snapFillLevel(parsed, item?.fill_granularity ?? 0.1);
        setFillLevel(snapped);
        onFillLevelChange(snapped);
      }
    }
  };

  const handleFillChange = (value: number) => {
    setFillLevel(value);
    onFillLevelChange(value);
    setQtyText(String(value));
    onQuantityChange(value);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{showMatchPicker ? 'Confirm match' : 'Review count'}</Text>
      <Text style={styles.subtitle}>
        Heard &quot;{parsedName}&quot;
        {item ? ` → ${item.name}` : ''}
      </Text>

      {showMatchPicker
        ? candidates.map((candidate) => (
            <Pressable
              key={candidate.itemId}
              accessibilityRole="button"
              accessibilityState={{ selected: activeId === candidate.itemId }}
              onPress={() => onSelectItem(candidate.itemId)}
              style={[styles.candidate, activeId === candidate.itemId && styles.candidateSelected]}
            >
              <Text style={styles.candidateName}>{candidate.itemName}</Text>
              <Text style={styles.candidateMeta}>
                {Math.round(candidate.score)}% · {candidate.matchedVia}
              </Text>
            </Pressable>
          ))
        : null}

      {!isBatch ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            value={qtyText}
            onChangeText={handleQtyChange}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />
          {unit ? <Text style={styles.hint}>Spoken unit: {unit}</Text> : null}
        </View>
      ) : null}

      {isBatch && item ? (
        <>
          <FillLevelSlider
            value={fillLevel}
            granularity={item.fill_granularity}
            containerSize={item.container_size}
            baseUnit={item.base_unit}
            onChange={handleFillChange}
          />
          {bomPreview.length > 0 ? (
            <View style={styles.bom}>
              <Text style={styles.bomTitle}>Ingredient preview</Text>
              {bomPreview.map((line) => (
                <Text key={line.itemId} style={styles.bomLine}>
                  {line.itemName}: {Math.round(line.qty)}
                  {line.unit}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.actionGhost}>
          <Text style={styles.actionGhostText}>Skip</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={showMatchPicker && !activeId}
          style={[styles.actionPrimary, showMatchPicker && !activeId && styles.disabled]}
        >
          <Text style={styles.actionPrimaryText}>Apply count</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.accent,
  },
  subtitle: {
    ...typography.body,
    color: colors.text,
  },
  candidate: {
    minHeight: tapTarget.minHeight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  candidateSelected: {
    borderColor: colors.accent,
    backgroundColor: '#1F6FEB33',
  },
  candidateName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  candidateMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  input: {
    minHeight: tapTarget.minHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    ...typography.body,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  bom: {
    gap: 2,
    padding: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
  },
  bomTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  bomLine: {
    ...typography.caption,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionGhost: {
    minHeight: tapTarget.minHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionGhostText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  actionPrimary: {
    minHeight: tapTarget.minHeight,
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
  },
  actionPrimaryText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
