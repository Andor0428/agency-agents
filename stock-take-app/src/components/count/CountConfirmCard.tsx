import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FillLevelSlider } from '@/components/count/FillLevelSlider';
import { colors, radii, spacing, typography, tapTarget } from '@/config/theme';
import { useVerticalProfile } from '@/hooks/useVerticalProfile';
import { formatRetailItemLabel } from '@/config/vertical';
import { snapFillLevel } from '@/services/business';
import type { BomComponent } from '@/services/business';
import type { Item, MatchCandidate } from '@/types';

interface CountConfirmCardProps {
  parsedName: string;
  quantity: number;
  unit?: string;
  parsedColor?: string;
  parsedSize?: string;
  parsedSku?: string;
  showFillLevel?: boolean;
  item: Item | null;
  candidates: MatchCandidate[];
  selectedItemId?: string;
  showMatchPicker: boolean;
  itemIndex?: number;
  itemTotal?: number;
  bomPreview?: BomComponent[];
  onSelectItem: (itemId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onFillLevelChange: (fillLevel: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onCancelAll?: () => void;
}

export function CountConfirmCard({
  parsedName,
  quantity,
  unit,
  parsedColor,
  parsedSize,
  parsedSku,
  showFillLevel = true,
  item,
  candidates,
  selectedItemId,
  showMatchPicker,
  itemIndex,
  itemTotal,
  bomPreview = [],
  onSelectItem,
  onQuantityChange,
  onFillLevelChange,
  onConfirm,
  onCancel,
  onCancelAll,
}: CountConfirmCardProps) {
  const { profile } = useVerticalProfile();
  const activeId = selectedItemId ?? candidates[0]?.itemId;
  const isBatch = showFillLevel && (item?.is_batch ?? false);
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
      <View style={styles.titleRow}>
        <View style={styles.titleBadge}>
          <Ionicons
            name={showMatchPicker ? 'git-compare' : 'checkmark-done'}
            size={16}
            color={colors.accent}
          />
        </View>
        <Text style={styles.title}>{showMatchPicker ? 'Confirm match' : 'Review count'}</Text>
        {itemTotal && itemTotal > 1 && itemIndex !== undefined ? (
          <Text style={styles.progress}>
            {itemIndex + 1} of {itemTotal}
          </Text>
        ) : null}
      </View>
      <Text style={styles.helper}>
        Mic is paused while you review. Tap Apply, Skip, or Cancel to continue.
      </Text>
      <Text style={styles.subtitle}>
        Heard &quot;{parsedName}&quot;
        {parsedColor ? ` · ${parsedColor}` : ''}
        {parsedSize ? ` · size ${parsedSize}` : ''}
        {parsedSku ? ` · SKU ${parsedSku}` : ''}
        {item ? ` → ${profile.features.variants ? formatRetailItemLabel(item) : item.name}` : ''}
      </Text>

      {showMatchPicker
        ? candidates.map((candidate) => (
            <Pressable
              key={candidate.itemId}
              accessibilityRole="button"
              accessibilityLabel={`${candidate.itemName}, ${Math.round(candidate.score)} percent match`}
              accessibilityState={{ selected: activeId === candidate.itemId }}
              onPress={() => onSelectItem(candidate.itemId)}
              style={[styles.candidate, activeId === candidate.itemId && styles.candidateSelected]}
            >
              <Text style={styles.candidateName}>{candidate.itemName}</Text>
              <Text style={styles.candidateMeta}>
                {Math.round(candidate.score)}% · {candidate.matchedVia}
                {profile.features.variants ? ` · tap to select variant` : ''}
              </Text>
            </Pressable>
          ))
        : null}

      {!isBatch ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            accessibilityLabel="Quantity"
            value={qtyText}
            onChangeText={handleQtyChange}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />
          {unit ? <Text style={styles.hint}>Spoken unit: {unit}</Text> : null}
          <Text style={styles.hint}>Edit if Whisper heard the wrong number.</Text>
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
        {onCancelAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel review and return to recording"
            onPress={onCancelAll}
            style={styles.actionGhost}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
            <Text style={styles.actionGhostText}>Cancel</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip this item"
          onPress={onCancel}
          style={styles.actionGhost}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
          <Text style={styles.actionGhostText}>Skip</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apply count"
          accessibilityState={{ disabled: showMatchPicker && !activeId }}
          onPress={onConfirm}
          disabled={showMatchPicker && !activeId}
          style={[styles.actionPrimary, showMatchPicker && !activeId && styles.disabled]}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.actionPrimaryText}>Apply count</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleBadge: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
  },
  progress: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  candidate: {
    minHeight: tapTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  candidateSelected: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
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
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  bom: {
    gap: 2,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
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
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: tapTarget.minHeight,
    justifyContent: 'center',
    backgroundColor: colors.accentStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  actionPrimaryText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
