PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS giveaways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  platforms_json TEXT NOT NULL,
  worth TEXT,
  thumbnail_url TEXT,
  giveaway_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  published_at TEXT,
  ends_at TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_giveaways_first_seen
  ON giveaways(first_seen_at);

CREATE INDEX IF NOT EXISTS idx_giveaways_active
  ON giveaways(source, active);
