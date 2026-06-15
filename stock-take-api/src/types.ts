export type SupportSessionStatus = 'pending' | 'active' | 'revoked' | 'expired';

export type ChangeRequestStatus = 'pending' | 'approved' | 'denied' | 'applied' | 'expired';

export type AuditActorType = 'admin' | 'device' | 'system';

export interface SupportSnapshotPayload {
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
}

export interface SupportSessionRecord {
  id: string;
  orgId: string;
  orgName: string;
  deviceId: string;
  status: SupportSessionStatus;
  code: string;
  expiresAt: string;
  createdAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
}

export interface ChangeRequestRecord {
  id: string;
  supportSessionId: string;
  countSessionId: string;
  countSessionName: string;
  itemId: string;
  itemName: string;
  currentQty: number;
  proposedQty: number;
  reason: string | null;
  status: ChangeRequestStatus;
  proposedByAdmin: string;
  createdAt: string;
  resolvedAt: string | null;
  appliedAt: string | null;
}
