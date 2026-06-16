import { env, hasGoogleSheetsConfig } from '@/config/env';
import { hasSupportApi } from '@/config/supportApi';
import { loadSettings } from '@/config/settings';
import { ensureDeviceRegistered } from '@/services/support/client';
import { loadDeviceCredentials } from '@/services/support/deviceCredentials';
import { supportApi } from '@/config/supportApi';
import { createGoogleSheetsService, GoogleSheetsSyncService } from './googleSheets';
import { getValidGoogleAccessToken } from './googleAuth';
import { loadGoogleTokens as loadStoredTokens } from './googleCredentials';

async function fetchGoogleFromApi(): Promise<{
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
} | null> {
  if (!hasSupportApi()) return null;
  const credentials = await loadDeviceCredentials();
  if (!credentials) return null;

  const response = await fetch(`${supportApi.baseUrl}/api/device/google/access-token`, {
    headers: {
      'X-Device-Id': credentials.deviceId,
      'X-Device-Secret': credentials.deviceSecret,
    },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    accessToken: string;
    connection: { spreadsheetId: string; sheetName: string };
  };
  return {
    accessToken: data.accessToken,
    spreadsheetId: data.connection.spreadsheetId,
    sheetName: data.connection.sheetName,
  };
}

export async function resolveGoogleSheetsService(): Promise<GoogleSheetsSyncService | null> {
  const settings = await loadSettings();
  if (settings.spreadsheetProvider !== 'google') return null;

  const spreadsheetId =
    settings.googleSpreadsheetId || env.googleSheetsSpreadsheetId || undefined;
  const sheetName = settings.googleSheetName || env.googleSheetsSheetName || 'Inventory';

  if (settings.googleConnected && spreadsheetId) {
    const accessToken = await getValidGoogleAccessToken();
    if (accessToken) {
      return createGoogleSheetsService(sheetName, { spreadsheetId, accessToken });
    }
  }

  const fromApi = await fetchGoogleFromApi();
  if (fromApi) {
    return createGoogleSheetsService(fromApi.sheetName, {
      spreadsheetId: fromApi.spreadsheetId,
      accessToken: fromApi.accessToken,
    });
  }

  if (hasGoogleSheetsConfig()) {
    return createGoogleSheetsService(sheetName, {
      spreadsheetId: env.googleSheetsSpreadsheetId,
      apiKey: env.googleSheetsApiKey,
    });
  }

  return null;
}

export async function syncGoogleConnectionToApi(input: {
  refreshToken: string;
  accessToken: string;
  expiresAt: string | null;
  spreadsheetId: string;
  sheetName: string;
}): Promise<void> {
  if (!hasSupportApi()) return;
  await ensureDeviceRegistered();
  const credentials = await loadDeviceCredentials();
  if (!credentials) return;

  await fetch(`${supportApi.baseUrl}/api/device/google/connect`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': credentials.deviceId,
      'X-Device-Secret': credentials.deviceSecret,
    },
    body: JSON.stringify(input),
  });
}

export async function disconnectGoogleEverywhere(): Promise<void> {
  const { disconnectGoogleAccount } = await import('./googleAuth');
  await disconnectGoogleAccount();

  if (!hasSupportApi()) return;
  const credentials = await loadDeviceCredentials();
  if (!credentials) return;

  await fetch(`${supportApi.baseUrl}/api/device/google/disconnect`, {
    method: 'DELETE',
    headers: {
      'X-Device-Id': credentials.deviceId,
      'X-Device-Secret': credentials.deviceSecret,
    },
  });
}

export async function getGoogleConnectionStatus(): Promise<{
  connected: boolean;
  spreadsheetId: string;
  sheetName: string;
  source: 'local' | 'api' | 'env' | 'none';
}> {
  const settings = await loadSettings();
  const stored = await loadStoredTokens();

  if (settings.googleConnected && stored) {
    return {
      connected: true,
      spreadsheetId: settings.googleSpreadsheetId,
      sheetName: settings.googleSheetName || 'Inventory',
      source: 'local',
    };
  }

  if (hasSupportApi()) {
    const credentials = await loadDeviceCredentials();
    if (credentials) {
      const response = await fetch(`${supportApi.baseUrl}/api/device/google/status`, {
        headers: {
          'X-Device-Id': credentials.deviceId,
          'X-Device-Secret': credentials.deviceSecret,
        },
      });
      if (response.ok) {
        const data = (await response.json()) as {
          connected: boolean;
          connection: { spreadsheetId: string; sheetName: string } | null;
        };
        if (data.connected && data.connection) {
          return {
            connected: true,
            spreadsheetId: data.connection.spreadsheetId,
            sheetName: data.connection.sheetName,
            source: 'api',
          };
        }
      }
    }
  }

  if (hasGoogleSheetsConfig()) {
    return {
      connected: true,
      spreadsheetId: env.googleSheetsSpreadsheetId,
      sheetName: env.googleSheetsSheetName,
      source: 'env',
    };
  }

  return { connected: false, spreadsheetId: '', sheetName: 'Inventory', source: 'none' };
}
