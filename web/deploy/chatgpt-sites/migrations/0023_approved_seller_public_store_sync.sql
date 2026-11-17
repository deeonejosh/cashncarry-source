-- Private staging candidate; never apply remotely without D1 backup and
-- schema/release review. Repair public storefront inventory after seller approval.
-- A seller may have created a private store before the administrator approved
-- their account. Publication and auction stock updates must not rely on a
-- buyer-facing stores row that was never materialized.
CREATE TRIGGER IF NOT EXISTS cnc_store_after_application_approval
AFTER UPDATE OF status ON cnc_seller_applications
WHEN NEW.status='approved' AND OLD.status<>NEW.status
BEGIN
  INSERT INTO stores(id,name,description,category,location,verified,suspended,phone)
    SELECT s.owner,s.name,s.description,s.category,s.location,1,0,s.phone
    FROM cnc_seller_stores s
    JOIN cnc_auth_users u ON u.id=s.owner
    WHERE s.owner=NEW.user_id AND u.verified=1 AND u.suspended=0
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,
      description=excluded.description,category=excluded.category,
      location=excluded.location,phone=excluded.phone,verified=1,suspended=0;

  INSERT INTO products(id,store,name,description,category,price,stock,image,featured,active)
    SELECT p.id,p.owner,p.name,p.description,p.category,
      MAX(1,CAST(p.price_minor/100 AS INTEGER)),
      p.stock,p.image,p.featured,1
    FROM cnc_seller_products p
    JOIN stores s ON s.id=p.owner AND s.suspended=0
    WHERE p.owner=NEW.user_id AND p.publication='published' AND p.archived=0
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,
      description=excluded.description,category=excluded.category,
      price=excluded.price,stock=excluded.stock,image=excluded.image,
      featured=excluded.featured,active=1;
END;

CREATE TRIGGER IF NOT EXISTS cnc_store_after_application_suspended
AFTER UPDATE OF status ON cnc_seller_applications
WHEN NEW.status<>'approved' AND OLD.status<>NEW.status
BEGIN
  UPDATE stores SET suspended=1 WHERE id=NEW.user_id;
  UPDATE products SET active=0 WHERE store=NEW.user_id;
END;
