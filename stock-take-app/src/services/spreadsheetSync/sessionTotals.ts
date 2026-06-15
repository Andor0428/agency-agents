import type { Repositories } from '@/services/db/repositories';
import { formatAuditTrail } from '@/services/business';
import { formatRetailItemLabel } from '@/config/vertical';
import type { CountEvent, Item } from '@/types';
import type { SpreadsheetRowUpdate } from './types';

export function findRowIndexByName(rows: string[][], itemName: string): number {
  const target = itemName.trim().toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    const cell = rows[i]?.[0]?.trim().toLowerCase();
    if (cell === target) return i;
  }
  return -1;
}

export function spreadsheetItemLabel(item: Item): string {
  if (item.sku) {
    return formatRetailItemLabel(item);
  }
  return item.name;
}

export async function buildSpreadsheetUpdatesForSession(
  repos: Repositories,
  sessionId: string
): Promise<SpreadsheetRowUpdate[]> {
  const events = await repos.countEvents.getBySession(sessionId);
  if (events.length === 0) return [];

  const items = await repos.items.getAll();
  const itemMap = new Map(items.map((item) => [item.id, item]));

  const grouped = new Map<string, CountEvent[]>();
  for (const event of events) {
    const list = grouped.get(event.item_id) ?? [];
    list.push(event);
    grouped.set(event.item_id, list);
  }

  const updates: SpreadsheetRowUpdate[] = [];
  for (const [itemId, itemEvents] of grouped) {
    const item = itemMap.get(itemId);
    if (!item) continue;

    const totalQty = itemEvents.reduce((sum, event) => sum + event.qty, 0);
    updates.push({
      itemName: spreadsheetItemLabel(item),
      quantity: totalQty,
      auditTrail: formatAuditTrail(itemEvents, item),
    });
  }

  updates.sort((a, b) => a.itemName.localeCompare(b.itemName));
  return updates;
}

export function dedupeSpreadsheetUpdates(updates: SpreadsheetRowUpdate[]): SpreadsheetRowUpdate[] {
  const map = new Map<string, SpreadsheetRowUpdate>();
  for (const update of updates) {
    map.set(update.itemName.toLowerCase(), update);
  }
  return Array.from(map.values());
}
