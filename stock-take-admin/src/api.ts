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

export type SupportSession = {
  id: string;
  orgId: string;
  orgName: string;
  deviceId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
};

const TOKEN_KEY = 'st_admin_token';
const VIEW_KEY = 'st_view_token';
const SESSION_KEY = 'st_session_id';

export function getStoredAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSupportAccess(): void {
  localStorage.removeItem(VIEW_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function setSupportAccess(sessionId: string, viewToken: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
  localStorage.setItem(VIEW_KEY, viewToken);
}

export function getSupportAccess(): { sessionId: string; viewToken: string } | null {
  const sessionId = localStorage.getItem(SESSION_KEY);
  const viewToken = localStorage.getItem(VIEW_KEY);
  if (!sessionId || !viewToken) return null;
  return { sessionId, viewToken };
}

export async function loginAdmin(email: string, password: string): Promise<void> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Login failed');
  }
  const data = (await res.json()) as { token: string };
  setStoredAdminToken(data.token);
}

export async function redeemCode(code: string): Promise<{ orgName: string }> {
  const token = getStoredAdminToken();
  if (!token) throw new Error('Not logged in');
  const res = await fetch('/api/admin/support/redeem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Invalid code');
  }
  const data = (await res.json()) as {
    sessionId: string;
    viewToken: string;
    orgName: string;
  };
  setSupportAccess(data.sessionId, data.viewToken);
  return { orgName: data.orgName };
}

export async function fetchSupportSession(): Promise<{
  session: SupportSession;
  snapshot: SupportSnapshot | null;
}> {
  const token = getStoredAdminToken();
  const access = getSupportAccess();
  if (!token || !access) throw new Error('Missing support access');

  const res = await fetch(`/api/admin/support/sessions/${access.sessionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-View-Token': access.viewToken,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to load session');
  }
  return res.json();
}
