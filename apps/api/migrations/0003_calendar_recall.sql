-- New-PRD migration: calendar integration + pseudonymous token architecture.
--
-- Student identity is split from session data. Session records carry only a
-- stable pseudonymous `student_token`. The token -> identity mapping lives in
-- `student_crosswalk`, which is reachable ONLY through the dedicated accessor
-- in src/crosswalk.ts (used by pre-session recall + post-session prefill).
-- No reporting query, CSV export, or director view ever joins this table.

-- token -> identity crosswalk (access-controlled; never in reporting pipelines)
CREATE TABLE IF NOT EXISTS student_crosswalk (
  token            TEXT NOT NULL,
  organization_id  TEXT NOT NULL,
  name             TEXT NOT NULL,
  university_id    TEXT,                 -- optional; from booking if present
  created_at       TEXT NOT NULL,
  PRIMARY KEY (organization_id, token)
);

-- Per-coach calendar OAuth connection (Calendly). access/refresh tokens are
-- stored so the worker can sync scheduled events. provider = 'calendly' | 'mock'.
CREATE TABLE IF NOT EXISTS calendar_connections (
  coach_id         TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL,
  provider         TEXT NOT NULL,        -- 'calendly' | 'mock'
  access_token     TEXT,
  refresh_token    TEXT,
  expires_at       TEXT,
  account_uri      TEXT,                 -- Calendly user URI
  connected_at     TEXT NOT NULL
);

-- Cache of synced calendar events. Each event already carries the resolved
-- pseudonymous student token (identity itself stays in student_crosswalk).
CREATE TABLE IF NOT EXISTS calendar_events (
  id               TEXT PRIMARY KEY,     -- provider event id (or synthetic)
  coach_id         TEXT NOT NULL,
  organization_id  TEXT NOT NULL,
  student_token    TEXT NOT NULL,
  starts_at        TEXT NOT NULL,
  ends_at          TEXT,
  event_type       TEXT,                 -- Calendly event-type name
  status           TEXT,                 -- 'active' | 'canceled'
  synced_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_coach_time
  ON calendar_events(coach_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_token
  ON calendar_events(organization_id, student_token);

-- Session records now link to a student via the pseudonymous token. The column
-- is nullable so historical (anonymous) rows remain valid.
ALTER TABLE sessions_log ADD COLUMN student_token TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_log_token
  ON sessions_log(organization_id, student_token, occurred_at DESC);
