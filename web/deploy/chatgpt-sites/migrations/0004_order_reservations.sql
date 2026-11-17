ALTER TABLE cnc_buyer_cart ADD COLUMN source TEXT NOT NULL DEFAULT 'legacy' CHECK(source IN ('legacy','replacement'));
ALTER TABLE cnc_seller_products ADD COLUMN publication TEXT NOT NULL DEFAULT 'draft'
  CHECK(publication IN ('draft','pending','published'));
CREATE TABLE cnc_orders (
  id TEXT PRIMARY KEY, buyer TEXT NOT NULL REFERENCES cnc_auth_users(id),
  request_id TEXT NOT NULL, address_id TEXT NOT NULL, delivery_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK(status IN ('awaiting_payment','cancelled')),
  created INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(buyer, request_id)
);
CREATE TABLE cnc_order_items (
  order_id TEXT NOT NULL REFERENCES cnc_orders(id), product_id TEXT NOT NULL REFERENCES cnc_seller_products(id),
  seller TEXT NOT NULL REFERENCES cnc_auth_users(id), name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99), price_minor INTEGER NOT NULL,
  PRIMARY KEY(order_id,product_id)
);
CREATE INDEX cnc_orders_buyer ON cnc_orders(buyer,created);
CREATE TRIGGER cnc_reserve_order AFTER INSERT ON cnc_orders BEGIN
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
CREATE TRIGGER cnc_release_order AFTER UPDATE OF status ON cnc_orders
WHEN OLD.status='awaiting_payment' AND NEW.status='cancelled' BEGIN
  UPDATE cnc_seller_products SET stock=stock+(SELECT quantity FROM cnc_order_items WHERE order_id=NEW.id AND product_id=cnc_seller_products.id),
    revision=revision+1 WHERE id IN (SELECT product_id FROM cnc_order_items WHERE order_id=NEW.id);
END;
