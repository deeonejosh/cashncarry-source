CREATE TABLE cnc_auth_users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, credential TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('buyer','seller','admin')),
  verified INTEGER NOT NULL DEFAULT 0, suspended INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE cnc_auth_tokens (
  hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')), expires INTEGER NOT NULL,
  UNIQUE(user_id,purpose)
);
CREATE TABLE cnc_auth_sessions (
  hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES cnc_auth_users(id), expires INTEGER NOT NULL
);
CREATE INDEX cnc_auth_sessions_user ON cnc_auth_sessions(user_id);
CREATE TABLE cnc_auth_rate (
  bucket TEXT PRIMARY KEY, window INTEGER NOT NULL, attempts INTEGER NOT NULL
);
CREATE TABLE cnc_auth_audit (
  id INTEGER PRIMARY KEY, user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  event TEXT NOT NULL, created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TRIGGER cnc_auth_audit_change AFTER UPDATE OF credential, suspended, role ON cnc_auth_users
WHEN OLD.credential <> NEW.credential OR OLD.suspended <> NEW.suspended OR OLD.role <> NEW.role
BEGIN
  INSERT INTO cnc_auth_audit (user_id,event) VALUES (NEW.id,
    CASE WHEN OLD.verified=0 AND NEW.verified=1 THEN 'verified'
         WHEN OLD.suspended<>NEW.suspended THEN 'suspension_changed'
         WHEN OLD.role<>NEW.role THEN 'role_changed' ELSE 'credential_reset' END);
END;
