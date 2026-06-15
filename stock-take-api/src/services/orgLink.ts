import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { generateSupportCode, sha256 } from '../crypto.js';
import { getDb } from '../db.js';
import { writeAudit } from './audit.js';

export function createOrgLinkCode(deviceId: string): { code: string; expiresAt: string } {
  const db = getDb();
  const device = db
    .prepare('SELECT id, org_id FROM devices WHERE id = ?')
    .get(deviceId) as { id: string; org_id: string } | undefined;
  if (!device) throw new Error('Device not found');

  db.prepare('DELETE FROM org_link_codes WHERE org_id = ?').run(device.org_id);

  const code = generateSupportCode() + generateSupportCode().slice(0, 2);
  const expiresAt = new Date(
    Date.now() + config.orgLinkCodeTtlHours * 60 * 60 * 1000
  ).toISOString();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO org_link_codes (id, org_id, code_hash, created_by_device_id, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), device.org_id, sha256(code), deviceId, expiresAt, now);

  writeAudit(null, 'device', deviceId, 'org_link_code_created', { orgId: device.org_id });
  return { code, expiresAt };
}

export function resolveOrgLinkCode(code: string): string | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT org_id FROM org_link_codes
       WHERE code_hash = ? AND expires_at >= ?`
    )
    .get(sha256(code), new Date().toISOString()) as { org_id: string } | undefined;
  return row?.org_id ?? null;
}

export function listOrgDevices(orgId: string): Array<{
  id: string;
  label: string | null;
  createdAt: string;
  lastSeenAt: string;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, label, created_at, last_seen_at FROM devices WHERE org_id = ? ORDER BY created_at ASC`
    )
    .all(orgId) as Array<{
    id: string;
    label: string | null;
    created_at: string;
    last_seen_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  }));
}
