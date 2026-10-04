CREATE TABLE IF NOT EXISTS site_metrics (
 day TEXT NOT NULL, path TEXT NOT NULL, event TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,path,event)
);
CREATE TABLE IF NOT EXISTS contact_receipts (
 id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, status TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS contact_receipts_created ON contact_receipts(created_at);
