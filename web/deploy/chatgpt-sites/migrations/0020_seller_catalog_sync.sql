-- Staging-only additive schema for the actual Seller Centre form/API contract.
-- On a previously modified staging DB, apply only missing ALTER columns after PRAGMA table_info.
ALTER TABLE cnc_seller_stores ADD COLUMN category TEXT NOT NULL DEFAULT 'fashion';
ALTER TABLE cnc_seller_stores ADD COLUMN location TEXT NOT NULL DEFAULT 'Lagos';
ALTER TABLE cnc_seller_stores ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE cnc_seller_products ADD COLUMN category TEXT NOT NULL DEFAULT 'uncategorized';
ALTER TABLE cnc_seller_products ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE cnc_seller_products ADD COLUMN image TEXT NOT NULL DEFAULT '';
ALTER TABLE cnc_seller_products ADD COLUMN brand TEXT NOT NULL DEFAULT '';
ALTER TABLE cnc_seller_products ADD COLUMN compare_at_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cnc_seller_products ADD COLUMN featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1));
ALTER TABLE cnc_seller_products ADD COLUMN created INTEGER NOT NULL DEFAULT 0;

-- Only manually approved, non-suspended sellers may appear in the buyer-facing catalog.
CREATE TRIGGER IF NOT EXISTS cnc_public_seller_store_created AFTER INSERT ON cnc_seller_stores
WHEN EXISTS(SELECT 1 FROM cnc_seller_applications a JOIN cnc_auth_users u ON u.id=a.user_id
 WHERE a.user_id=NEW.owner AND a.status='approved' AND u.verified=1 AND u.suspended=0 AND u.role='seller')
BEGIN
 INSERT INTO stores(id,name,description,category,location,verified,suspended,phone)
 VALUES(NEW.owner,NEW.name,NEW.description,NEW.category,NEW.location,1,0,NEW.phone)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,
 category=excluded.category,location=excluded.location,verified=1,suspended=0,phone=excluded.phone;
END;
CREATE TRIGGER IF NOT EXISTS cnc_public_seller_store_updated AFTER UPDATE ON cnc_seller_stores
WHEN EXISTS(SELECT 1 FROM cnc_seller_applications a JOIN cnc_auth_users u ON u.id=a.user_id
 WHERE a.user_id=NEW.owner AND a.status='approved' AND u.verified=1 AND u.suspended=0 AND u.role='seller')
BEGIN
 INSERT INTO stores(id,name,description,category,location,verified,suspended,phone)
 VALUES(NEW.owner,NEW.name,NEW.description,NEW.category,NEW.location,1,0,NEW.phone)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,
 category=excluded.category,location=excluded.location,verified=1,suspended=0,phone=excluded.phone;
END;
CREATE TRIGGER IF NOT EXISTS cnc_public_seller_product_updated AFTER UPDATE ON cnc_seller_products
BEGIN
 INSERT INTO products(id,store,name,description,category,price,stock,image,featured,active)
 SELECT NEW.id,NEW.owner,NEW.name,NEW.description,NEW.category,
 MAX(1,CAST(NEW.price_minor/100 AS INTEGER)),NEW.stock,NEW.image,NEW.featured,1
 WHERE NEW.publication='published' AND NEW.archived=0
   AND EXISTS(SELECT 1 FROM cnc_seller_applications a JOIN cnc_auth_users u ON u.id=a.user_id
     WHERE a.user_id=NEW.owner AND a.status='approved' AND u.role='seller'
       AND u.verified=1 AND u.suspended=0)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,
 category=excluded.category,price=excluded.price,stock=excluded.stock,image=excluded.image,
 featured=excluded.featured,active=1;
 UPDATE products SET active=0 WHERE id=NEW.id AND (NEW.publication<>'published' OR NEW.archived<>0);
END;
CREATE TRIGGER IF NOT EXISTS cnc_public_seller_auth_status AFTER UPDATE OF role,suspended ON cnc_auth_users
BEGIN
 UPDATE stores SET suspended=CASE WHEN NEW.role='seller' AND NEW.suspended=0 THEN 0 ELSE 1 END
 WHERE id=NEW.id;
 UPDATE products SET active=0 WHERE store=NEW.id AND (NEW.role<>'seller' OR NEW.suspended<>0);
 UPDATE products SET active=1 WHERE store=NEW.id AND NEW.role='seller' AND NEW.suspended=0
 AND EXISTS(SELECT 1 FROM cnc_seller_applications a WHERE a.user_id=NEW.id AND a.status='approved')
 AND id IN(SELECT p.id FROM cnc_seller_products p WHERE p.owner=NEW.id AND p.archived=0 AND p.publication='published');
END;
