import { config } from '../config.js';
import { getDb } from '../db.js';

export type GoogleConnection = {
  spreadsheetId: string;
  sheetName: string;
  connectedAt: string;
  tokenExpiresAt: string | null;
};

type OrgGoogleRow = {
  google_refresh_token: string | null;
  google_access_token: string | null;
  google_token_expires_at: string | null;
  google_spreadsheet_id: string | null;
  google_sheet_name: string | null;
  google_connected_at: string | null;
};

export function saveGoogleConnection(
  orgId: string,
  input: {
    refreshToken: string;
    accessToken: string;
    expiresAt: string | null;
    spreadsheetId: string;
    sheetName: string;
  }
): GoogleConnection {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE organizations SET
      google_refresh_token = ?,
      google_access_token = ?,
      google_token_expires_at = ?,
      google_spreadsheet_id = ?,
      google_sheet_name = ?,
      google_connected_at = ?
     WHERE id = ?`
  ).run(
    input.refreshToken,
    input.accessToken,
    input.expiresAt,
    input.spreadsheetId,
    input.sheetName,
    now,
    orgId
  );

  return {
    spreadsheetId: input.spreadsheetId,
    sheetName: input.sheetName,
    connectedAt: now,
    tokenExpiresAt: input.expiresAt,
  };
}

export function getGoogleConnection(orgId: string): GoogleConnection | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT google_refresh_token, google_access_token, google_token_expires_at,
              google_spreadsheet_id, google_sheet_name, google_connected_at
       FROM organizations WHERE id = ?`
    )
    .get(orgId) as OrgGoogleRow | undefined;

  if (!row?.google_refresh_token || !row.google_spreadsheet_id) return null;

  return {
    spreadsheetId: row.google_spreadsheet_id,
    sheetName: row.google_sheet_name ?? 'Inventory',
    connectedAt: row.google_connected_at ?? '',
    tokenExpiresAt: row.google_token_expires_at,
  };
}

export function clearGoogleConnection(orgId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE organizations SET
      google_refresh_token = NULL,
      google_access_token = NULL,
      google_token_expires_at = NULL,
      google_spreadsheet_id = NULL,
      google_sheet_name = NULL,
      google_connected_at = NULL
     WHERE id = ?`
  ).run(orgId);
}

export async function getValidAccessToken(orgId: string): Promise<string | null> {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT google_refresh_token, google_access_token, google_token_expires_at
       FROM organizations WHERE id = ?`
    )
    .get(orgId) as OrgGoogleRow | undefined;

  if (!row?.google_refresh_token) return null;

  const expiresAt = row.google_token_expires_at
    ? new Date(row.google_token_expires_at).getTime()
    : 0;
  if (row.google_access_token && expiresAt > Date.now() + 60_000) {
    return row.google_access_token;
  }

  if (!config.googleOAuthClientId || !config.googleOAuthClientSecret) {
    return row.google_access_token;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.googleOAuthClientId,
      client_secret: config.googleOAuthClientSecret,
      refresh_token: row.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) return null;

  const json = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
  const newExpires = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  db.prepare(
    `UPDATE organizations SET google_access_token = ?, google_token_expires_at = ? WHERE id = ?`
  ).run(json.access_token, newExpires, orgId);

  return json.access_token;
}
