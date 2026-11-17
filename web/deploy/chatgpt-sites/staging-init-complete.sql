-- ==============================================================================
-- Cash N Carry: D1 Schema Bootstrap (no demo records)
-- Single-file idempotent schema + category definitions; no seller or product demo data
-- Usage:
--   npx wrangler d1 execute cashncarry-d1-staging --file=deploy/chatgpt-sites/staging-init-complete.sql --remote
-- ==============================================================================

-- 1. Base Auth Users & Sessions (Matches 0001_new_auth.sql)
CREATE TABLE IF NOT EXISTS cnc_auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  credential TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('buyer','seller','admin')),
  verified INTEGER NOT NULL DEFAULT 0,
  suspended INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cnc_auth_tokens (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
  expires INTEGER NOT NULL,
  UNIQUE(user_id,purpose)
);

CREATE TABLE IF NOT EXISTS cnc_auth_sessions (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  expires INTEGER NOT NULL,
  mfa INTEGER NOT NULL DEFAULT 0 CHECK(mfa IN (0,1))
);
CREATE INDEX IF NOT EXISTS cnc_auth_sessions_user ON cnc_auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS cnc_auth_rate (
  bucket TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cnc_auth_audit (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  event TEXT NOT NULL,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 2. Buyer Addresses
CREATE TABLE IF NOT EXISTS cnc_buyer_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  recipient TEXT NOT NULL,
  line TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cnc_buyer_addresses_owner ON cnc_buyer_addresses(user_id);

-- 3. Seller Stores & Products (Seller Admin Portal)
CREATE TABLE IF NOT EXISTS cnc_seller_stores (
  owner TEXT PRIMARY KEY REFERENCES cnc_auth_users(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cnc_seller_products (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES cnc_seller_stores(owner),
  name TEXT NOT NULL,
  price_minor INTEGER NOT NULL CHECK(price_minor BETWEEN 1 AND 1000000000),
  stock INTEGER NOT NULL CHECK(stock BETWEEN 0 AND 1000000),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 1,
  publication TEXT NOT NULL DEFAULT 'draft' CHECK(publication IN ('draft','pending','published'))
);
CREATE INDEX IF NOT EXISTS cnc_seller_products_owner ON cnc_seller_products(owner, archived);

CREATE TABLE IF NOT EXISTS cnc_buyer_cart (
  buyer TEXT NOT NULL REFERENCES cnc_auth_users(id),
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  source TEXT NOT NULL DEFAULT 'legacy' CHECK(source IN ('legacy','replacement')),
  PRIMARY KEY (buyer, product)
);

-- 4. Orders & Items
CREATE TABLE IF NOT EXISTS cnc_orders (
  id TEXT PRIMARY KEY,
  buyer TEXT NOT NULL REFERENCES cnc_auth_users(id),
  request_id TEXT NOT NULL,
  address_id TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK(status IN ('awaiting_payment','cancelled')),
  created INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(buyer, request_id)
);
CREATE INDEX IF NOT EXISTS cnc_orders_buyer ON cnc_orders(buyer,created);

CREATE TABLE IF NOT EXISTS cnc_order_items (
  order_id TEXT NOT NULL REFERENCES cnc_orders(id),
  product_id TEXT NOT NULL REFERENCES cnc_seller_products(id),
  seller TEXT NOT NULL REFERENCES cnc_auth_users(id),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  price_minor INTEGER NOT NULL,
  PRIMARY KEY(order_id,product_id)
);

-- 5. Admin MFA & Reviews
CREATE TABLE IF NOT EXISTS cnc_admin_mfa_steps (
  user_id TEXT PRIMARY KEY REFERENCES cnc_auth_users(id),
  last_step INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cnc_product_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES cnc_seller_products(id),
  admin_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  revision INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('approve','reject')),
  created INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(product_id,revision)
);

-- 6. KYC Submissions
CREATE TABLE IF NOT EXISTS cnc_kyc_submissions (
  id TEXT PRIMARY KEY,
  seller TEXT NOT NULL REFERENCES cnc_auth_users(id),
  object_key TEXT NOT NULL UNIQUE,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS cnc_kyc_audit (
  id INTEGER PRIMARY KEY,
  seller TEXT NOT NULL REFERENCES cnc_auth_users(id),
  outcome TEXT NOT NULL CHECK(outcome IN ('scanner_unavailable','rejected','stored')),
  created INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 7. Flutterwave Payments
CREATE TABLE IF NOT EXISTS cnc_flutterwave_payments (
  order_id TEXT PRIMARY KEY REFERENCES cnc_orders(id),
  reference TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  transaction_id TEXT UNIQUE,
  checkout_url TEXT,
  paid_at INTEGER
);

-- 8. Reservation Expiries
CREATE TABLE IF NOT EXISTS cnc_reservation_expiries (
  order_id TEXT PRIMARY KEY REFERENCES cnc_orders(id),
  expired_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS cnc_orders_pending_expiry ON cnc_orders(status,created);

-- Database Enforcement Triggers (Matches Migrations 0001, 0004, 0005, 0007, 0008)
CREATE TRIGGER IF NOT EXISTS cnc_auth_audit_change AFTER UPDATE OF credential, suspended, role ON cnc_auth_users
WHEN OLD.credential <> NEW.credential OR OLD.suspended <> NEW.suspended OR OLD.role <> NEW.role
BEGIN
  INSERT INTO cnc_auth_audit (user_id,event) VALUES (NEW.id,
    CASE WHEN OLD.verified=0 AND NEW.verified=1 THEN 'verified'
         WHEN OLD.suspended<>NEW.suspended THEN 'suspension_changed'
         WHEN OLD.role<>NEW.role THEN 'role_changed' ELSE 'credential_reset' END);
END;

CREATE TRIGGER IF NOT EXISTS cnc_reserve_order AFTER INSERT ON cnc_orders BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM cnc_buyer_cart WHERE buyer=NEW.buyer)
    THEN RAISE(ABORT,'CNC_CART_EMPTY') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM cnc_buyer_cart c LEFT JOIN cnc_seller_products p ON p.id=c.product
    LEFT JOIN cnc_auth_users s ON s.id=p.owner
    WHERE c.buyer=NEW.buyer AND (c.source<>'replacement' OR p.id IS NULL OR p.archived<>0 OR p.publication<>'published'
      OR p.stock<c.quantity OR s.role<>'seller' OR s.verified<>1 OR s.suspended<>0)
  ) THEN RAISE(ABORT,'CNC_STOCK_UNAVAILABLE') END;
  INSERT INTO cnc_order_items (order_id,product_id,seller,name,quantity,price_minor)
    SELECT NEW.id,p.id,p.owner,p.name,c.quantity,p.price_minor FROM cnc_buyer_cart c
    JOIN cnc_seller_products p ON p.id=c.product WHERE c.buyer=NEW.buyer;
  UPDATE cnc_seller_products SET stock=stock-(SELECT quantity FROM cnc_order_items WHERE order_id=NEW.id AND product_id=cnc_seller_products.id),
    revision=revision+1 WHERE id IN (SELECT product_id FROM cnc_order_items WHERE order_id=NEW.id);
  DELETE FROM cnc_buyer_cart WHERE buyer=NEW.buyer;
END;

CREATE TRIGGER IF NOT EXISTS cnc_release_order AFTER UPDATE OF status ON cnc_orders
WHEN OLD.status='awaiting_payment' AND NEW.status='cancelled' BEGIN
  UPDATE cnc_seller_products SET stock=stock+(SELECT quantity FROM cnc_order_items WHERE order_id=NEW.id AND product_id=cnc_seller_products.id),
    revision=revision+1 WHERE id IN (SELECT product_id FROM cnc_order_items WHERE order_id=NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS cnc_apply_product_review AFTER INSERT ON cnc_product_reviews BEGIN
  UPDATE cnc_seller_products SET publication=CASE NEW.decision WHEN 'approve' THEN 'published' ELSE 'draft' END, revision=revision+1
  WHERE id=NEW.product_id AND revision=NEW.revision AND publication='pending' AND archived=0;
END;

CREATE TRIGGER IF NOT EXISTS cnc_block_cancel_after_payment_start BEFORE UPDATE OF status ON cnc_orders
WHEN NEW.status='cancelled' AND EXISTS (SELECT 1 FROM cnc_flutterwave_payments WHERE order_id=NEW.id)
BEGIN
  SELECT RAISE(ABORT,'CNC_PAYMENT_IN_PROGRESS');
END;

CREATE TRIGGER IF NOT EXISTS cnc_expire_unpaid_reservation AFTER INSERT ON cnc_reservation_expiries
BEGIN
  UPDATE cnc_orders SET status='cancelled'
  WHERE id=NEW.order_id AND status='awaiting_payment'
    AND created<=NEW.expired_at-1800
    AND NOT EXISTS (SELECT 1 FROM cnc_flutterwave_payments WHERE order_id=NEW.order_id);
  SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'CNC_RESERVATION_NOT_ELIGIBLE') END;
END;

-- 9. Auctions, Bids & Gifting
CREATE TABLE IF NOT EXISTS cnc_auctions (
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
CREATE INDEX IF NOT EXISTS cnc_auctions_status ON cnc_auctions(closed_at, ends_at);

CREATE TABLE IF NOT EXISTS cnc_bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES cnc_auctions(id),
  bidder_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  amount_kobo INTEGER NOT NULL CHECK(amount_kobo > 0),
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS cnc_bids_auction ON cnc_bids(auction_id, amount_kobo DESC);

CREATE TABLE IF NOT EXISTS cnc_coin_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS cnc_coin_ledger_user ON cnc_coin_ledger(user_id, created);

CREATE TABLE IF NOT EXISTS cnc_gifts (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  receiver_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  gift_type TEXT NOT NULL CHECK(gift_type IN ('rose','star','lion')),
  amount INTEGER NOT NULL CHECK(amount > 0),
  request_key TEXT NOT NULL UNIQUE,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS cnc_gifts_receiver ON cnc_gifts(receiver_id, created);

CREATE TABLE IF NOT EXISTS cnc_live_rooms (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK(status IN ('live','ended')),
  pinned_product TEXT REFERENCES cnc_seller_products(id),
  created INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 10. Public Catalog (Queried by deploy/chatgpt-sites/catalog.ts)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  location TEXT,
  verified INTEGER NOT NULL DEFAULT 1 CHECK(verified IN (0,1)),
  suspended INTEGER NOT NULL DEFAULT 0 CHECK(suspended IN (0,1)),
  phone TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  image TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

-- Seed Categories
INSERT OR IGNORE INTO categories (id, name, active) VALUES
  ('fashion', 'Fashion', 1),
  ('beauty', 'Beauty', 1),
  ('phones', 'Phones', 1),
  ('electronics', 'Electronics', 1),
  ('home', 'Home & Living', 1),
  ('kids', 'Baby & Kids', 1),
  ('health', 'Health', 1),
  ('services', 'Services', 1);

-- Stores and products deliberately remain empty. Sellers publish verified listings via the app.
