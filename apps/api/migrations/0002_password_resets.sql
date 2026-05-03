-- Director-issued one-time password reset tokens. Used in lieu of an email
-- service: director generates a reset link and shares it manually.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,                  -- the share token (= path segment)
  user_id TEXT NOT NULL,                -- target user (the coach/director)
  organization_id TEXT NOT NULL,        -- scoping for the issuing director
  created_by TEXT NOT NULL,             -- director user id
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens(user_id, expires_at DESC);
