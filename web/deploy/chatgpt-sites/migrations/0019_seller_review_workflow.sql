-- Cash N Carry staging: manual seller review workflow, no automatic seller privilege grants.
CREATE TABLE IF NOT EXISTS cnc_seller_applications (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL UNIQUE REFERENCES cnc_auth_users(id),
 business_name TEXT NOT NULL CHECK(length(business_name) BETWEEN 2 AND 100),
 cac_number TEXT NOT NULL DEFAULT '',
 business_type TEXT NOT NULL DEFAULT '',
 state_location TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL CHECK(length(phone) BETWEEN 6 AND 30),
 description TEXT NOT NULL CHECK(length(description) BETWEEN 5 AND 500),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
 reviewer_id TEXT REFERENCES cnc_auth_users(id),
 reviewer_notes TEXT NOT NULL DEFAULT '',
 reviewed_at INTEGER,
 created INTEGER NOT NULL DEFAULT (unixepoch()),
 updated INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS cnc_seller_apps_status ON cnc_seller_applications(status,updated DESC);
CREATE TABLE IF NOT EXISTS cnc_seller_application_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 application_id TEXT NOT NULL REFERENCES cnc_seller_applications(id),
 actor_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
 action TEXT NOT NULL CHECK(action IN ('submitted','resubmitted','approved','rejected','suspended')),
 created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS cnc_seller_app_events_app ON cnc_seller_application_events(application_id,created DESC);
CREATE TRIGGER IF NOT EXISTS cnc_seller_application_initial_audit AFTER INSERT ON cnc_seller_applications
BEGIN
 INSERT INTO cnc_seller_application_events (application_id,actor_id,action)
 VALUES (NEW.id,NEW.user_id,'submitted');
END;
CREATE TRIGGER IF NOT EXISTS cnc_seller_application_changes AFTER UPDATE OF status ON cnc_seller_applications
WHEN NEW.status<>OLD.status
BEGIN
 SELECT CASE WHEN NEW.status='approved' AND NOT EXISTS (
 SELECT 1 FROM cnc_auth_users u WHERE u.id=NEW.user_id AND u.verified=1 AND u.role IN ('buyer','seller')
 ) THEN RAISE(ABORT,'CNC_APPROVAL_INELIGIBLE') END;
 UPDATE cnc_auth_users SET role='seller',suspended=0
 WHERE id=NEW.user_id AND NEW.status='approved';
 UPDATE cnc_auth_users SET suspended=1
 WHERE id=NEW.user_id AND NEW.status='suspended' AND role='seller';
 DELETE FROM cnc_auth_sessions WHERE user_id=NEW.user_id AND NEW.status IN ('approved','suspended');
 INSERT INTO cnc_seller_application_events (application_id,actor_id,action)
 VALUES (NEW.id,COALESCE(NEW.reviewer_id,NEW.user_id),
 CASE WHEN OLD.status='rejected' AND NEW.status='pending' THEN 'resubmitted' ELSE NEW.status END);
 INSERT INTO cnc_notifications (id,user_id,title,body,kind)
 VALUES (lower(hex(randomblob(16))),NEW.user_id,
 CASE NEW.status WHEN 'approved' THEN 'Seller account approved'
 WHEN 'rejected' THEN 'Seller application returned'
 WHEN 'suspended' THEN 'Seller account suspended'
 ELSE 'Seller application submitted' END,
 CASE NEW.status WHEN 'approved' THEN 'Your seller account is approved. Sign in again to access Seller Centre.'
 WHEN 'rejected' THEN 'Review your application details and resubmit if needed.'
 WHEN 'suspended' THEN 'Seller access is suspended. Contact support for details.'
 ELSE 'Your application is awaiting review.' END, 'system');
END;
