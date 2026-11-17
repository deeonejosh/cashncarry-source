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

  const purchasesEnabled = env.PAYMENTS_ENABLED === 'true' && env.COINS_PURCHASES_ENABLED === 'true';

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
    if (!requestId || !recipientId || !['credit', 'gift'].includes(action)) {
      return json({ error: 'Valid action (credit/gift), requestId and recipientId required' }, 400);
    }

    if (action === 'credit' && !purchasesEnabled) {
      return json({
        error: 'Payments and coin purchases are temporarily unavailable in staging',
        code: 'COINS_DISABLED',
        purchasesEnabled: false,
      }, 503);
    }

    if (action === 'gift' && recipientId === account.id) {
      return json({ error: 'Select another recipient' }, 400);
    }

    const recipient = await db
      .prepare(`SELECT id, role, suspended FROM cnc_auth_users WHERE id = ?`)
      .bind(recipientId)
      .first<{ id: string; role: string; suspended: number }>();

    if (!recipient || recipient.suspended !== 0) {
      return json({ error: 'Recipient account unavailable' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const key = `${action}:${account.id}:${requestId}`;

    if (action === 'credit') {
      const coins = Number(body.coins);
      if (!Number.isInteger(coins) || coins < 1 || coins > 10000) {
        return json({ error: 'Coins must be between 1 and 10000' }, 400);
      }

      const existing = await db
        .prepare(`SELECT id, user_id, delta FROM cnc_coin_ledger WHERE idempotency_key = ?`)
        .bind(key)
        .first<{ id: string; user_id: string; delta: number }>();

      if (existing) {
        return json({ success: true, duplicated: true });
      }

      const ledgerId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO cnc_coin_ledger (id, user_id, delta, reason, idempotency_key, created)
           VALUES (?, ?, ?, 'Verified coin credit', ?, ?)`
        )
        .bind(ledgerId, recipientId, coins, key, now)
        .run();

      return json({ success: true, balanceAdded: coins }, 201);
    }

    if (action === 'gift') {
      const giftType = body.gift as keyof typeof gifts;
      if (!gifts[giftType]) {
        return json({ error: 'Valid gift type required (rose, star, lion)' }, 400);
      }

      const cost = gifts[giftType];

      // Check current balance
      const balanceRow = await db
        .prepare(`SELECT COALESCE(SUM(delta), 0) as balance FROM cnc_coin_ledger WHERE user_id = ?`)
        .bind(account.id)
        .first<{ balance: number }>();

      const currentBalance = balanceRow?.balance ?? 0;
      if (currentBalance < cost) {
        return json({ error: `Insufficient coin balance. Required: ${cost}, available: ${currentBalance}` }, 409);
      }

      // Check gift idempotency
      const existingGift = await db
        .prepare(`SELECT id FROM cnc_gifts WHERE request_key = ?`)
        .bind(key)
        .first<{ id: string }>();

      if (existingGift) {
        return json({ success: true, giftId: existingGift.id, duplicated: true });
      }

      const giftId = crypto.randomUUID();
      const debitKey = `${key}:debit`;
      const creditKey = `${key}:credit`;

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

      return json({ success: true, giftId, giftType, cost });
    }

    return json({ error: 'Unsupported action' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
}
