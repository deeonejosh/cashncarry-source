CREATE TABLE cnc_buyer_addresses (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  recipient TEXT NOT NULL, line TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL
);
CREATE INDEX cnc_buyer_addresses_owner ON cnc_buyer_addresses(user_id);
