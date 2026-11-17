CREATE TABLE cnc_kyc_submissions (
  id TEXT PRIMARY KEY, seller TEXT NOT NULL REFERENCES cnc_auth_users(id),
  object_key TEXT NOT NULL UNIQUE, created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE cnc_kyc_audit (
  id INTEGER PRIMARY KEY, seller TEXT NOT NULL REFERENCES cnc_auth_users(id),
  outcome TEXT NOT NULL CHECK(outcome IN ('scanner_unavailable','rejected','stored')),
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
