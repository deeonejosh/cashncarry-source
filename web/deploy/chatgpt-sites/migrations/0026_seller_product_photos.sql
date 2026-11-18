CREATE TABLE IF NOT EXISTS cnc_seller_product_photos (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  content_type TEXT NOT NULL,
  photo BLOB NOT NULL,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_cnc_seller_product_photos_owner ON cnc_seller_product_photos(owner);
CREATE INDEX IF NOT EXISTS idx_cnc_seller_products_image ON cnc_seller_products(image);
