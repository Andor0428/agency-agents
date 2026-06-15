import { randomUUID } from 'node:crypto';
import { getDb } from '../db.js';
import type { AuditActorType } from '../types.js';

export function writeAudit(
  sessionId: string | null,
  actorType: AuditActorType,
  actorId: string | null,
  action: string,
  details?: Record<string, unknown>
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_log (id, session_id, actor_type, actor_id, action, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    sessionId,
    actorType,
    actorId,
    action,
    details ? JSON.stringify(details) : null,
    new Date().toISOString()
  );
}

export function getAuditForSession(sessionId: string): Array<{
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, actor_type, actor_id, action, details_json, created_at
       FROM audit_log WHERE session_id = ? ORDER BY created_at DESC`
    )
    .all(sessionId) as Array<{
    id: string;
    actor_type: string;
    actor_id: string | null;
    action: string;
    details_json: string | null;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    action: row.action,
    details: row.details_json ? (JSON.parse(row.details_json) as Record<string, unknown>) : null,
    createdAt: row.created_at,
  }));
}
