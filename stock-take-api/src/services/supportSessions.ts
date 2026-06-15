import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import {
  generateSupportCode,
  hashSecret,
  randomToken,
  sha256,
  verifySecret,
} from '../crypto.js';
import { getDb } from '../db.js';
import type { SupportSessionRecord, SupportSessionStatus, SupportSnapshotPayload } from '../types.js';
import { writeAudit } from './audit.js';

type DeviceRow = {
  id: string;
  org_id: string;
  secret_hash: string;
  label: string | null;
};

type SessionRow = {
  id: string;
  org_id: string;
  device_id: string;
  code_hash: string;
  status: SupportSessionStatus;
  expires_at: string;
  created_at: string;
  activated_at: string | null;
  revoked_at: string | null;
  view_token_hash: string | null;
  org_name: string;
};

function expireStaleSessions(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const stale = db
    .prepare(
      `SELECT id FROM support_sessions
       WHERE status IN ('pending', 'active') AND expires_at < ?`
    )
    .all(now) as Array<{ id: string }>;

  for (const row of stale) {
    db.prepare(`UPDATE support_sessions SET status = 'expired' WHERE id = ?`).run(row.id);
    writeAudit(row.id, 'system', null, 'session_expired');
  }
}

export function registerDevice(input: {
  orgName: string;
  businessType: string;
  retailSubType?: string;
  label?: string;
}): { deviceId: string; deviceSecret: string; orgId: string } {
  const db = getDb();
  const now = new Date().toISOString();
  const orgId = randomUUID();
  const deviceId = randomUUID();
  const deviceSecret = randomToken(24);

  db.prepare(
    `INSERT INTO organizations (id, name, business_type, retail_sub_type, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(orgId, input.orgName, input.businessType, input.retailSubType ?? null, now);

  db.prepare(
    `INSERT INTO devices (id, org_id, secret_hash, label, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(deviceId, orgId, hashSecret(deviceSecret), input.label ?? null, now, now);

  writeAudit(null, 'device', deviceId, 'device_registered', { orgId });
  return { deviceId, deviceSecret, orgId };
}

export function authenticateDevice(deviceId: string, deviceSecret: string): DeviceRow | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) as DeviceRow | undefined;
  if (!row || !verifySecret(deviceSecret, row.secret_hash)) return null;

  db.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    deviceId
  );
  return row;
}

export function createSupportSession(deviceId: string): {
  sessionId: string;
  code: string;
  expiresAt: string;
} {
  expireStaleSessions();
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) as DeviceRow | undefined;
  if (!device) throw new Error('Device not found');

  db.prepare(
    `UPDATE support_sessions SET status = 'revoked', revoked_at = ?
     WHERE device_id = ? AND status IN ('pending', 'active')`
  ).run(new Date().toISOString(), deviceId);

  const code = generateSupportCode();
  const sessionId = randomUUID();
  const expiresAt = new Date(
    Date.now() + config.supportCodeTtlMinutes * 60 * 1000
  ).toISOString();

  db.prepare(
    `INSERT INTO support_sessions
     (id, org_id, device_id, code_hash, status, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`
  ).run(sessionId, device.org_id, deviceId, sha256(code), expiresAt, new Date().toISOString());

  writeAudit(sessionId, 'device', deviceId, 'support_session_created', { expiresAt });
  return { sessionId, code, expiresAt };
}

export function getActiveSessionForDevice(deviceId: string): SupportSessionRecord | null {
  expireStaleSessions();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.*, o.name as org_name
       FROM support_sessions s
       JOIN organizations o ON o.id = s.org_id
       WHERE s.device_id = ? AND s.status IN ('pending', 'active')
       ORDER BY s.created_at DESC LIMIT 1`
    )
    .get(deviceId) as SessionRow | undefined;

  if (!row) return null;
  return mapSession(row, '******');
}

export function revokeSupportSession(sessionId: string, deviceId: string): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT id, device_id, status FROM support_sessions WHERE id = ?')
    .get(sessionId) as { id: string; device_id: string; status: string } | undefined;
  if (!row || row.device_id !== deviceId) return false;
  if (row.status === 'revoked' || row.status === 'expired') return true;

  db.prepare(
    `UPDATE support_sessions SET status = 'revoked', revoked_at = ? WHERE id = ?`
  ).run(new Date().toISOString(), sessionId);
  writeAudit(sessionId, 'device', deviceId, 'support_session_revoked');
  return true;
}

export function uploadSnapshot(
  sessionId: string,
  deviceId: string,
  payload: SupportSnapshotPayload
): void {
  const db = getDb();
  const session = db
    .prepare('SELECT id, device_id, status FROM support_sessions WHERE id = ?')
    .get(sessionId) as { id: string; device_id: string; status: string } | undefined;
  if (!session || session.device_id !== deviceId) throw new Error('Session not found');
  if (!['pending', 'active'].includes(session.status)) throw new Error('Session not active');

  db.prepare('DELETE FROM support_snapshots WHERE session_id = ?').run(sessionId);
  db.prepare(
    `INSERT INTO support_snapshots (id, session_id, payload_json, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(randomUUID(), sessionId, JSON.stringify(payload), new Date().toISOString());

  writeAudit(sessionId, 'device', deviceId, 'snapshot_uploaded', {
    capturedAt: payload.capturedAt,
  });
}

export function redeemSupportCode(
  code: string,
  adminId: string
): { sessionId: string; viewToken: string; orgName: string } {
  expireStaleSessions();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.*, o.name as org_name
       FROM support_sessions s
       JOIN organizations o ON o.id = s.org_id
       WHERE s.code_hash = ? AND s.status = 'pending' AND s.expires_at >= ?`
    )
    .get(sha256(code), new Date().toISOString()) as SessionRow | undefined;

  if (!row) throw new Error('Invalid or expired support code');

  const viewToken = randomToken(32);
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE support_sessions
     SET status = 'active', activated_at = ?, view_token_hash = ?
     WHERE id = ?`
  ).run(now, sha256(viewToken), row.id);

  writeAudit(row.id, 'admin', adminId, 'support_code_redeemed');
  return { sessionId: row.id, viewToken, orgName: row.org_name };
}

export function authenticateViewToken(sessionId: string, viewToken: string): boolean {
  expireStaleSessions();
  const db = getDb();
  const row = db
    .prepare('SELECT view_token_hash, status FROM support_sessions WHERE id = ?')
    .get(sessionId) as { view_token_hash: string | null; status: string } | undefined;
  if (!row || row.status !== 'active' || !row.view_token_hash) return false;
  return row.view_token_hash === sha256(viewToken);
}

export function getSessionForAdmin(sessionId: string): SupportSessionRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.*, o.name as org_name
       FROM support_sessions s
       JOIN organizations o ON o.id = s.org_id
       WHERE s.id = ?`
    )
    .get(sessionId) as SessionRow | undefined;
  if (!row) return null;
  return mapSession(row, '******');
}

export function getLatestSnapshot(sessionId: string): SupportSnapshotPayload | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT payload_json FROM support_snapshots
       WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(sessionId) as { payload_json: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.payload_json) as SupportSnapshotPayload;
}

function mapSession(row: SessionRow, code: string): SupportSessionRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    orgName: row.org_name,
    deviceId: row.device_id,
    status: row.status,
    code,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    revokedAt: row.revoked_at,
  };
}
