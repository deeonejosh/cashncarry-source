import {currentAccount, readBody, type AuthEnvironment, hasValidMutationOrigin } from './new-auth';


export interface CoinsEnvironment extends AuthEnvironment {
  PAYMENTS_ENABLED?: string;
  COINS_PURCHASES_ENABLED?: string;
}

const gifts = { rose: 10, star: 100, lion: 1000 } as const;

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store' } });

export async function coinsRoute(request: Request, env: CoinsEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/coins') return null;

  const db = env.AUTH_DB;
  if (!db) return json({ error: 'Database unavailable' }, 503);

  const account = await currentAccount(request, env);
  if (!account) return json({ error: 'Sign-in required' }, 401);

  // Credit purchases must stay unavailable until verified payment reconciliation exists.
  const purchasesEnabled = false;

  if (request.method === 'GET') {
    const balanceRow = await db
      .prepare(`SELECT COALESCE(SUM(delta), 0) as balance FROM cnc_coin_ledger WHERE user_id = ?`)
      .bind(account.id)
      .first<{ balance: number }>();

    const { results } = await db
      .prepare(`SELECT id, delta, reason, created FROM cnc_coin_ledger WHERE user_id = ? ORDER BY created DESC LIMIT 50`)
      .bind(account.id)
      .all();

    return json({
      balance: balanceRow?.balance ?? 0,
      purchasesEnabled,
      activity: (results || []).map((r: any) => ({
        id: r.id,
        delta: r.delta,
        reason: r.reason,
        createdAt: new Date(r.created * 1000).toISOString(),
      })),
    });
  }

  if (request.method === 'POST') {
    if (!hasValidMutationOrigin(request, env)) {
      return json({ error: 'Invalid request origin' }, 403);
    }
    let body: any;
    try { body = await readBody(request); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { action, requestId, recipientId } = body || {};
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{12,100}$/.test(requestId) ||
        typeof recipientId !== 'string' || recipientId.length < 1 || recipientId.length > 128 ||
        !['credit', 'gift'].includes(action)) {
      return json({ error: 'Valid action (credit/gift), requestId and recipientId required' }, 400);
    }

    // A self-reported purchase or promo cannot mint currency. No direct user-facing
    // credit route exists until a verified provider webhook / owner-only issuance ledger.
    if (action === 'credit') {
      return json({
        error: 'Direct coin credits are unavailable: verified payment or owner-approved promotion required',
        code: 'COIN_CREDIT_NOT_AUTHORIZED', purchasesEnabled: false,
      }, 503);
    }

    if (action === 'gift' && recipientId === account.id) {
      return json({ error: 'Select another recipient' }, 400);
    }

    const recipient = await db
      .prepare(`SELECT id, role, suspended FROM cnc_auth_users WHERE id = ?`)
      .bind(recipientId)
      .first<{ id: string; role: string; suspended: number }>();

    if (!recipient || recipient.suspended !== 0 || recipient.role !== 'seller') {
      return json({ error: 'Recipient account unavailable' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const key = `${action}:${account.id}:${requestId}`;

    if (action === 'gift') {
      const giftType = body.gift as keyof typeof gifts;
      if (!gifts[giftType]) {
        return json({ error: 'Valid gift type required (rose, star, lion)' }, 400);
      }

      const cost = gifts[giftType];

      // Idempotent replay must be evaluated before balance: a completed gift may
      // already have consumed the last coins.
      const existingGift = await db.prepare(`SELECT id, receiver_id, gift_type FROM cnc_gifts WHERE request_key = ?`)
        .bind(key).first<{ id: string; receiver_id: string; gift_type: string }>();
      if (existingGift) {
        if (existingGift.receiver_id !== recipientId || existingGift.gift_type !== giftType)
          return json({ error: 'Request ID already used for a different gift', code: 'GIFT_IDEMPOTENCY_CONFLICT' }, 409);
        return json({ success: true, giftId: existingGift.id, duplicated: true });
      }
      const coinGuard = await db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='cnc_coin_prevent_overdraft'").first();
      if (!coinGuard) return json({ error: 'Coin wallet protection unavailable', code: 'WALLET_GUARD_MISSING' }, 503);

      const giftId = crypto.randomUUID();
      const debitKey = `${key}:debit`;
      const creditKey = `${key}:credit`;

      // D1 batch is transactional. The verified overdraft trigger checks the debit
      // under the SQLite write lock, not against a stale preflight balance.
      try {
        await db.batch([
          db.prepare(
            `INSERT INTO cnc_gifts (id, sender_id, receiver_id, gift_type, amount, request_key, created)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(giftId, account.id, recipientId, giftType, cost, key, now),
          db.prepare(
            `INSERT INTO cnc_coin_ledger (id, user_id, delta, reason, idempotency_key, created)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(crypto.randomUUID(), account.id, -cost, `Sent ${giftType} gift`, debitKey, now),
          db.prepare(
            `INSERT INTO cnc_coin_ledger (id, user_id, delta, reason, idempotency_key, created)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(crypto.randomUUID(), recipientId, cost, `Received ${giftType} gift`, creditKey, now),
        ]);
      } catch (error) {
        if (error instanceof Error && /CNC_INSUFFICIENT_COINS/.test(error.message))
          return json({ error: 'Insufficient coin balance', code: 'INSUFFICIENT_COINS' }, 409);
        if (error instanceof Error && /UNIQUE constraint failed/.test(error.message)) {
          const existing = await db.prepare('SELECT id,receiver_id,gift_type FROM cnc_gifts WHERE request_key=?')
            .bind(key).first<{id:string;receiver_id:string;gift_type:string}>();
          if (existing && existing.receiver_id === recipientId && existing.gift_type === giftType)
            return json({ success: true, giftId: existing.id, duplicated: true });
          return json({ error: 'Duplicate gift request', code: 'GIFT_IDEMPOTENCY_CONFLICT' }, 409);
        }
        throw error;
      }
      return json({ success: true, giftId, giftType, cost });
    }

    return json({ error: 'Unsupported action' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
}
