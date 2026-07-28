CREATE TABLE IF NOT EXISTS discord_subscribers (
  channel_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  activated_by TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discord_subscriber_platforms (
  channel_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  PRIMARY KEY (channel_id, platform),
  FOREIGN KEY (channel_id)
    REFERENCES discord_subscribers(channel_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discord_notifications (
  channel_id TEXT NOT NULL,
  giveaway_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent')),
  attempts INTEGER NOT NULL DEFAULT 1,
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  last_error TEXT,
  PRIMARY KEY (channel_id, giveaway_id),
  FOREIGN KEY (channel_id)
    REFERENCES discord_subscribers(channel_id) ON DELETE CASCADE,
  FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_discord_subscribers_active
  ON discord_subscribers(active);

CREATE INDEX IF NOT EXISTS idx_discord_notifications_status
  ON discord_notifications(status, claimed_at);
