import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, tapTarget } from '@/config/theme';
import type { MatchCandidate } from '@/types';

interface ConfirmMatchCardProps {
  parsedName: string;
  quantity: number;
  unit?: string;
  candidates: MatchCandidate[];
  selectedItemId?: string;
  onSelect: (itemId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmMatchCard({
  parsedName,
  quantity,
  unit,
  candidates,
  selectedItemId,
  onSelect,
  onConfirm,
  onCancel,
}: ConfirmMatchCardProps) {
  const activeId = selectedItemId ?? candidates[0]?.itemId;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Confirm match</Text>
      <Text style={styles.subtitle}>
        Heard &quot;{parsedName}&quot; × {quantity}
        {unit ? ` ${unit}` : ''}
      </Text>

      {candidates.map((candidate) => (
        <Pressable
          key={candidate.itemId}
          accessibilityRole="button"
          accessibilityState={{ selected: activeId === candidate.itemId }}
          onPress={() => onSelect(candidate.itemId)}
          style={[styles.candidate, activeId === candidate.itemId && styles.candidateSelected]}
        >
          <Text style={styles.candidateName}>{candidate.itemName}</Text>
          <Text style={styles.candidateMeta}>
            {Math.round(candidate.score)}% · {candidate.matchedVia} &quot;{candidate.matchedText}&quot;
          </Text>
        </Pressable>
      ))}

      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.actionGhost}>
          <Text style={styles.actionGhostText}>Skip</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={!activeId}
          style={[styles.actionPrimary, !activeId && styles.disabled]}
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
    borderColor: colors.warning,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.warning,
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
