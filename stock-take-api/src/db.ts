import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { hashSecret } from './crypto.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(config.dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seedAdmins(db);
  return db;
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      business_type TEXT NOT NULL DEFAULT 'hospitality',
      retail_sub_type TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      secret_hash TEXT NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'support_viewer',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_sessions (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      device_id TEXT NOT NULL REFERENCES devices(id),
      code_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      activated_at TEXT,
      revoked_at TEXT,
      view_token_hash TEXT,
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS support_snapshots (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES support_sessions(id),
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES support_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      action TEXT NOT NULL,
      details_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_support_sessions_code_hash ON support_sessions(code_hash);
    CREATE INDEX IF NOT EXISTS idx_support_sessions_device ON support_sessions(device_id);
    CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_log(session_id);

    CREATE TABLE IF NOT EXISTS change_requests (
      id TEXT PRIMARY KEY,
      support_session_id TEXT NOT NULL REFERENCES support_sessions(id),
      count_session_id TEXT NOT NULL,
      count_session_name TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      current_qty REAL NOT NULL,
      proposed_qty REAL NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      proposed_by_admin TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      applied_at TEXT,
      FOREIGN KEY (support_session_id) REFERENCES support_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_change_requests_support ON change_requests(support_session_id);
    CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);

    CREATE TABLE IF NOT EXISTS org_link_codes (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      code_hash TEXT NOT NULL,
      created_by_device_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS support_notes (
      id TEXT PRIMARY KEY,
      support_session_id TEXT NOT NULL REFERENCES support_sessions(id),
      admin_id TEXT NOT NULL,
      note_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (support_session_id) REFERENCES support_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_org_link_codes_hash ON org_link_codes(code_hash);
    CREATE INDEX IF NOT EXISTS idx_support_notes_session ON support_notes(support_session_id);
  `);

  try {
    database.exec(`ALTER TABLE organizations ADD COLUMN alert_email TEXT`);
  } catch {
    // column exists
  }
}

function seedAdmins(database: Database.Database): void {
  const now = new Date().toISOString();
  const admins = [
    { email: config.adminEmail, password: config.adminPassword, role: 'support_viewer' },
    { email: config.supervisorEmail, password: config.supervisorPassword, role: 'support_supervisor' },
  ];

  for (const admin of admins) {
    const existing = database
      .prepare('SELECT id FROM admin_users WHERE email = ?')
      .get(admin.email) as { id: string } | undefined;
    if (existing) continue;

    database
      .prepare(
        `INSERT INTO admin_users (id, email, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(randomUUID(), admin.email, hashSecret(admin.password), admin.role, now);
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
