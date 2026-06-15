import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/config/theme';

interface OptionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function OptionChip({ label, selected, onPress }: OptionChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

interface OptionChipGroupProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}

export function OptionChipGroup({ label, options, value, onChange }: OptionChipGroupProps) {
  return (
    <View style={styles.group} accessibilityLabel={label}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => (
          <OptionChip
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  groupLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.text,
  },
});
