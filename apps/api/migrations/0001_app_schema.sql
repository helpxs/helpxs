-- App-domain tables. Better-auth's own tables (user, session, account,
-- organization, member, invitation) are created by hitting
-- POST /api/_internal/migrate-auth.

CREATE TABLE IF NOT EXISTS form_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL,
  schema TEXT NOT NULL, -- JSON
  published_at TEXT NOT NULL,
  published_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_versions_org
  ON form_versions(organization_id, id DESC);

CREATE TABLE IF NOT EXISTS sessions_log (
  id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  form_version INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  duration_seconds INTEGER,
  data TEXT NOT NULL, -- JSON of SessionDraft
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_log_org_time
  ON sessions_log(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_log_coach
  ON sessions_log(coach_id, occurred_at DESC);
