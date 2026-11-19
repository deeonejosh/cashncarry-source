import {
  currentAccount,
  hasValidMutationOrigin,
  readBody,
  type AuthEnvironment,
} from './new-auth';

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store' } });

const text = (v: unknown, maxLen = 400): string =>
  typeof v === 'string' ? v.trim().slice(0, maxLen) : '';

function stripApiPrefix(pathname: string): string {
  if (pathname.startsWith('/api/v1/')) return pathname.slice('/api/v1'.length);
  if (pathname.startsWith('/api/')) return pathname.slice('/api'.length);
  return pathname;
}

export async function unifiedSyncRoute(
  request: Request,
  env: AuthEnvironment
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;

  const route = stripApiPrefix(url.pathname);
  const supported = new Set([
    '/profile',
    '/addresses',
    '/wishlist',
    '/follows',
    '/videos',
    '/videos/like',
    '/videos/comments',
    '/live',
    '/live/comments',
    '/messages',
    '/notifications',
    '/reviews',
    '/seller/orders',
    '/seller/orders/fulfil',
  ]);
  if (!supported.has(route)) return null;

  const db = env.AUTH_DB;
  if (!db) return json({ error: 'Database unavailable' }, 503);

  const account = await currentAccount(request, env);
  const streamEnv = env as AuthEnvironment & {
    STREAM_SELLER_ID?: string; STREAM_WHIP_URL?: string; STREAM_WHEP_URL?: string;
  };
  const streamingConfigured = Boolean(streamEnv.STREAM_WHIP_URL && streamEnv.STREAM_WHEP_URL);

  // Public GET endpoints (videos feed, active live rooms, product reviews)
  if (request.method === 'GET') {
    if (route === '/videos') {
      const { results } = await db
        .prepare(
          `SELECT id, seller_id, seller_name, product_id, title, caption, video_url, cover_url, likes_count, comments_count, created
           FROM cnc_short_videos ORDER BY created DESC LIMIT 50`
        )
        .all();
      return json({ videos: results ?? [] });
    }

    if (route === '/videos/comments') {
      const videoId = text(url.searchParams.get('video_id'), 128);
      if (!videoId) return json({ error: 'video_id required' }, 400);
      const { results } = await db
        .prepare(
          `SELECT id, video_id, user_id, author_name, body, created
           FROM cnc_video_comments WHERE video_id = ? ORDER BY created DESC LIMIT 50`
        )
        .bind(videoId)
        .all();
      return json({ comments: results ?? [] });
    }

    if (route === '/live') {
      const { results } = await db
        .prepare(
          `SELECT room_id, seller_id, seller_name, title, category, status, viewer_count, hearts_count, pinned_product_id, stream_url, created
           FROM cnc_live_room_state ORDER BY (CASE WHEN status='live' THEN 0 ELSE 1 END), created DESC LIMIT 30`
        )
        .all();
      return json({
        rooms: (results ?? []).map((r: any) => ({ ...r, viewer_count: null })),
        liveStreamingConfigured: streamingConfigured,
      });
    }

    if (route === '/live/comments') {
      const roomId = text(url.searchParams.get('room_id') ?? url.searchParams.get('roomId'), 128);
      if (!roomId) return json({ error: 'room_id required' }, 400);
      const { results } = await db
        .prepare(
          `SELECT id, room_id, user_id, author_name, body, is_reaction, created
           FROM cnc_live_comments WHERE room_id = ? ORDER BY created DESC, rowid DESC LIMIT 60`
        )
        .bind(roomId)
        .all();
      return json({ comments: results ?? [] });
    }

    if (route === '/reviews') {
      const productId = text(url.searchParams.get('product_id'), 128);
      if (!productId) return json({ error: 'product_id required' }, 400);
      const { results } = await db
        .prepare(
          `SELECT id, product_id, user_id, author_name, rating, comment, created
           FROM cnc_product_reviews_buyer WHERE product_id = ? ORDER BY created DESC LIMIT 50`
        )
        .bind(productId)
        .all();
      return json({ reviews: results ?? [] });
    }

    // Authenticated GET routes below
    if (!account) return json({ error: 'Sign-in required' }, 401);

    if (route === '/profile') {
      const profile = await db
        .prepare(
          `SELECT p.user_id, COALESCE(NULLIF(p.display_name, ''), u.email) AS display_name,
                  p.bio, p.avatar_url, COALESCE(NULLIF(p.selected_state, ''), 'Lagos') AS selected_state,
                  u.email, u.role, p.updated_at
           FROM cnc_auth_users u
           LEFT JOIN cnc_user_profiles p ON p.user_id = u.id
           WHERE u.id = ?`
        )
        .bind(account.id)
        .first();
      return json({
        profile: profile ?? {
          user_id: account.id,
          display_name: account.email,
          bio: '',
          avatar_url: '',
          selected_state: 'Lagos',
          email: account.email,
          role: account.role,
        },
      });
    }

    if (route === '/addresses') {
      const { results } = await db
        .prepare(
          `SELECT id, recipient, line, city, state FROM cnc_buyer_addresses WHERE user_id = ? ORDER BY rowid DESC LIMIT 20`
        )
        .bind(account.id)
        .all();
      return json({ addresses: results ?? [] });
    }

    if (route === '/wishlist') {
      const { results } = await db
        .prepare(`SELECT product_id, created FROM cnc_wishlist WHERE user_id = ? ORDER BY created DESC LIMIT 100`)
        .bind(account.id)
        .all();
      return json({ wishlist: results ?? [] });
    }

    if (route === '/follows') {
      const { results } = await db
        .prepare(`SELECT seller_id, created FROM cnc_seller_follows WHERE follower_id = ? ORDER BY created DESC LIMIT 200`)
        .bind(account.id)
        .all();
      return json({ following: results ?? [] });
    }

    if (route === '/messages') {
      const { results } = await db
        .prepare(
          `SELECT id, sender_id, receiver_id, order_id, product_id, body, read_at, created
           FROM cnc_messages
           WHERE sender_id = ? OR receiver_id = ?
           ORDER BY created DESC LIMIT 100`
        )
        .bind(account.id, account.id)
        .all();
      return json({ messages: results ?? [] });
    }

    if (route === '/notifications') {
      const { results } = await db
        .prepare(
          `SELECT id, user_id, title, body, kind, read_at, created
           FROM cnc_notifications WHERE user_id = ? ORDER BY created DESC LIMIT 60`
        )
        .bind(account.id)
        .all();
      return json({ notifications: results ?? [] });
    }

    if (route === '/seller/orders') {
      if (account.role !== 'seller') return json({ error: 'Seller access required' }, 403);
      const approved = await db.prepare(
        "SELECT 1 AS ok FROM cnc_seller_applications WHERE user_id=? AND status='approved'"
      ).bind(account.id).first();
      if (!approved) return json({ error: 'Approved seller access required' }, 403);
      // Verified payment is required before a seller can read the buyer's
      // delivery address. Mixed-seller orders expose only this seller's
      // line items, fulfilment state and gross product total.
      const { results } = await db.prepare(
        `SELECT o.id,o.buyer,o.status,o.payment_state,o.delivery_address,o.created,
            COALESCE(f.status,'processing') AS fulfilment_status,
            COALESCE(f.carrier,'GIG Logistics') AS carrier,
            COALESCE(f.tracking_number,'') AS tracking_number,
            SUM(i.quantity*i.price_minor) AS total_minor
          FROM cnc_orders o
          JOIN cnc_order_items i ON i.order_id=o.id AND i.seller=?
          JOIN cnc_flutterwave_payments p ON p.order_id=o.id
            AND p.transaction_id IS NOT NULL AND p.paid_at IS NOT NULL
          LEFT JOIN cnc_seller_order_fulfilments f
            ON f.order_id=o.id AND f.seller_id=?
          WHERE o.payment_state='paid' AND o.status='awaiting_payment'
          GROUP BY o.id ORDER BY o.created DESC LIMIT 50`
      ).bind(account.id,account.id).all<{id:string}>();
      const {results:lineItems}=await db.prepare(`
        SELECT i.order_id,i.product_id,i.seller AS seller_id,
          i.name,i.quantity,i.price_minor,COALESCE(p.image,'') AS image,
          COALESCE(st.name,'') AS seller_name
        FROM cnc_order_items i
        JOIN cnc_orders o ON o.id=i.order_id
        JOIN cnc_flutterwave_payments pay ON pay.order_id=o.id
          AND pay.transaction_id IS NOT NULL AND pay.paid_at IS NOT NULL
        LEFT JOIN cnc_seller_products p ON p.id=i.product_id
        LEFT JOIN cnc_seller_stores st ON st.owner=i.seller
        WHERE i.seller=? AND o.status='awaiting_payment' AND o.payment_state='paid'
        ORDER BY o.created DESC,i.product_id LIMIT 2000
      `).bind(account.id).all<{
        order_id:string;product_id:string;seller_id:string;name:string;
        quantity:number;price_minor:number;image:string;seller_name:string
      }>();
      const lineItemsByOrder=new Map<string,typeof lineItems>();
      for(const item of lineItems) {
        const group=lineItemsByOrder.get(item.order_id)||[];
        group.push(item);
        lineItemsByOrder.set(item.order_id,group);
      }
      return json({orders:results.map(order=>({
        ...order,items:lineItemsByOrder.get(order.id)||[]
      }))});
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  // All mutating routes require auth + Origin or authenticated Mobile Bearer header
  if (!account) return json({ error: 'Sign-in required' }, 401);
  if (!hasValidMutationOrigin(request, env)) {
    return json({ error: 'Invalid request origin' }, 403);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await readBody(request);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  if (route === '/profile' && (request.method === 'PUT' || request.method === 'POST')) {
    const displayName = text(body.displayName ?? body.display_name, 80);
    const bio = text(body.bio, 240);
    const avatarUrl = text(body.avatarUrl ?? body.avatar_url, 400);
    const selectedState = text(body.selectedState ?? body.selected_state, 60) || 'Lagos';
    if (!displayName) return json({ error: 'displayName is required' }, 400);
    await db
      .prepare(
        `INSERT INTO cnc_user_profiles (user_id, display_name, bio, avatar_url, selected_state, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           display_name = excluded.display_name,
           bio = excluded.bio,
           avatar_url = excluded.avatar_url,
           selected_state = excluded.selected_state,
           updated_at = excluded.updated_at`
      )
      .bind(account.id, displayName, bio, avatarUrl, selectedState, now)
      .run();
    return json({
      updated: true,
      profile: {
        user_id: account.id,
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        selected_state: selectedState,
        email: account.email,
        role: account.role,
      },
    });
  }

  if (route === '/addresses') {
    if (request.method === 'POST') {
      const recipient = text(body.recipient, 100);
      const line = text(body.line, 240);
      const city = text(body.city, 100);
      const state = text(body.state, 100);
      if (!recipient || !line || !city || !state) {
        return json({ error: 'recipient, line, city, and state are required' }, 400);
      }
      const id = crypto.randomUUID();
      await db
        .prepare(`INSERT INTO cnc_buyer_addresses (id, user_id, recipient, line, city, state) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(id, account.id, recipient, line, city, state)
        .run();
      return json({ address: { id, recipient, line, city, state } }, 201);
    }
    if (request.method === 'DELETE') {
      const id = text(body.id, 128);
      if (!id) return json({ error: 'id required' }, 400);
      await db
        .prepare(`DELETE FROM cnc_buyer_addresses WHERE id = ? AND user_id = ?`)
        .bind(id, account.id)
        .run();
      return json({ deleted: true });
    }
  }

  if (route === '/wishlist' && request.method === 'POST') {
    const productId = text(body.productId ?? body.product_id, 128);
    if (!productId) return json({ error: 'productId required' }, 400);
    const existing = await db
      .prepare(`SELECT product_id FROM cnc_wishlist WHERE user_id = ? AND product_id = ?`)
      .bind(account.id, productId)
      .first();
    if (existing) {
      await db
        .prepare(`DELETE FROM cnc_wishlist WHERE user_id = ? AND product_id = ?`)
        .bind(account.id, productId)
        .run();
      return json({ wishlisted: false, productId });
    }
    await db
      .prepare(`INSERT INTO cnc_wishlist (user_id, product_id, created) VALUES (?, ?, ?)`)
      .bind(account.id, productId, now)
      .run();
    return json({ wishlisted: true, productId }, 201);
  }

  if (route === '/follows' && request.method === 'POST') {
    const sellerId = text(body.sellerId ?? body.seller_id, 128);
    if (!sellerId) return json({ error: 'sellerId required' }, 400);
    const existing = await db
      .prepare(`SELECT seller_id FROM cnc_seller_follows WHERE follower_id = ? AND seller_id = ?`)
      .bind(account.id, sellerId)
      .first();
    if (existing) {
      await db
        .prepare(`DELETE FROM cnc_seller_follows WHERE follower_id = ? AND seller_id = ?`)
        .bind(account.id, sellerId)
        .run();
      return json({ following: false, sellerId });
    }
    await db
      .prepare(`INSERT INTO cnc_seller_follows (follower_id, seller_id, created) VALUES (?, ?, ?)`)
      .bind(account.id, sellerId, now)
      .run();
    return json({ following: true, sellerId }, 201);
  }

  if (route === '/videos' && request.method === 'POST') {
    const title = text(body.title, 160);
    const productId = text(body.productId ?? body.product_id, 128);
    if (!title || !productId) return json({ error: 'title and productId required' }, 400);
    // A URL supplied by a client is not proof of a verified media upload.
    return json({ error: 'Verified video upload pipeline unavailable', code: 'VIDEO_UPLOAD_UNAVAILABLE' }, 503);
  }

  if (route === '/videos/like' && request.method === 'POST') {
    const videoId = text(body.videoId ?? body.video_id, 128);
    if (!videoId) return json({ error: 'videoId required' }, 400);
    const existing = await db
      .prepare(`SELECT video_id FROM cnc_video_likes WHERE video_id = ? AND user_id = ?`)
      .bind(videoId, account.id)
      .first();
    if (!existing) {
      await db.batch([
        db.prepare(`INSERT INTO cnc_video_likes (video_id, user_id, created) VALUES (?, ?, ?)`).bind(videoId, account.id, now),
        db.prepare(`UPDATE cnc_short_videos SET likes_count = likes_count + 1 WHERE id = ?`).bind(videoId),
      ]);
    }
    return json({ liked: true, videoId });
  }

  if (route === '/videos/comments' && request.method === 'POST') {
    const videoId = text(body.videoId ?? body.video_id, 128);
    const commentBody = text(body.body ?? body.text, 300);
    if (!videoId || !commentBody) return json({ error: 'videoId and body required' }, 400);
    const id = crypto.randomUUID();
    const authorName = account.email.split('@')[0];
    await db.batch([
      db
        .prepare(
          `INSERT INTO cnc_video_comments (id, video_id, user_id, author_name, body, created) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(id, videoId, account.id, authorName, commentBody, now),
      db.prepare(`UPDATE cnc_short_videos SET comments_count = comments_count + 1 WHERE id = ?`).bind(videoId),
    ]);
    return json({ success: true, id }, 201);
  }

  if (route === '/live') {
    if (request.method === 'POST') {
      if (account.role !== 'seller') return json({ error: 'Seller role required to broadcast' }, 403);
      // Private staging pilot: only the one approved seller with a dedicated
      // Cloudflare Stream input can create a live room. The app starts WHIP
      // first and submits only after the browser's RTCPeerConnection is connected.
      // This browser attestation is NOT independent server-side media verification;
      // do not enable this path for production or other sellers without
      // Cloudflare Stream API status validation and per-seller input allocation.
      if (!streamingConfigured || !streamEnv.STREAM_SELLER_ID || account.id !== streamEnv.STREAM_SELLER_ID) {
        return json({error:'This seller has no configured Cloudflare Stream input',code:'BROADCAST_NOT_CONFIGURED'},503);
      }
      if (body.broadcastConnected !== true) {
        return json({error:'Connect your camera to Cloudflare Stream before creating a room',code:'BROADCAST_HANDSHAKE_REQUIRED'},409);
      }
      const title = text(body.title, 100);
      const category = text(body.category, 45) || 'general';
      const pinnedProductId = text(body.pinnedProductId, 128);
      if (title.length < 3) return json({error:'A livestream title is required'},400);
      const seller = await db.prepare(
        "SELECT s.name FROM cnc_seller_stores s JOIN cnc_seller_applications a ON a.user_id=s.owner AND a.status='approved' WHERE s.owner=?"
      ).bind(account.id).first<{name:string}>();
      if (!seller) return json({error:'Only approved sellers can broadcast'},403);
      const existing = await db.prepare(
        "SELECT room_id FROM cnc_live_room_state WHERE seller_id=? AND status='live' LIMIT 1"
      ).bind(account.id).first();
      if (existing) return json({error:'Finish your existing live room before starting another',code:'ROOM_ALREADY_ACTIVE'},409);
      if (pinnedProductId) {
        const eligible = await db.prepare(
          "SELECT id FROM cnc_seller_products WHERE id=? AND owner=? AND publication='published' AND archived=0 AND stock>0"
        ).bind(pinnedProductId,account.id).first();
        if (!eligible) return json({error:'Only your published and in-stock products may be pinned'},409);
      }
      const url = streamEnv.STREAM_WHEP_URL || '';
      try {
        const whep = new URL(url);
        if (whep.protocol !== 'https:' || !whep.hostname.endsWith('.cloudflarestream.com') ||
            !whep.pathname.endsWith('/webRTC/play') || whep.search || whep.hash) {
          return json({error:'Cloudflare Stream playback is not configured'},503);
        }
      } catch { return json({error:'Cloudflare Stream playback is unavailable'},503); }
      const roomId = crypto.randomUUID();
      await db.prepare(
        "INSERT INTO cnc_live_room_state (room_id,seller_id,seller_name,title,category,status,viewer_count,hearts_count,pinned_product_id,stream_url,created) VALUES (?,?,?,?,?,'live',0,0,?,?,?)"
      ).bind(roomId,account.id,seller.name,title,category,pinnedProductId,url,now).run();
      return json({success:true,roomId,streamConnected:true},201);
    }

    if (request.method === 'PATCH') {
      const roomId = text(body.roomId ?? body.room_id, 128);
      const action = text(body.action, 40);
      if (!roomId || !['pin', 'end', 'like', 'join'].includes(action)) {
        return json({ error: 'Valid roomId and action required' }, 400);
      }
      if (action === 'like') {
        const updated = await db.prepare(
          `UPDATE cnc_live_room_state SET hearts_count=hearts_count+1 WHERE room_id=? AND status='live' RETURNING hearts_count`
        ).bind(roomId).first();
        return updated ? json({ success: true }) : json({ error: 'Live room unavailable' }, 409);
      }
      if (action === 'join') {
        // Do not increment the old counter on refresh: no presence tracking exists.
        const room = await db.prepare(`SELECT room_id FROM cnc_live_room_state WHERE room_id=? AND status='live'`)
          .bind(roomId).first();
        return room ? json({ success: true, presenceTracked: false }) : json({ error: 'Live room unavailable' }, 409);
      }
      const room = await db.prepare(`SELECT seller_id FROM cnc_live_room_state WHERE room_id = ?`).bind(roomId).first<{ seller_id: string }>();
      if (!room || room.seller_id !== account.id) return json({ error: 'Host authorization required' }, 403);
      if (action === 'pin') {
        const pinnedId = text(body.pinnedProductId ?? body.pinned_product_id, 128);
        if (pinnedId) {
          const eligible = await db.prepare(
            `SELECT id FROM cnc_seller_products WHERE id=? AND owner=? AND publication='published' AND archived=0 AND stock>0`
          ).bind(pinnedId, account.id).first();
          if (!eligible) return json({ error: 'Only your published, in-stock products may be pinned' }, 409);
        }
        const updated = await db.prepare(
          `UPDATE cnc_live_room_state SET pinned_product_id=? WHERE room_id=? AND seller_id=? AND status='live' RETURNING room_id`
        ).bind(pinnedId, roomId, account.id).first();
        return updated ? json({ success: true }) : json({ error: 'Live room unavailable' }, 409);
      }
      if (action === 'end') {
        const updated = await db.prepare(
          `UPDATE cnc_live_room_state SET status='ended', ended_at=unixepoch() WHERE room_id=? AND seller_id=? AND status='live' RETURNING room_id`
        ).bind(roomId, account.id).first();
        return updated ? json({ success: true, status: 'ended' }) : json({ error: 'Live room already ended' }, 409);
      }
    }
  }

  if (route === '/live/comments' && request.method === 'POST') {
    const roomId = text(body.roomId ?? body.room_id, 128);
    const commentBody = text(body.body ?? body.text, 300);
    if (!roomId || !commentBody) return json({ error: 'roomId and body required' }, 400);
    const room = await db.prepare(`SELECT room_id FROM cnc_live_room_state WHERE room_id=? AND status='live'`)
      .bind(roomId).first();
    if (!room) return json({ error: 'Live room unavailable' }, 409);
    const profile = await db.prepare(`SELECT display_name FROM cnc_user_profiles WHERE user_id=?`)
      .bind(account.id).first<{display_name?:string}>();
    const authorName = profile?.display_name?.trim().slice(0,80) || 'Member';
    const id = crypto.randomUUID();
    const inserted = await db.prepare(
      `INSERT INTO cnc_live_comments (id,room_id,user_id,author_name,body,is_reaction,created)
       SELECT ?,?,?,?,?,0,unixepoch()
       WHERE (SELECT COUNT(*) FROM cnc_live_comments WHERE room_id=? AND user_id=? AND created>=unixepoch()-10)<5
         AND NOT EXISTS (SELECT 1 FROM cnc_live_comments WHERE room_id=? AND user_id=? AND body=? AND created>=unixepoch()-2)
       RETURNING id`
    ).bind(id,roomId,account.id,authorName,commentBody,roomId,account.id,roomId,account.id,commentBody).first<{id:string}>();
    return inserted ? json({ success: true, id }, 201)
      : json({ error: 'Please slow down or avoid duplicate comments', code: 'CHAT_RATE_LIMITED' }, 429);
  }

  if (route === '/messages') {
    if (request.method === 'POST') {
      const receiverId = text(body.receiverId ?? body.receiver_id, 128);
      const msgBody = text(body.body ?? body.content, 500);
      const orderId = text(body.orderId ?? body.order_id, 128);
      const productId = text(body.productId ?? body.product_id, 128);
      if (!receiverId || !msgBody) return json({ error: 'receiverId and body required' }, 400);
      const recipient = await db
        .prepare(`SELECT id FROM cnc_auth_users WHERE id = ? AND suspended = 0`)
        .bind(receiverId)
        .first();
      if (!recipient) return json({ error: 'Recipient not found' }, 404);
      const id = crypto.randomUUID();
      await db.batch([
        db
          .prepare(
            `INSERT INTO cnc_messages (id, sender_id, receiver_id, order_id, product_id, body, created) VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(id, account.id, receiverId, orderId, productId, msgBody, now),
        db
          .prepare(
            `INSERT INTO cnc_notifications (id, user_id, title, body, kind, created) VALUES (?, ?, 'New message', ?, 'system', ?)`
          )
          .bind(crypto.randomUUID(), receiverId, msgBody.slice(0, 120), now),
      ]);
      return json({ success: true, id }, 201);
    }
    if (request.method === 'PATCH') {
      const id = text(body.id, 128);
      if (!id) return json({ error: 'id required' }, 400);
      await db
        .prepare(`UPDATE cnc_messages SET read_at = ? WHERE id = ? AND receiver_id = ?`)
        .bind(now, id, account.id)
        .run();
      return json({ updated: true });
    }
  }

  if (route === '/notifications' && request.method === 'PATCH') {
    await db
      .prepare(`UPDATE cnc_notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`)
      .bind(now, account.id)
      .run();
    return json({ updated: true });
  }

  if (route === '/reviews' && request.method === 'POST') {
    const productId = text(body.productId ?? body.product_id, 128);
    const rating = Number(body.rating);
    const comment = text(body.comment, 350);
    if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      return json({ error: 'Valid productId, rating (1-5), and comment required' }, 400);
    }
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO cnc_product_reviews_buyer (id, product_id, user_id, author_name, rating, comment, created) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, productId, account.id, account.email.split('@')[0], rating, comment, now)
      .run();
    return json({ success: true, id }, 201);
  }

  if (route === '/seller/orders/fulfil' && request.method === 'POST') {
    if (account.role !== 'seller') return json({ error: 'Seller access required' }, 403);
    const approved = await db.prepare(
      "SELECT 1 AS ok FROM cnc_seller_applications WHERE user_id=? AND status='approved'"
    ).bind(account.id).first();
    if (!approved) return json({ error: 'Approved seller access required' }, 403);
    const orderId = text(body.orderId ?? body.order_id, 128);
    const status = text(body.status, 30);
    const carrier = text(body.carrier, 80) || 'GIG Logistics';
    const trackingNumber = text(body.trackingNumber ?? body.tracking_number, 100);
    if (!orderId || !['processing','packed','shipped','delivered'].includes(status)) {
      return json({ error: 'Valid orderId and fulfilment status required' }, 400);
    }
    if (['shipped','delivered'].includes(status) && !trackingNumber) {
      return json({ error: 'Shipping tracking number required' }, 400);
    }
    const order = await db.prepare(
      `SELECT o.buyer,o.status,o.payment_state,p.transaction_id,p.paid_at
       FROM cnc_orders o
       JOIN cnc_order_items i ON i.order_id=o.id AND i.seller=?
       LEFT JOIN cnc_flutterwave_payments p ON p.order_id=o.id
       WHERE o.id=? LIMIT 1`
    ).bind(account.id,orderId).first<{
      buyer:string;status:string;payment_state:string;
      transaction_id:string|null;paid_at:number|null
    }>();
    if (!order) return json({ error: 'Order not found for seller' }, 404);
    if (order.status!=='awaiting_payment'||order.payment_state!=='paid'||
        !order.transaction_id||!order.paid_at) {
      return json({error:'Order is not fully paid',code:'FULFILMENT_NOT_READY'},409);
    }
    const previous=await db.prepare(
      'SELECT seller_id,status,carrier,tracking_number FROM cnc_seller_order_fulfilments WHERE order_id=? AND seller_id=?'
    ).bind(orderId,account.id).first<{seller_id:string;status:string;carrier:string;tracking_number:string}>();
    if (previous?.status===status && previous.carrier===carrier &&
        previous.tracking_number===trackingNumber) {
      return json({updated:false,orderId,status,carrier,trackingNumber});
    }
    const nextStatus:Record<string,string>={processing:'packed',packed:'shipped',shipped:'delivered'};
    if ((!previous && status!=='processing') ||
        (previous && nextStatus[previous.status]!==status)) {
      return json({error:'Invalid fulfilment status transition',
        code:'FULFILMENT_TRANSITION_REJECTED'},409);
    }
    // Unique (order_id,seller_id) and conditional upsert serialize transitions.
    // D1 triggers validate paid proof/ownership and atomically notify buyers.
    const changed=await db.prepare(
      `INSERT INTO cnc_seller_order_fulfilments
         (order_id,seller_id,status,carrier,tracking_number,updated_at)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(order_id,seller_id) DO UPDATE SET
         status=excluded.status,carrier=excluded.carrier,
         tracking_number=excluded.tracking_number,updated_at=excluded.updated_at
       WHERE (cnc_seller_order_fulfilments.status='processing' AND excluded.status='packed')
          OR (cnc_seller_order_fulfilments.status='packed' AND excluded.status='shipped')
          OR (cnc_seller_order_fulfilments.status='shipped' AND excluded.status='delivered')
       RETURNING order_id`
    ).bind(orderId,account.id,status,carrier,trackingNumber,now).first<{order_id:string}>();
    if (!changed) {
      const latest=await db.prepare(
        'SELECT seller_id,status,carrier,tracking_number FROM cnc_seller_order_fulfilments WHERE order_id=? AND seller_id=?'
      ).bind(orderId,account.id).first<{seller_id:string;status:string;carrier:string;tracking_number:string}>();
      if(latest?.status===status&&latest.carrier===carrier&&
         latest.tracking_number===trackingNumber) {
        return json({updated:false,orderId,status,carrier,trackingNumber});
      }
      return json({error:'Fulfilment changed; refresh and retry',code:'FULFILMENT_STALE'},409);
    }
    return json({updated:true,orderId,status,carrier,trackingNumber});
  }

  return json({ error: 'Method not allowed' }, 405);
}
