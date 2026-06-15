export const SCHEMA_VERSION = 3;

export const CREATE_TABLES_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  storage_location TEXT NOT NULL DEFAULT 'bar',
  base_unit TEXT NOT NULL DEFAULT 'ml',
  display_unit TEXT NOT NULL DEFAULT 'ml',
  container_size REAL,
  is_batch INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  par_level REAL,
  fill_granularity REAL NOT NULL DEFAULT 0.1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_container_sizes (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  size REAL NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  UNIQUE(item_id, label)
);

CREATE TABLE IF NOT EXISTS aliases (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  alias_text TEXT NOT NULL,
  UNIQUE(item_id, alias_text)
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  yield_pct REAL NOT NULL DEFAULT 100,
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, version)
);

CREATE TABLE IF NOT EXISTS recipe_components (
  id TEXT PRIMARY KEY NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  component_item_id TEXT NOT NULL REFERENCES items(id),
  qty REAL NOT NULL,
  unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS count_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'bar',
  status TEXT NOT NULL DEFAULT 'open',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS count_events (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES count_sessions(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id),
  qty REAL NOT NULL,
  fill_level REAL,
  raw_transcript TEXT NOT NULL DEFAULT '',
  recipe_version INTEGER,
  confidence_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entity TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_batch ON items(is_batch);
CREATE INDEX IF NOT EXISTS idx_aliases_text ON aliases(alias_text);
CREATE INDEX IF NOT EXISTS idx_count_events_session ON count_events(session_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_container_sizes_item ON item_container_sizes(item_id);
`;

export const MIGRATION_V2_SQL = `
CREATE TABLE IF NOT EXISTS item_container_sizes (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  size REAL NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  UNIQUE(item_id, label)
);
CREATE INDEX IF NOT EXISTS idx_items_batch ON items(is_batch);
CREATE INDEX IF NOT EXISTS idx_container_sizes_item ON item_container_sizes(item_id);
`;

export const MIGRATION_V3_SQL = `
ALTER TABLE items ADD COLUMN sku TEXT;
ALTER TABLE items ADD COLUMN brand TEXT;
ALTER TABLE items ADD COLUMN color TEXT;
ALTER TABLE items ADD COLUMN size TEXT;
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
`;
