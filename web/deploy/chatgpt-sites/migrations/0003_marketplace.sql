CREATE TABLE cnc_seller_stores (
  owner TEXT PRIMARY KEY REFERENCES cnc_auth_users(id),
  name TEXT NOT NULL, description TEXT NOT NULL
);
CREATE TABLE cnc_seller_products (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES cnc_seller_stores(owner),
  name TEXT NOT NULL, price_minor INTEGER NOT NULL CHECK(price_minor BETWEEN 1 AND 1000000000),
  stock INTEGER NOT NULL CHECK(stock BETWEEN 0 AND 1000000),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX cnc_seller_products_owner ON cnc_seller_products(owner, archived);
CREATE TABLE cnc_buyer_cart (
  buyer TEXT NOT NULL REFERENCES cnc_auth_users(id), product TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  PRIMARY KEY (buyer, product)
);
