-- Cash N Carry Staging V17 D1 Migration 0009: Auctions, Bids, Gifting Ledger & Live Streams

CREATE TABLE cnc_auctions (
  id TEXT PRIMARY KEY,
  seller TEXT NOT NULL REFERENCES cnc_auth_users(id),
  product_id TEXT NOT NULL REFERENCES cnc_seller_products(id),
  title TEXT NOT NULL,
  starting_bid_kobo INTEGER NOT NULL CHECK(starting_bid_kobo > 0),
  current_bid_kobo INTEGER,
  winner_id TEXT REFERENCES cnc_auth_users(id),
  ends_at INTEGER NOT NULL,
  closed_at INTEGER,
  order_id TEXT REFERENCES cnc_orders(id),
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX cnc_auctions_status ON cnc_auctions(closed_at, ends_at);

CREATE TABLE cnc_bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES cnc_auctions(id),
  bidder_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  amount_kobo INTEGER NOT NULL CHECK(amount_kobo > 0),
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX cnc_bids_auction ON cnc_bids(auction_id, amount_kobo DESC);

CREATE TABLE cnc_coin_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX cnc_coin_ledger_user ON cnc_coin_ledger(user_id, created);

CREATE TABLE cnc_gifts (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  receiver_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  gift_type TEXT NOT NULL CHECK(gift_type IN ('rose','star','lion')),
  amount INTEGER NOT NULL CHECK(amount > 0),
  request_key TEXT NOT NULL UNIQUE,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX cnc_gifts_receiver ON cnc_gifts(receiver_id, created);

CREATE TABLE cnc_live_rooms (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK(status IN ('live','ended')),
  pinned_product TEXT REFERENCES cnc_seller_products(id),
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
