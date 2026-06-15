import { buildSupportSnapshot } from '@/services/support/snapshot';
import type { AppSettings } from '@/types';

const settings: AppSettings = {
  onboardingComplete: true,
  businessType: 'hospitality',
  retailSubType: 'apparel',
  storeName: 'Test Venue',
  defaultLocation: 'bar',
  confidenceThreshold: 80,
  defaultBaseUnit: 'ml',
  spreadsheetProvider: 'none',
  useMockServices: true,
  supportAlertEmail: '',
  googleSpreadsheetId: '',
  googleSheetName: 'Inventory',
  googleConnected: false,
};

const repos = {
  items: {
    getAll: async () => [
      {
        id: 'item-1',
        name: 'Vodka',
        category: 'spirits',
        storage_location: 'bar',
        base_unit: 'ml',
        display_unit: 'bottle',
        container_size: 750,
        is_batch: false,
        is_active: true,
        par_level: null,
        fill_granularity: 0.1,
        sku: null,
        brand: null,
        color: null,
        size: null,
        barcode: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  },
  sessions: {
    getAll: async () => [
      {
        id: 'sess-1',
        name: 'Friday',
        location: 'bar',
        status: 'open' as const,
        started_at: '2026-01-01T18:00:00.000Z',
        closed_at: null,
      },
    ],
  },
  countEvents: {
    getSessionTotals: async () => [{ item_id: 'item-1', total_qty: 3, event_count: 2 }],
    getBySession: async () => [
      {
        id: 'evt-1',
        session_id: 'sess-1',
        item_id: 'item-1',
        qty: 2,
        fill_level: null,
        raw_transcript: 'two vodka',
        recipe_version: null,
        confidence_score: 92,
        created_at: '2026-01-01T18:05:00.000Z',
      },
    ],
  },
  syncQueue: {
    getStatusCounts: async () => ({
      pending: 1,
      processing: 0,
      completed: 0,
      failed: 0,
    }),
  },
};

describe('buildSupportSnapshot', () => {
  it('includes store, sessions, totals, and sync queue', async () => {
    const snapshot = await buildSupportSnapshot(repos as never, settings);
    expect(snapshot.store.storeName).toBe('Test Venue');
    expect(snapshot.catalog.itemCount).toBe(1);
    expect(snapshot.sessions[0].totals[0].totalQty).toBe(3);
    expect(snapshot.syncQueue.pending).toBe(1);
  });
});
