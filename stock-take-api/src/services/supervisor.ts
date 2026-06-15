import { getDb } from '../db.js';

export function listAllSupportSessions(): Array<{
  id: string;
  orgId: string;
  orgName: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.id, s.org_id, o.name as org_name, s.status, s.created_at,
              s.expires_at, s.activated_at, s.revoked_at
       FROM support_sessions s
       JOIN organizations o ON o.id = s.org_id
       ORDER BY s.created_at DESC
       LIMIT 200`
    )
    .all() as Array<{
    id: string;
    org_id: string;
    org_name: string;
    status: string;
    created_at: string;
    expires_at: string;
    activated_at: string | null;
    revoked_at: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    orgId: row.org_id,
    orgName: row.org_name,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    activatedAt: row.activated_at,
    revokedAt: row.revoked_at,
  }));
}

export function exportAuditLog(): Array<{
  id: string;
  sessionId: string | null;
  actorType: string;
  actorId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, session_id, actor_type, actor_id, action, details_json, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT 1000`
    )
    .all() as Array<{
    id: string;
    session_id: string | null;
    actor_type: string;
    actor_id: string | null;
    action: string;
    details_json: string | null;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    action: row.action,
    details: row.details_json ? (JSON.parse(row.details_json) as Record<string, unknown>) : null,
    createdAt: row.created_at,
  }));
}

export function auditLogToCsv(entries: ReturnType<typeof exportAuditLog>): string {
  const header = 'id,session_id,actor_type,actor_id,action,created_at,details';
  const lines = entries.map((entry) => {
    const details = entry.details ? JSON.stringify(entry.details).replace(/"/g, '""') : '';
    return [
      entry.id,
      entry.sessionId ?? '',
      entry.actorType,
      entry.actorId ?? '',
      entry.action,
      entry.createdAt,
      `"${details}"`,
    ].join(',');
  });
  return [header, ...lines].join('\n');
}
