-- Isolated test database only. Production eligibility and delivery are unverified.
CREATE TABLE recovery_limits (
  bucket TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
CREATE TABLE recovery_tokens (
  hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  email_hash TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE recovery_sessions (
  hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE recovery_audit (
  id INTEGER PRIMARY KEY,
  account_id TEXT NOT NULL,
  event TEXT NOT NULL,
  created INTEGER NOT NULL
);
