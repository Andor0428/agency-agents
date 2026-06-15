import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasSupportApi, supportApi } from '@/config/supportApi';
import { loadSettings } from '@/config/settings';
import { getRepositories } from '@/services/db';
import {
  loadDeviceCredentials,
  saveDeviceCredentials,
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
