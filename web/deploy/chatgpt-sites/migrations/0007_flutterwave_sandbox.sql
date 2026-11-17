CREATE TABLE cnc_flutterwave_payments (
  order_id TEXT PRIMARY KEY REFERENCES cnc_orders(id),
  reference TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  transaction_id TEXT UNIQUE,
  checkout_url TEXT,
  paid_at INTEGER
);
CREATE TRIGGER cnc_block_cancel_after_payment_start BEFORE UPDATE OF status ON cnc_orders
WHEN NEW.status='cancelled' AND EXISTS (SELECT 1 FROM cnc_flutterwave_payments WHERE order_id=NEW.id)
BEGIN
  SELECT RAISE(ABORT,'CNC_PAYMENT_IN_PROGRESS');
END;
