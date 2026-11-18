-- Cash N Carry private staging: authenticated support tickets and private agent notes.
-- No demo customers/tickets and no changes to existing orders, users, or payment data.
CREATE TABLE IF NOT EXISTS cnc_support_tickets (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 3 AND 160),
  category TEXT NOT NULL CHECK (category IN ('general','order','delivery','product','account','technical')),
  order_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_for_customer','escalated','resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high')),
  created INTEGER NOT NULL DEFAULT (unixepoch()),
  updated INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cnc_support_tickets_requester ON cnc_support_tickets(requester_id,updated DESC);
CREATE INDEX IF NOT EXISTS idx_cnc_support_tickets_queue ON cnc_support_tickets(status,updated DESC);

CREATE TABLE IF NOT EXISTS cnc_support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES cnc_support_tickets(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1600),
  internal INTEGER NOT NULL DEFAULT 0 CHECK (internal IN (0,1)),
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cnc_support_messages_ticket ON cnc_support_messages(ticket_id,created,id);

CREATE TABLE IF NOT EXISTS cnc_support_audit (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES cnc_support_tickets(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  action TEXT NOT NULL CHECK (action IN ('created','replied','internal_note','status_changed','escalated')),
  detail TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cnc_support_audit_ticket ON cnc_support_audit(ticket_id,created);
