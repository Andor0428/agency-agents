import { randomUUID } from 'node:crypto';
import { getDb } from '../db.js';
import { writeAudit } from './audit.js';

export type SupportNote = {
  id: string;
  supportSessionId: string;
  adminId: string;
  noteText: string;
  createdAt: string;
};

export function addSupportNote(
  supportSessionId: string,
  adminId: string,
  noteText: string
): SupportNote {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO support_notes (id, support_session_id, admin_id, note_text, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, supportSessionId, adminId, noteText.trim(), now);

  writeAudit(supportSessionId, 'admin', adminId, 'support_note_added');
  return { id, supportSessionId, adminId, noteText: noteText.trim(), createdAt: now };
}

export function listSupportNotes(supportSessionId: string): SupportNote[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, support_session_id, admin_id, note_text, created_at
       FROM support_notes WHERE support_session_id = ? ORDER BY created_at DESC`
    )
    .all(supportSessionId) as Array<{
    id: string;
    support_session_id: string;
    admin_id: string;
    note_text: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    supportSessionId: row.support_session_id,
    adminId: row.admin_id,
    noteText: row.note_text,
    createdAt: row.created_at,
  }));
}
