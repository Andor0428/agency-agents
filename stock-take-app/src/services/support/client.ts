import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasSupportApi, supportApi } from '@/config/supportApi';
import { loadSettings } from '@/config/settings';
import { getRepositories } from '@/services/db';
import {
  loadDeviceCredentials,
  saveDeviceCredentials,
  clearDeviceCredentials,
  type DeviceCredentials,
} from './deviceCredentials';
import { buildSupportSnapshot, type SupportSnapshot } from './snapshot';

const SUPPORT_CODE_KEY = '@stocktake/support_code';

export type SupportSessionInfo = {
  sessionId: string;
  code: string;
  expiresAt: string;
};

export type ActiveSupportSession = {
  id: string;
  status: string;
  expiresAt: string;
  orgName: string;
};

export type ChangeRequest = {
  id: string;
  supportSessionId: string;
  countSessionId: string;
  countSessionName: string;
  itemId: string;
  itemName: string;
  currentQty: number;
  proposedQty: number;
  reason: string | null;
  status: string;
  createdAt: string;
};

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  credentials?: DeviceCredentials
): Promise<T> {
  if (!hasSupportApi()) {
    throw new Error('Support API URL is not configured');
  }

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (credentials) {
    headers.set('X-Device-Id', credentials.deviceId);
    headers.set('X-Device-Secret', credentials.deviceSecret);
  }

  const response = await fetch(`${supportApi.baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function ensureDeviceRegistered(): Promise<DeviceCredentials> {
  const existing = await loadDeviceCredentials();
  if (existing) return existing;

  const settings = await loadSettings();
  const result = await apiFetch<{
    deviceId: string;
    deviceSecret: string;
    orgId: string;
  }>('/api/device/register', {
    method: 'POST',
    body: JSON.stringify({
      orgName: settings.storeName || 'Stock Take customer',
      businessType: settings.businessType,
      retailSubType: settings.retailSubType,
      label: 'mobile',
    }),
  });

  const credentials = {
    deviceId: result.deviceId,
    deviceSecret: result.deviceSecret,
    orgId: result.orgId,
  };
  await saveDeviceCredentials(credentials);
  if (settings.supportAlertEmail) {
    await apiFetch(
      '/api/device/org/alert-email',
      {
        method: 'PUT',
        body: JSON.stringify({ alertEmail: settings.supportAlertEmail.trim() }),
      },
      credentials
    );
  }
  return credentials;
}

export async function createSupportSession(): Promise<SupportSessionInfo> {
  const credentials = await ensureDeviceRegistered();
  const result = await apiFetch<SupportSessionInfo>(
    '/api/device/support/sessions',
    { method: 'POST' },
    credentials
  );
  await AsyncStorage.setItem(
    SUPPORT_CODE_KEY,
    JSON.stringify({ sessionId: result.sessionId, code: result.code })
  );
  await uploadSupportSnapshot(result.sessionId);
  return result;
}

export async function getStoredSupportCode(sessionId: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(SUPPORT_CODE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { sessionId: string; code: string };
    return parsed.sessionId === sessionId ? parsed.code : null;
  } catch {
    return null;
  }
}

export async function getActiveSupportSession(): Promise<ActiveSupportSession | null> {
  if (!hasSupportApi()) return null;
  const credentials = await loadDeviceCredentials();
  if (!credentials) return null;

  const result = await apiFetch<{ session: ActiveSupportSession | null }>(
    '/api/device/support/sessions/active',
    {},
    credentials
  );
  return result.session;
}

export async function uploadSupportSnapshot(sessionId: string): Promise<void> {
  const credentials = await ensureDeviceRegistered();
  const repos = await getRepositories();
  const settings = await loadSettings();
  const snapshot: SupportSnapshot = await buildSupportSnapshot(repos, settings);

  await apiFetch(
    `/api/device/support/sessions/${sessionId}/snapshot`,
    {
      method: 'POST',
      body: JSON.stringify(snapshot),
    },
    credentials
  );
}

export async function revokeSupportSession(sessionId: string): Promise<void> {
  const credentials = await ensureDeviceRegistered();
  await apiFetch(
    `/api/device/support/sessions/${sessionId}/revoke`,
    { method: 'POST' },
    credentials
  );
  await AsyncStorage.removeItem(SUPPORT_CODE_KEY);
}

export function isSupportConfigured(): boolean {
  return hasSupportApi();
}

export async function fetchPendingChangeRequests(): Promise<ChangeRequest[]> {
  const credentials = await ensureDeviceRegistered();
  const result = await apiFetch<{ requests: ChangeRequest[] }>(
    '/api/device/support/change-requests/pending',
    {},
    credentials
  );
  return result.requests;
}

export async function resolveChangeRequest(
  changeRequestId: string,
  decision: 'approve' | 'deny'
): Promise<ChangeRequest> {
  const credentials = await ensureDeviceRegistered();
  const result = await apiFetch<{ request: ChangeRequest }>(
    `/api/device/support/change-requests/${changeRequestId}/resolve`,
    {
      method: 'POST',
      body: JSON.stringify({ decision }),
    },
    credentials
  );
  return result.request;
}

export async function markChangeRequestApplied(changeRequestId: string): Promise<ChangeRequest> {
  const credentials = await ensureDeviceRegistered();
  const result = await apiFetch<{ request: ChangeRequest }>(
    `/api/device/support/change-requests/${changeRequestId}/applied`,
    { method: 'POST' },
    credentials
  );
  return result.request;
}

export async function createOrgLinkCode(): Promise<{ code: string; expiresAt: string }> {
  const credentials = await ensureDeviceRegistered();
  return apiFetch<{ code: string; expiresAt: string }>(
    '/api/device/org/link-code',
    { method: 'POST' },
    credentials
  );
}

export async function listOrgDevices(): Promise<
  Array<{ id: string; label: string | null; createdAt: string; lastSeenAt: string }>
> {
  const credentials = await ensureDeviceRegistered();
  const result = await apiFetch<{
    devices: Array<{ id: string; label: string | null; createdAt: string; lastSeenAt: string }>;
  }>('/api/device/org/devices', {}, credentials);
  return result.devices;
}

export async function updateOrgAlertEmail(alertEmail: string): Promise<void> {
  const credentials = await ensureDeviceRegistered();
  await apiFetch(
    '/api/device/org/alert-email',
    {
      method: 'PUT',
      body: JSON.stringify({ alertEmail: alertEmail.trim() || null }),
    },
    credentials
  );
}

export async function joinOrganizationWithLinkCode(
  orgLinkCode: string,
  label?: string
): Promise<DeviceCredentials> {
  await clearDeviceCredentials();
  const settings = await loadSettings();
  const result = await apiFetch<{
    deviceId: string;
    deviceSecret: string;
    orgId: string;
  }>('/api/device/register', {
    method: 'POST',
    body: JSON.stringify({
      orgName: settings.storeName || 'Linked device',
      businessType: settings.businessType,
      retailSubType: settings.retailSubType,
      label: label ?? 'mobile',
      orgLinkCode: orgLinkCode.trim(),
    }),
  });

  const credentials = {
    deviceId: result.deviceId,
    deviceSecret: result.deviceSecret,
    orgId: result.orgId,
  };
  await saveDeviceCredentials(credentials);
  if (settings.supportAlertEmail) {
    await updateOrgAlertEmail(settings.supportAlertEmail);
  }
  return credentials;
}
