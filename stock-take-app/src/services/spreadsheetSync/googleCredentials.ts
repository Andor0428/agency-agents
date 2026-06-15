import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'stocktake_google_refresh';
const ACCESS_KEY = 'stocktake_google_access';
const EXPIRES_KEY = 'stocktake_google_expires';

export type StoredGoogleTokens = {
  refreshToken: string;
  accessToken: string;
  expiresAt: string | null;
};

export async function saveGoogleTokens(tokens: StoredGoogleTokens): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
  if (tokens.expiresAt) {
    await SecureStore.setItemAsync(EXPIRES_KEY, tokens.expiresAt);
  } else {
    await SecureStore.deleteItemAsync(EXPIRES_KEY);
  }
}

export async function loadGoogleTokens(): Promise<StoredGoogleTokens | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  const accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
  if (!refreshToken || !accessToken) return null;
  const expiresAt = await SecureStore.getItemAsync(EXPIRES_KEY);
  return { refreshToken, accessToken, expiresAt };
}

export async function clearGoogleTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(EXPIRES_KEY);
}

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now() + 60_000;
}
