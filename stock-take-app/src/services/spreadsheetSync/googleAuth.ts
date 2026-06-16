import {
  AuthRequest,
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { googleOAuth } from '@/config/googleOAuth';
import { isTokenExpired, saveGoogleTokens, type StoredGoogleTokens } from './googleCredentials';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export function hasGoogleOAuthConfig(): boolean {
  return googleOAuth.clientId.length > 0;
}

export function parseSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

export async function connectGoogleAccount(): Promise<StoredGoogleTokens> {
  if (!hasGoogleOAuthConfig()) {
    throw new Error('Set GOOGLE_OAUTH_CLIENT_ID in .env (Google Cloud → Desktop app client)');
  }

  const redirectUri = makeRedirectUri({ scheme: 'stocktake' });
  const request = new AuthRequest({
    clientId: googleOAuth.clientId,
    scopes: [SHEETS_SCOPE],
    redirectUri,
    responseType: ResponseType.Code,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Google sign-in was cancelled or failed');
  }

  const tokenResponse = await exchangeCodeAsync(
    {
      clientId: googleOAuth.clientId,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? '',
      },
    },
    GOOGLE_DISCOVERY
  );

  if (!tokenResponse.accessToken) {
    throw new Error('Google did not return an access token');
  }
  if (!tokenResponse.refreshToken) {
    throw new Error(
      'Google did not return a refresh token. Revoke app access in Google Account settings and try again.'
    );
  }

  const expiresAt = tokenResponse.expiresIn
    ? new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString()
    : null;

  const tokens: StoredGoogleTokens = {
    refreshToken: tokenResponse.refreshToken,
    accessToken: tokenResponse.accessToken,
    expiresAt,
  };
  await saveGoogleTokens(tokens);
  return tokens;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  if (!hasGoogleOAuthConfig()) {
    throw new Error('Google OAuth is not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: googleOAuth.clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Google access token');
  }

  const json = (await response.json()) as { access_token: string; expires_in?: number };
  const expiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  await saveGoogleTokens({
    refreshToken,
    accessToken: json.access_token,
    expiresAt,
  });

  return json.access_token;
}

export async function getValidGoogleAccessToken(): Promise<string | null> {
  const { loadGoogleTokens } = await import('./googleCredentials');
  const stored = await loadGoogleTokens();
  if (!stored) return null;

  if (!isTokenExpired(stored.expiresAt)) {
    return stored.accessToken;
  }

  try {
    return await refreshGoogleAccessToken(stored.refreshToken);
  } catch {
    return null;
  }
}

export async function disconnectGoogleAccount(): Promise<void> {
  const { clearGoogleTokens } = await import('./googleCredentials');
  await clearGoogleTokens();
}
