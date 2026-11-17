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
                s.name AS store_name, p.image AS image_url,
                (SELECT COUNT(*) FROM cnc_bids b WHERE b.auction_id=a.id) AS bids_count
         FROM cnc_auctions a
         LEFT JOIN cnc_seller_stores s ON s.owner=a.seller
         LEFT JOIN cnc_seller_products p ON p.id=a.product_id
         WHERE a.closed_at IS NULL OR a.winner_id = ?
         ORDER BY a.ends_at DESC LIMIT 50`
      )
      .bind(viewerId ?? '')
      .all();

    return json({
      paymentsEnabled: env.PAYMENTS_ENABLED === 'true',
      auctions: (results || []).map((a: any) => ({
        id: a.id,
        sellerId: a.seller,
        productId: a.product_id,
        image: a.image_url || '',
        bidsCount: a.bids_count || 0,
        title: a.title,
        startingBid: (a.starting_bid_kobo / 100).toFixed(2),
        currentBid: a.current_bid_kobo ? (a.current_bid_kobo / 100).toFixed(2) : null,
        endsAt: new Date(a.ends_at * 1000).toISOString(),
        closedAt: a.closed_at ? new Date(a.closed_at * 1000).toISOString() : null,
        storefrontName: a.store_name || 'Verified Seller',
        own: viewerId !== null && a.seller === viewerId,
        // Do not expose another buyer's account identifier or imply the auction has settled.
        winnerId: viewerId !== null && a.winner_id === viewerId ? viewerId : null,
        ended: Boolean(a.closed_at) || now >= a.ends_at,
        winning: viewerId !== null && a.winner_id === viewerId && (Boolean(a.closed_at) || now >= a.ends_at),
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
    // A role label alone is insufficient: Seller Centre explicitly requires an
    // owner-approved application, verified identity and a non-suspended account.
    const approval = await db.prepare(
      `SELECT a.user_id FROM cnc_seller_applications a
       JOIN cnc_auth_users u ON u.id=a.user_id
       WHERE a.user_id=? AND a.status='approved'
         AND u.role='seller' AND u.verified=1 AND u.suspended=0`
    ).bind(account.id).first();
    if (!approval) {
      return json({ error: 'Administrator-approved seller account required', code: 'SELLER_APPROVAL_REQUIRED' }, 403);
    }

    let body: any;
    try { body = await readBody(request); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { productId, startingBidKobo } = body || {};
    // The existing UI submits durationHours; older mobile clients use durationMinutes.
    const durationMinutes = body?.durationMinutes ?? (Number(body?.durationHours) * 60);
    if (typeof productId !== 'string' || productId.length > 128 ||
        !Number.isSafeInteger(startingBidKobo) || startingBidKobo < 100 || startingBidKobo > 100000000000 ||
        !Number.isSafeInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080) {
      return json({ error: 'Valid product, amount and auction duration (1 minute to 7 days) required' }, 400);
    }
    // Fail closed on a database lacking the atomic reservation trigger.
    const guard = await db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='cnc_auction_reserve_product'").first();
    if (!guard) return json({ error: 'Auction stock protection unavailable', code: 'AUCTION_GUARD_MISSING' }, 503);

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

    // The database AFTER INSERT trigger reserves exactly one unit atomically.
    // Never decrement inventory here as well.
    try {
      await db.prepare(
        `INSERT INTO cnc_auctions (id, seller, product_id, title, starting_bid_kobo, current_bid_kobo, ends_at, created)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`
      ).bind(auctionId, account.id, productId, product.name, startingBidKobo, endsAt, now).run();
    } catch (error) {
      if (error instanceof Error && /CNC_AUCTION_(?:STOCK|PRODUCT)_UNAVAILABLE|CHECK constraint failed/.test(error.message))
        return json({ error: 'Product is no longer eligible or in stock', code: 'AUCTION_STOCK_UNAVAILABLE' }, 409);
      throw error;
    }
    return json({ success: true, auctionId, id: auctionId }, 201);
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
      // One-time setup: reuse an existing buyer-owned address across auctions.
      // The winning delivery quote and any tokenised payment method are
      // separately required at checkout; never collect/store raw card numbers.
      const shippingSetup = await db.prepare(
        `SELECT id FROM cnc_buyer_addresses WHERE user_id=? LIMIT 1`
      ).bind(account.id).first();
      if (!shippingSetup)
        return json({
          error: 'Save a delivery address in your Profile before bidding',
          code: 'BUYER_ADDRESS_REQUIRED',
        }, 409);

      const amountKobo = body.amountKobo;
      const minRequired = auction.current_bid_kobo ? auction.current_bid_kobo + 100 : auction.starting_bid_kobo;
      if (!Number.isSafeInteger(amountKobo) || amountKobo < 100 || amountKobo > 100000000000)
        return json({ error: 'Bid must be a valid whole-kobo amount', code: 'INVALID_BID_AMOUNT' }, 400);
      if (amountKobo < minRequired)
        return json({ error: `Bid is too low: minimum ${(minRequired / 100).toFixed(2)} NGN`, code: 'BID_CONFLICT' }, 409);

      // The BEFORE INSERT validation and AFTER INSERT highest-bid update are one SQLite
      // transaction. A competing stale bid is rejected, never recorded as a losing winner.
      const bidGuard = await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger' AND name IN ('cnc_bid_validate','cnc_bid_update_auction')").first<{n:number}>();
      if (bidGuard?.n !== 2) return json({ error: 'Atomic bidding unavailable', code: 'BID_GUARD_MISSING' }, 503);
      const bidId = crypto.randomUUID();
      try {
        await db.prepare(
          `INSERT INTO cnc_bids (id, auction_id, bidder_id, amount_kobo, created) VALUES (?, ?, ?, ?, unixepoch())`
        ).bind(bidId, auction.id, account.id, amountKobo).run();
      } catch (error) {
        if (error instanceof Error && /CNC_BID_REJECTED|constraint failed/i.test(error.message))
          return json({ error: 'Bid rejected: auction ended or a higher bid was already accepted', code: 'BID_CONFLICT' }, 409);
        throw error;
      }
      return json({ success: true, bidId, currentBidKobo: amountKobo });
    }

    if (action === 'close') {
      if (auction.seller !== account.id && account.role !== 'admin')
        return json({ error: 'Unauthorized to close auction' }, 403);
      if (!auction.closed_at && now < auction.ends_at && account.role !== 'admin')
        return json({ error: 'Auction cannot close before its scheduled end', code: 'AUCTION_NOT_ENDED' }, 409);
      const closeGuard = await db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='cnc_auction_close_no_bid'").first();
      if (!closeGuard) return json({ error: 'Auction release protection unavailable', code: 'AUCTION_GUARD_MISSING' }, 503);
      // The AFTER UPDATE trigger restores unsold inventory exactly once.
      const updated = await db.prepare(
        `UPDATE cnc_auctions SET closed_at=unixepoch()
         WHERE id=? AND closed_at IS NULL AND (ends_at<=unixepoch() OR ?='admin') RETURNING id`
      ).bind(auction.id, account.role).first();
      return updated || auction.closed_at
        ? json({ success: true, closed: true, alreadyClosed: !updated })
        : json({ error: 'Auction has not ended', code: 'AUCTION_NOT_ENDED' }, 409);
    }

    if (action === 'checkout') {
      if (account.role !== 'buyer' || auction.winner_id !== account.id)
        return json({ error: 'Only the winning bidder can checkout' }, 403);
      if (!auction.closed_at && now < auction.ends_at)
        return json({ error: 'Auction is still running' }, 409);
      // IMPORTANT: cnc_orders has a cart-reservation trigger. A winner bid is not
      // a cart item; inserting an order here risks incorrect reservation/charges.
      // Do not create synthetic payment success or bypass required shipping quotes.
      return json({
        error: 'Auction winner checkout requires a dedicated order reservation and verified shipping quote',
        code: 'AUCTION_SETTLEMENT_NOT_CONFIGURED',
        paymentsEnabled: false,
      }, 503);
    }

    return json({ error: 'Unsupported auction action' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
}
