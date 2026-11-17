import {currentAccount, readBody, type AuthEnvironment, hasValidMutationOrigin } from './new-auth';


export interface AuctionEnvironment extends AuthEnvironment {
  PAYMENTS_ENABLED?: string;
}

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store' } });

export async function auctionsRoute(request: Request, env: AuctionEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/auctions') return null;

  const db = env.AUTH_DB;
  if (!db) return json({ error: 'Database unavailable' }, 503);

  const account = await currentAccount(request, env);

  if (request.method === 'GET') {
    const viewerId = account?.id ?? null;
    const now = Math.floor(Date.now() / 1000);
    const { results } = await db
      .prepare(
        `SELECT a.id, a.seller, a.product_id, a.title, a.starting_bid_kobo, a.current_bid_kobo,
                a.winner_id, a.ends_at, a.closed_at, a.order_id, a.created,
                s.name as store_name
         FROM cnc_auctions a
         LEFT JOIN cnc_seller_stores s ON s.owner = a.seller
         WHERE a.closed_at IS NULL OR a.winner_id = ?
         ORDER BY a.ends_at DESC LIMIT 50`
      )
      .bind(viewerId ?? '')
      .all();

    return json({
      paymentsEnabled: env.PAYMENTS_ENABLED === 'true',
      auctions: (results || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        startingBid: (a.starting_bid_kobo / 100).toFixed(2),
        currentBid: a.current_bid_kobo ? (a.current_bid_kobo / 100).toFixed(2) : null,
        endsAt: new Date(a.ends_at * 1000).toISOString(),
        closedAt: a.closed_at ? new Date(a.closed_at * 1000).toISOString() : null,
        storefrontName: a.store_name || 'Verified Seller',
        own: viewerId !== null && a.seller === viewerId,
        winning: viewerId !== null && a.winner_id === viewerId,
        orderId: viewerId !== null && a.winner_id === viewerId ? a.order_id : null,
      })),
    });
  }

  if (request.method === 'POST') {
    if (!hasValidMutationOrigin(request, env)) {
      return json({ error: 'Invalid request origin' }, 403);
    }
    if (!account) return json({ error: 'Sign-in required' }, 401);
    if (account.role !== 'seller') return json({ error: 'Seller role required' }, 403);

    let body: any;
    try { body = await readBody(request); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { productId, startingBidKobo, durationMinutes } = body || {};
    if (!productId || typeof startingBidKobo !== 'number' || startingBidKobo < 100 || typeof durationMinutes !== 'number' || durationMinutes < 1) {
      return json({ error: 'Valid productId, startingBidKobo and durationMinutes required' }, 400);
    }

    // Verify product ownership and stock >= 1
    const product = await db
      .prepare(`SELECT id, name, stock, publication, archived FROM cnc_seller_products WHERE id = ? AND owner = ?`)
      .bind(productId, account.id)
      .first<any>();

    if (!product || product.archived !== 0 || product.publication !== 'published' || product.stock < 1) {
      return json({ error: 'Published product with available stock required' }, 409);
    }

    const auctionId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const endsAt = now + durationMinutes * 60;

    await db.batch([
      db.prepare(`UPDATE cnc_seller_products SET stock = stock - 1, revision = revision + 1 WHERE id = ?`).bind(productId),
      db.prepare(
        `INSERT INTO cnc_auctions (id, seller, product_id, title, starting_bid_kobo, current_bid_kobo, ends_at, created)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`
      ).bind(auctionId, account.id, productId, product.name, startingBidKobo, endsAt, now),
    ]);

    return json({ success: true, auctionId }, 201);
  }

  if (request.method === 'PATCH') {
    if (!hasValidMutationOrigin(request, env)) {
      return json({ error: 'Invalid request origin' }, 403);
    }
    if (!account) return json({ error: 'Sign-in required' }, 401);

    let body: any;
    try { body = await readBody(request); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { action, id } = body || {};
    if (!id || !['bid', 'close', 'checkout'].includes(action)) {
      return json({ error: 'Valid action and id required' }, 400);
    }

    if (action === 'checkout' && env.PAYMENTS_ENABLED !== 'true') {
      return json({
        error: 'Payments temporarily unavailable — auction checkout settlement is disabled in staging',
        code: 'PAYMENTS_DISABLED',
        paymentsEnabled: false,
      }, 503);
    }

    const auction = await db
      .prepare(`SELECT * FROM cnc_auctions WHERE id = ?`)
      .bind(id)
      .first<any>();

    if (!auction) return json({ error: 'Auction not found' }, 404);
    const now = Math.floor(Date.now() / 1000);

    if (action === 'bid') {
      if (account.role !== 'buyer') return json({ error: 'Only buyers can place bids' }, 403);
      if (auction.seller === account.id) return json({ error: 'Cannot bid on your own auction' }, 403);
      if (auction.closed_at || now >= auction.ends_at) return json({ error: 'Auction is ended' }, 409);

      const amountKobo = Number(body.amountKobo);
      const minRequired = auction.current_bid_kobo ? auction.current_bid_kobo + 100 : auction.starting_bid_kobo;
      if (!Number.isFinite(amountKobo) || amountKobo < minRequired) {
        return json({ error: `Bid must be at least ${(minRequired / 100).toFixed(2)} NGN` }, 400);
      }

      const bidId = crypto.randomUUID();
      await db.batch([
        db.prepare(
          `INSERT INTO cnc_bids (id, auction_id, bidder_id, amount_kobo, created) VALUES (?, ?, ?, ?, ?)`
        ).bind(bidId, auction.id, account.id, amountKobo, now),
        db.prepare(
          `UPDATE cnc_auctions SET current_bid_kobo = ?, winner_id = ? WHERE id = ? AND (current_bid_kobo IS NULL OR current_bid_kobo < ?)`
        ).bind(amountKobo, account.id, auction.id, amountKobo),
      ]);

      return json({ success: true, bidId, currentBidKobo: amountKobo });
    }

    if (action === 'close') {
      if (auction.seller !== account.id && account.role !== 'admin') {
        return json({ error: 'Unauthorized to close auction' }, 403);
      }
      if (!auction.closed_at) {
        if (!auction.winner_id) {
          // No bids - restore stock
          await db.batch([
            db.prepare(`UPDATE cnc_auctions SET closed_at = ? WHERE id = ?`).bind(now, auction.id),
            db.prepare(`UPDATE cnc_seller_products SET stock = stock + 1, revision = revision + 1 WHERE id = ?`).bind(auction.product_id),
          ]);
        } else {
          await db.prepare(`UPDATE cnc_auctions SET closed_at = ? WHERE id = ?`).bind(now, auction.id).run();
        }
      }
      return json({ success: true, closed: true });
    }

    if (action === 'checkout') {
      if (env.PAYMENTS_ENABLED !== 'true') {
        return json({
          error: 'Payments temporarily unavailable — auction checkout settlement is disabled in staging',
          code: 'PAYMENTS_DISABLED',
          paymentsEnabled: false,
        }, 503);
      }
      if (account.role !== 'buyer' || auction.winner_id !== account.id) {
        return json({ error: 'Only the winning bidder can checkout' }, 403);
      }
      if (auction.order_id) return json({ success: true, orderId: auction.order_id });

      const addressId = typeof body.addressId === 'string' ? body.addressId : '';
      const addr = addressId
        ? await db
            .prepare(`SELECT id, recipient, line, city, state FROM cnc_buyer_addresses WHERE id = ? AND user_id = ?`)
            .bind(addressId, account.id)
            .first<{ id: string; recipient: string; line: string; city: string; state: string }>()
        : null;
      if (!addr) {
        return json({ error: 'Valid buyer delivery address required' }, 400);
      }
      const deliveryAddress = JSON.stringify({
        recipient: addr.recipient,
        line: addr.line,
        city: addr.city,
        state: addr.state,
      });
      const orderId = 'order-' + crypto.randomUUID();
      const requestId = 'req-auc-' + auction.id;

      await db.batch([
        db.prepare(
          `INSERT INTO cnc_orders (id, buyer, request_id, address_id, delivery_address, status, created)
           VALUES (?, ?, ?, ?, ?, 'awaiting_payment', ?)`
        ).bind(orderId, account.id, requestId, addr.id, deliveryAddress, now),
        db.prepare(
          `INSERT INTO cnc_order_items (order_id, product_id, seller, name, quantity, price_minor)
           VALUES (?, ?, ?, ?, 1, ?)`
        ).bind(orderId, auction.product_id, auction.seller, auction.title, auction.current_bid_kobo),
        db.prepare(`UPDATE cnc_auctions SET closed_at = COALESCE(closed_at, ?), order_id = ? WHERE id = ?`).bind(now, orderId, auction.id),
      ]);

      return json({ success: true, orderId });
    }

    return json({ error: 'Unsupported auction action' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
}
