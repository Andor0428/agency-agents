import { FlatList, StyleSheet, Text, View } from 'react-native';
import { formatAuditTrail } from '@/services/business';
import { colors, spacing, typography } from '@/config/theme';
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
    return <Text style={styles.empty}>No items counted yet. Hold the mic and speak an item and quantity.</Text>;
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item: row }) => (
        <View style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.name}>{row.item.name}</Text>
            <Text style={styles.total}>
              {row.item.is_batch
                ? `${Math.round(row.totalQty)}${row.item.base_unit}`
                : `${row.totalQty} ${row.item.display_unit}`}
            </Text>
          </View>
          <Text style={styles.audit}>{formatAuditTrail(row.events, row.item)}</Text>
          <Text style={styles.totalMeta}>
            {row.item.is_batch
              ? `Total volume: ${Math.round(row.totalQty)}${row.item.base_unit}`
              : `Total: ${row.totalQty} ${row.item.display_unit}`}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.md,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  total: {
    ...typography.heading,
    color: colors.accent,
  },
  audit: {
    ...typography.caption,
    color: colors.textMuted,
  },
  fill: {
    ...typography.caption,
    color: colors.textMuted,
  },
  totalMeta: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
