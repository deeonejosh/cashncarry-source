-- P0 PRIVATE STAGING: split paid multi-seller orders into independent
-- seller fulfilment records. APPLY ONLY AFTER A RESTORABLE D1 BACKUP.
-- Does not delete/alter historical order or legacy fulfilment records.
CREATE TABLE IF NOT EXISTS cnc_seller_order_fulfilments (
  order_id TEXT NOT NULL REFERENCES cnc_orders(id),
  seller_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK(status IN ('processing','packed','shipped','delivered')),
  carrier TEXT NOT NULL DEFAULT 'GIG Logistics',
  tracking_number TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(order_id,seller_id)
);
CREATE INDEX IF NOT EXISTS cnc_seller_order_fulfilments_status
  ON cnc_seller_order_fulfilments(seller_id,status,updated_at DESC);

-- Preserve confirmed historical records, without replaying notifications.
INSERT OR IGNORE INTO cnc_seller_order_fulfilments
  (order_id,seller_id,status,carrier,tracking_number,updated_at)
SELECT f.order_id,f.seller_id,f.status,f.carrier,f.tracking_number,f.updated_at
FROM cnc_order_fulfilments f
JOIN cnc_orders o ON o.id=f.order_id AND o.payment_state='paid' AND o.status='awaiting_payment'
JOIN cnc_flutterwave_payments p ON p.order_id=o.id
  AND p.transaction_id IS NOT NULL AND p.paid_at IS NOT NULL
WHERE EXISTS (SELECT 1 FROM cnc_order_items i
  WHERE i.order_id=f.order_id AND i.seller=f.seller_id);

CREATE TRIGGER IF NOT EXISTS cnc_fulfilment_paid_owner_insert
BEFORE INSERT ON cnc_seller_order_fulfilments
BEGIN
 SELECT CASE WHEN NOT EXISTS (
   SELECT 1 FROM cnc_orders o
   JOIN cnc_order_items i ON i.order_id=o.id AND i.seller=NEW.seller_id
   JOIN cnc_flutterwave_payments p ON p.order_id=o.id
   WHERE o.id=NEW.order_id AND o.status='awaiting_payment'
     AND o.payment_state='paid' AND p.paid_at IS NOT NULL AND p.transaction_id IS NOT NULL
 ) THEN RAISE(ABORT,'CNC_SELLER_FULFILMENT_PAYMENT_REQUIRED') END;
 SELECT CASE WHEN NEW.status<>'processing'
   THEN RAISE(ABORT,'CNC_FULFILMENT_INITIAL_STATE') END;
END;

CREATE TRIGGER IF NOT EXISTS cnc_fulfilment_paid_owner_update
BEFORE UPDATE OF status,carrier,tracking_number ON cnc_seller_order_fulfilments
BEGIN
 SELECT CASE WHEN NOT EXISTS (
   SELECT 1 FROM cnc_orders o
   JOIN cnc_order_items i ON i.order_id=o.id AND i.seller=NEW.seller_id
   JOIN cnc_flutterwave_payments p ON p.order_id=o.id
   WHERE o.id=NEW.order_id AND o.status='awaiting_payment'
     AND o.payment_state='paid' AND p.paid_at IS NOT NULL AND p.transaction_id IS NOT NULL
 ) THEN RAISE(ABORT,'CNC_SELLER_FULFILMENT_PAYMENT_REQUIRED') END;
 SELECT CASE WHEN NOT (
   (OLD.status='processing' AND NEW.status='packed') OR
   (OLD.status='packed' AND NEW.status='shipped') OR
   (OLD.status='shipped' AND NEW.status='delivered')
 ) THEN RAISE(ABORT,'CNC_FULFILMENT_INVALID_TRANSITION') END;
END;

-- Notifications are atomic with the state transition; a retry cannot send twice.
CREATE TRIGGER IF NOT EXISTS cnc_fulfilment_buyer_notify_insert
AFTER INSERT ON cnc_seller_order_fulfilments
BEGIN
 INSERT INTO cnc_notifications(id,user_id,title,body,kind)
 SELECT lower(hex(randomblob(16))),o.buyer,'Order update',
   'Order '||substr(NEW.order_id,1,8)||' — seller '||
   substr(NEW.seller_id,1,12)||' marked processing','order'
 FROM cnc_orders o WHERE o.id=NEW.order_id;
END;

CREATE TRIGGER IF NOT EXISTS cnc_fulfilment_buyer_notify_update
AFTER UPDATE OF status ON cnc_seller_order_fulfilments
WHEN OLD.status<>NEW.status
BEGIN
 INSERT INTO cnc_notifications(id,user_id,title,body,kind)
 SELECT lower(hex(randomblob(16))),o.buyer,'Order update',
   'Order '||substr(NEW.order_id,1,8)||' — seller '||
   substr(NEW.seller_id,1,12)||' marked '||NEW.status||
   CASE WHEN length(NEW.tracking_number)>0
     THEN ' ('||NEW.carrier||': '||NEW.tracking_number||')'
     ELSE '' END,'order'
 FROM cnc_orders o WHERE o.id=NEW.order_id;
END;
