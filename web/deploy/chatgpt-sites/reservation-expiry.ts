import type { RecoveryDatabase } from './recovery';

export async function expireUnpaidReservations(db: RecoveryDatabase) {
  return db.prepare(`INSERT INTO cnc_reservation_expiries (order_id)
    SELECT o.id FROM cnc_orders o
    WHERE o.status='awaiting_payment' AND o.created<=unixepoch()-1800
      AND NOT EXISTS (SELECT 1 FROM cnc_flutterwave_payments p WHERE p.order_id=o.id)
    ORDER BY o.created,o.id LIMIT 25
    ON CONFLICT(order_id) DO NOTHING`).run();
}
