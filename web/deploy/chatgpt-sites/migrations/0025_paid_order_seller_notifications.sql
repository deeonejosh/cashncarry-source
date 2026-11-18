-- PRIVATE STAGING ONLY. Apply only after a restorable backup and schema review.
-- A seller notification is created once when the existing payment proof
-- trigger changes an order from unpaid to paid, once per participating seller.
-- No notification is sent merely because an unpaid order is reserved.
CREATE TRIGGER IF NOT EXISTS cnc_paid_order_notify_sellers
AFTER UPDATE OF payment_state ON cnc_orders
WHEN OLD.payment_state<>'paid' AND NEW.payment_state='paid'
BEGIN
 INSERT INTO cnc_notifications(id,user_id,title,body,kind)
 SELECT lower(hex(randomblob(16))),i.seller,'New paid order',
   'Order '||substr(NEW.id,1,8)||' has confirmed payment. Review your items in Seller Centre.','order'
 FROM cnc_order_items i
 WHERE i.order_id=NEW.id
 GROUP BY i.seller;
END;
