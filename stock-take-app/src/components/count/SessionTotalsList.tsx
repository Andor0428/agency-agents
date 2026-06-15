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
              {row.totalQty}
              {row.item.display_unit ? ` ${row.item.display_unit}` : ''}
            </Text>
          </View>
          <Text style={styles.audit}>{formatAuditTrail(row.events)}</Text>
          {row.item.is_batch && row.events.some((e) => e.fill_level != null) ? (
            <Text style={styles.fill}>
              Latest fill:{' '}
              {row.events[row.events.length - 1]?.fill_level != null
                ? `${Math.round((row.events[row.events.length - 1].fill_level ?? 0) * 100)}%`
                : '—'}
            </Text>
          ) : null}
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
});
