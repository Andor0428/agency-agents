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
  seedAdmin(db);
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
  `);
}

function seedAdmin(database: Database.Database): void {
  const existing = database
    .prepare('SELECT id FROM admin_users WHERE email = ?')
    .get(config.adminEmail) as { id: string } | undefined;
  if (existing) return;

  database
    .prepare(
      `INSERT INTO admin_users (id, email, password_hash, role, created_at)
       VALUES (?, ?, ?, 'support_viewer', ?)`
    )
    .run(randomUUID(), config.adminEmail, hashSecret(config.adminPassword), new Date().toISOString());
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
