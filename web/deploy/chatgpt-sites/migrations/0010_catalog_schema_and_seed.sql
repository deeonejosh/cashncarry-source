-- Cash N Carry Staging D1 Migration 0010: Catalog schema and category definitions only
-- Creates categories, stores, and products tables queried by deploy/chatgpt-sites/catalog.ts

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

-- Seed Categories matching Image 2 & Official Reference
INSERT OR IGNORE INTO categories (id, name, active) VALUES
  ('fashion', 'Fashion', 1),
  ('beauty', 'Beauty', 1),
  ('phones', 'Phones', 1),
  ('electronics', 'Electronics', 1),
  ('home', 'Home & Living', 1),
  ('kids', 'Baby & Kids', 1),
  ('health', 'Health', 1),
  ('services', 'Services', 1);

-- Intentionally no store or product rows are seeded.
-- Sellers and product listings must come from genuine account activity.
