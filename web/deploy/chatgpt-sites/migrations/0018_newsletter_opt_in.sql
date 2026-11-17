-- Staging-only newsletter double opt-in. No marketing is sent until status='confirmed'.
CREATE TABLE IF NOT EXISTS cnc_newsletter_subscribers (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  topics TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','unsubscribed')),
  confirmation_hash TEXT UNIQUE,
  unsubscribe_hash TEXT UNIQUE,
  source TEXT NOT NULL DEFAULT 'footer',
  consent_at INTEGER NOT NULL,
  last_requested_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  unsubscribed_at INTEGER
);
CREATE INDEX IF NOT EXISTS cnc_newsletter_subscribers_status ON cnc_newsletter_subscribers(status);
CREATE TABLE IF NOT EXISTS cnc_newsletter_rate (
  bucket TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);