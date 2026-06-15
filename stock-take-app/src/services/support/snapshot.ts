import type { Repositories } from '@/services/db/repositories';
import type { AppSettings } from '@/types';

export type SupportSnapshot = {
  capturedAt: string;
  store: {
    businessType: string;
    retailSubType?: string;
    storeName: string;
  };
  catalog: {
    itemCount: number;
    items: Array<{
      id: string;
      name: string;
      sku: string | null;
      barcode: string | null;
      category: string | null;
      storage_location: string;
      is_active: boolean;
    }>;
  };
  sessions: Array<{
    id: string;
    name: string;
    location: string;
    status: string;
    started_at: string;
    closed_at: string | null;
    totals: Array<{
      itemId: string;
      itemName: string;
      totalQty: number;
      eventCount: number;
    }>;
    events: Array<{
      id: string;
      itemId: string;
      itemName: string;
      qty: number;
      fill_level: number | null;
      raw_transcript: string;
      confidence_score: number;
      created_at: string;
    }>;
  }>;
  syncQueue: Record<string, number>;
};

export async function buildSupportSnapshot(
  repos: Repositories,
  settings: AppSettings
): Promise<SupportSnapshot> {
  const items = await repos.items.getAll();
  const sessions = await repos.sessions.getAll();
  const syncQueue = await repos.syncQueue.getStatusCounts();
  const itemNames = new Map(items.map((item) => [item.id, item.name]));

  const sessionsWithData = await Promise.all(
    sessions.map(async (session) => {
      const totals = await repos.countEvents.getSessionTotals(session.id);
      const events = await repos.countEvents.getBySession(session.id);
      return {
        id: session.id,
        name: session.name,
        location: session.location,
        status: session.status,
        started_at: session.started_at,
        closed_at: session.closed_at,
        totals: totals.map((row) => ({
          itemId: row.item_id,
          itemName: itemNames.get(row.item_id) ?? 'Unknown item',
          totalQty: row.total_qty,
          eventCount: row.event_count,
        })),
        events: events.map((event) => ({
          id: event.id,
          itemId: event.item_id,
          itemName: itemNames.get(event.item_id) ?? 'Unknown item',
          qty: event.qty,
          fill_level: event.fill_level,
          raw_transcript: event.raw_transcript,
          confidence_score: event.confidence_score,
          created_at: event.created_at,
        })),
      };
    })
  );

  return {
    capturedAt: new Date().toISOString(),
    store: {
      businessType: settings.businessType,
      retailSubType: settings.retailSubType,
      storeName: settings.storeName || 'Unnamed store',
    },
    catalog: {
      itemCount: items.length,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        category: item.category,
        storage_location: item.storage_location,
        is_active: item.is_active,
      })),
    },
    sessions: sessionsWithData,
    syncQueue,
  };
}
