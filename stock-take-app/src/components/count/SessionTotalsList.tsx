import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatAuditTrail } from '@/services/business';
import { colors, radii, spacing, typography } from '@/config/theme';
import type { CountEvent, Item } from '@/types';

export type SessionTotalRow = {
  item: Item;
  events: CountEvent[];
  totalQty: number;
};

interface SessionTotalsListProps {
  rows: SessionTotalRow[];
}

export function SessionTotalsList({ rows }: SessionTotalsListProps) {
  if (rows.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyBadge}>
          <Ionicons name="mic-outline" size={26} color={colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>No counts yet</Text>
        <Text style={styles.empty}>Hold the mic and speak an item and quantity to begin.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      renderItem={({ item: row }) => (
        <View style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.name} numberOfLines={1}>
              {row.item.name}
            </Text>
            <Text style={styles.audit} numberOfLines={1}>
              {formatAuditTrail(row.events, row.item)}
            </Text>
          </View>
          <View style={styles.totalPill}>
            <Text style={styles.total}>
              {row.item.is_batch
                ? `${Math.round(row.totalQty)}${row.item.base_unit}`
                : `${row.totalQty}`}
            </Text>
            {!row.item.is_batch ? (
              <Text style={styles.totalUnit}>{row.item.display_unit}</Text>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.md,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  emptyBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.subheading,
    color: colors.text,
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sep: {
    height: 1,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  audit: {
    ...typography.caption,
    color: colors.textMuted,
  },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  total: {
    ...typography.heading,
    color: colors.accent,
  },
  totalUnit: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
});
