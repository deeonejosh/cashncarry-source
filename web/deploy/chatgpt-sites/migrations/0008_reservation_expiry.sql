CREATE TABLE cnc_reservation_expiries (
  order_id TEXT PRIMARY KEY REFERENCES cnc_orders(id),
  expired_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX cnc_orders_pending_expiry ON cnc_orders(status,created);
CREATE TRIGGER cnc_expire_unpaid_reservation AFTER INSERT ON cnc_reservation_expiries
BEGIN
  UPDATE cnc_orders SET status='cancelled'
  WHERE id=NEW.order_id AND status='awaiting_payment'
    AND created<=NEW.expired_at-1800
    AND NOT EXISTS (SELECT 1 FROM cnc_flutterwave_payments WHERE order_id=NEW.order_id);
  SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'CNC_RESERVATION_NOT_ELIGIBLE') END;
END;
