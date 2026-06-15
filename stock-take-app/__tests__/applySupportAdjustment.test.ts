jest.mock('@/services/spreadsheetSync/flush', () => ({
  triggerBackgroundSync: jest.fn(),
}));

import { applySupportAdjustment } from '@/services/support/applyAdjustment';

const repos = {
  items: {
    getById: async (id: string) =>
      id === 'item-1'
        ? {
            id: 'item-1',
            name: 'T-Shirt',
            category: 'apparel',
            storage_location: 'floor',
            base_unit: 'each',
            display_unit: 'each',
            container_size: null,
            is_batch: false,
            is_active: true,
            par_level: null,
            fill_granularity: 1,
            sku: 'TS-1',
            brand: null,
            color: null,
            size: 'M',
            barcode: null,
            created_at: '',
            updated_at: '',
          }
        : null,
  },
  sessions: {
    getById: async () => ({
      id: 'sess-1',
      name: 'Monday',
      location: 'floor',
      status: 'open' as const,
      started_at: '',
      closed_at: null,
    }),
  },
  countEvents: {
    getSessionTotals: async () => [{ item_id: 'item-1', total_qty: 5, event_count: 2 }],
    create: async (input: {
      sessionId: string;
      itemId: string;
      qty: number;
      rawTranscript?: string;
      confidenceScore?: number;
    }) => ({
      id: 'evt-adj',
      session_id: input.sessionId,
      item_id: input.itemId,
      qty: input.qty,
      fill_level: null,
      raw_transcript: input.rawTranscript ?? '',
      recipe_version: null,
      confidence_score: input.confidenceScore ?? 0,
      created_at: new Date().toISOString(),
    }),
  },
  syncQueue: {
    enqueue: jest.fn(),
  },
};

describe('applySupportAdjustment', () => {
  it('creates delta count event to reach proposed total', async () => {
    const result = await applySupportAdjustment(repos as never, {
      countSessionId: 'sess-1',
      itemId: 'item-1',
      itemName: 'T-Shirt',
      currentQty: 5,
      proposedQty: 7,
      changeRequestId: 'req-123',
    });

    expect(result.applied).toBe(true);
    expect(result.delta).toBe(2);
    expect(repos.syncQueue.enqueue).toHaveBeenCalledWith(
      'count_event',
      expect.objectContaining({ qty: 2, supportAdjustment: true })
    );
  });
});
