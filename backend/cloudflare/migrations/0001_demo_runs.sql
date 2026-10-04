CREATE TABLE IF NOT EXISTS demo_runs (
 session_id TEXT NOT NULL,
 run_id TEXT NOT NULL,
 lab TEXT NOT NULL,
 report TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(session_id,run_id)
);
CREATE INDEX IF NOT EXISTS demo_runs_session_lab ON demo_runs(session_id,lab,created_at);
CREATE INDEX IF NOT EXISTS demo_runs_expiry ON demo_runs(created_at);
