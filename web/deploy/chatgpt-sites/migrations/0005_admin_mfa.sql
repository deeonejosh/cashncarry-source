ALTER TABLE cnc_auth_sessions ADD COLUMN mfa INTEGER NOT NULL DEFAULT 0 CHECK(mfa IN (0,1));
CREATE TABLE cnc_admin_mfa_steps (
  user_id TEXT PRIMARY KEY REFERENCES cnc_auth_users(id),
  last_step INTEGER NOT NULL
);
CREATE TABLE cnc_product_reviews (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES cnc_seller_products(id),
  admin_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  revision INTEGER NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('approve','reject')),
  created INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(product_id,revision)
);
CREATE TRIGGER cnc_apply_product_review AFTER INSERT ON cnc_product_reviews BEGIN
  UPDATE cnc_seller_products SET publication=CASE NEW.decision WHEN 'approve' THEN 'published' ELSE 'draft' END, revision=revision+1
  WHERE id=NEW.product_id AND revision=NEW.revision AND publication='pending' AND archived=0;
END;
