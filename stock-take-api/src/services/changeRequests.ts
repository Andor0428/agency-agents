import { randomUUID } from 'node:crypto';
import { getDb } from '../db.js';
import type { ChangeRequestRecord, ChangeRequestStatus } from '../types.js';
import { notifySupportSessionEvent } from './alerts.js';
import { writeAudit } from './audit.js';

type ChangeRequestRow = {
  id: string;
  support_session_id: string;
  count_session_id: string;
  count_session_name: string;
  item_id: string;
  item_name: string;
  current_qty: number;
  proposed_qty: number;
  reason: string | null;
  status: ChangeRequestStatus;
  proposed_by_admin: string;
  created_at: string;
  resolved_at: string | null;
  applied_at: string | null;
};

function mapRow(row: ChangeRequestRow): ChangeRequestRecord {
  return {
    id: row.id,
    supportSessionId: row.support_session_id,
    countSessionId: row.count_session_id,
    countSessionName: row.count_session_name,
    itemId: row.item_id,
    itemName: row.item_name,
    currentQty: row.current_qty,
    proposedQty: row.proposed_qty,
    reason: row.reason,
    status: row.status,
    proposedByAdmin: row.proposed_by_admin,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    appliedAt: row.applied_at,
  };
}

function assertActiveSupportSession(supportSessionId: string): {
  id: string;
  device_id: string;
  status: string;
} {
  const db = getDb();
  const session = db
    .prepare('SELECT id, device_id, status FROM support_sessions WHERE id = ?')
    .get(supportSessionId) as { id: string; device_id: string; status: string } | undefined;
  if (!session || session.status !== 'active') {
    throw new Error('Support session is not active');
  }
  return session;
}

export type ProposeChangeInput = {
  countSessionId: string;
  countSessionName: string;
  itemId: string;
  itemName: string;
  currentQty: number;
  proposedQty: number;
  reason?: string;
};

export function proposeChangeRequest(
  supportSessionId: string,
  adminId: string,
  input: ProposeChangeInput
): ChangeRequestRecord {
  assertActiveSupportSession(supportSessionId);
  if (!Number.isFinite(input.proposedQty) || !Number.isFinite(input.currentQty)) {
    throw new Error('Quantities must be numbers');
  }
  if (input.proposedQty === input.currentQty) {
    throw new Error('Proposed quantity must differ from current quantity');
  }

  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO change_requests (
      id, support_session_id, count_session_id, count_session_name,
      item_id, item_name, current_qty, proposed_qty, reason,
      status, proposed_by_admin, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    id,
    supportSessionId,
    input.countSessionId,
    input.countSessionName,
    input.itemId,
    input.itemName,
    input.currentQty,
    input.proposedQty,
    input.reason ?? null,
    adminId,
    now
  );

  writeAudit(supportSessionId, 'admin', adminId, 'change_proposed', {
    changeRequestId: id,
    itemName: input.itemName,
    currentQty: input.currentQty,
    proposedQty: input.proposedQty,
  });
  notifySupportSessionEvent(supportSessionId, 'change_proposed', {
    itemName: input.itemName,
    currentQty: input.currentQty,
    proposedQty: input.proposedQty,
  });

  const row = db
    .prepare('SELECT * FROM change_requests WHERE id = ?')
    .get(id) as ChangeRequestRow;
  return mapRow(row);
}

export function listChangeRequests(supportSessionId: string): ChangeRequestRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM change_requests
       WHERE support_session_id = ?
       ORDER BY created_at DESC`
    )
    .all(supportSessionId) as ChangeRequestRow[];
  return rows.map(mapRow);
}

export function listPendingForDevice(deviceId: string): ChangeRequestRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT cr.* FROM change_requests cr
       JOIN support_sessions ss ON ss.id = cr.support_session_id
       WHERE ss.device_id = ? AND ss.status = 'active' AND cr.status = 'pending'
       ORDER BY cr.created_at ASC`
    )
    .all(deviceId) as ChangeRequestRow[];
  return rows.map(mapRow);
}

export function resolveChangeRequest(
  changeRequestId: string,
  deviceId: string,
  decision: 'approve' | 'deny'
): ChangeRequestRecord {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT cr.*, ss.device_id
       FROM change_requests cr
       JOIN support_sessions ss ON ss.id = cr.support_session_id
       WHERE cr.id = ?`
    )
    .get(changeRequestId) as (ChangeRequestRow & { device_id: string }) | undefined;

  if (!row || row.device_id !== deviceId) {
    throw new Error('Change request not found');
  }
  if (row.status !== 'pending') {
    throw new Error('Change request is no longer pending');
  }

  const now = new Date().toISOString();
  const status: ChangeRequestStatus = decision === 'approve' ? 'approved' : 'denied';
  db.prepare(
    `UPDATE change_requests SET status = ?, resolved_at = ? WHERE id = ?`
  ).run(status, now, changeRequestId);

  writeAudit(row.support_session_id, 'device', deviceId, `change_${decision}d`, {
    changeRequestId,
    itemName: row.item_name,
    proposedQty: row.proposed_qty,
  });
  notifySupportSessionEvent(
    row.support_session_id,
    decision === 'approve' ? 'change_approved' : 'change_denied',
    { itemName: row.item_name, proposedQty: row.proposed_qty }
  );

  const updated = db
    .prepare('SELECT * FROM change_requests WHERE id = ?')
    .get(changeRequestId) as ChangeRequestRow;
  return mapRow(updated);
}

export function markChangeRequestApplied(
  changeRequestId: string,
  deviceId: string
): ChangeRequestRecord {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT cr.*, ss.device_id
       FROM change_requests cr
       JOIN support_sessions ss ON ss.id = cr.support_session_id
       WHERE cr.id = ?`
    )
    .get(changeRequestId) as (ChangeRequestRow & { device_id: string }) | undefined;

  if (!row || row.device_id !== deviceId) {
    throw new Error('Change request not found');
  }
  if (row.status !== 'approved') {
    throw new Error('Change request must be approved before applying');
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE change_requests SET status = 'applied', applied_at = ? WHERE id = ?`
  ).run(now, changeRequestId);

  writeAudit(row.support_session_id, 'device', deviceId, 'change_applied', {
    changeRequestId,
    itemName: row.item_name,
    proposedQty: row.proposed_qty,
  });

  const updated = db
    .prepare('SELECT * FROM change_requests WHERE id = ?')
    .get(changeRequestId) as ChangeRequestRow;
  return mapRow(updated);
}
