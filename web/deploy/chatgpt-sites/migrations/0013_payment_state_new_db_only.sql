-- Reconstructed from the ACTUAL private staging D1 SQL schema, 18 Nov 2026.
-- Applied in that database already as d1_migrations id=13 (2026-11-12).
-- NEVER run this ALTER against a DB where payment_state already exists.
-- Restores the missing source migration for clean isolated Miniflare environments.
ALTER TABLE cnc_orders ADD COLUMN payment_state TEXT NOT NULL DEFAULT 'unpaid'
  CHECK(payment_state IN ('unpaid','paid'));

CREATE TRIGGER IF NOT EXISTS cnc_payment_guard BEFORE UPDATE OF payment_state ON cnc_orders
WHEN OLD.payment_state='paid' AND NEW.payment_state<>'paid'
BEGIN
  SELECT RAISE(ABORT,'CNC_PAID_IMMUTABLE');
END;

CREATE TRIGGER IF NOT EXISTS cnc_payment_guard_proof BEFORE UPDATE OF payment_state ON cnc_orders
WHEN NEW.payment_state='paid' AND NOT EXISTS(
  SELECT 1 FROM cnc_flutterwave_payments p
  WHERE p.order_id=NEW.id AND p.paid_at IS NOT NULL AND p.transaction_id IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT,'CNC_PAYMENT_PROOF_REQUIRED');
END;

CREATE TRIGGER IF NOT EXISTS cnc_payment_atomic_order
AFTER UPDATE OF paid_at,transaction_id ON cnc_flutterwave_payments
WHEN NEW.paid_at IS NOT NULL AND NEW.transaction_id IS NOT NULL AND OLD.paid_at IS NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM cnc_orders WHERE id=NEW.order_id AND status='awaiting_payment'
  ) THEN RAISE(ABORT,'CNC_ORDER_NOT_AWAITING_PAYMENT') END;
  UPDATE cnc_orders SET payment_state='paid' WHERE id=NEW.order_id;
END;
