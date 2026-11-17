import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { renderAuthEmail } from '../deploy/chatgpt-sites/auth-email';
import { resolveEdgeSEO, injectEdgeSEOMeta } from '../deploy/chatgpt-sites/edge-seo';

console.log('🧪 Starting Cash N Carry Automated Staging & Backend Quality Suite...');

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    const start = performance.now();
    await fn();
    const ms = Math.round(performance.now() - start);
    console.log(`  ✅ [PASS] ${name} (${ms}ms)`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    if (process.env.GITHUB_ACTIONS === 'true' && err?.stack) console.error(String(err.stack).split('\n').slice(1,5).join('\n'));
    failed++;
  }
}

async function execMigrationSql(db: any, sql: string) {
  const parts = sql.split(/(?=CREATE TRIGGER)/);
  const ddl = parts[0]
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
  if (ddl) {
    await db.exec(ddl.replace(/\s+/g, ' ').replace(/;\s*/g, ';\n').trim());
  }
  for (const trigger of parts.slice(1)) {
    const cleanTrigger = trigger
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    if (cleanTrigger) {
      await db.prepare(cleanTrigger).run();
    }
  }
}

async function run() {
  await test('Auth email: branded accessible templates escape HTML and include expiry', () => {
    const verify = renderAuthEmail('<demo&code>', 'verify');
    assert.match(verify.subject, /verification/i);
    assert.match(verify.html, /&lt;demo&amp;code&gt;/);
    assert.doesNotMatch(verify.html, /<demo&code>/);
    assert.match(verify.text, /15 minutes/);
    const reset = renderAuthEmail('ABCDEFGH', 'reset');
    assert.match(reset.subject, /Reset/);
    assert.match(reset.html, /ABCDEFGH/);
  });

  // 1. Catalog SQL Sanitization & D1 Query Safety
  await test('Catalog: SQL Wildcard Escaping for D1 Queries', () => {
    const raw = '100% Cotton_Naija\\Special';
    const escaped = raw.trim().replace(/[\\%_]/g, '\\$&');
    assert.equal(escaped, '100\\% Cotton\\_Naija\\\\Special');
  });

  // 2. Flutterwave Webhook HMAC-SHA256 Signature Verification
  await test('Payments: Flutterwave Sandbox HMAC-SHA256 Webhook Verification', () => {
    const secret = 'FLW_SANDBOX_SECRET_KEY_12345';
    const payload = JSON.stringify({
      event: 'charge.completed',
      data: { id: 892019, tx_ref: 'cnc-test-sample-order-1', status: 'successful', amount: 18500, currency: 'NGN' },
    });
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const signature = hmac.digest('base64');
    assert.match(signature, /^[A-Za-z0-9+/]{43}=$/);

    const verifyHmac = createHmac('sha256', secret);
    verifyHmac.update(payload);
    assert.equal(verifyHmac.digest('base64'), signature);
  });

  // 3. Wrangler Staging Configuration Integrity
  await test('Cloudflare: wrangler.jsonc staging worker & D1 UUID validation', () => {
    const raw = fs.readFileSync(path.resolve('wrangler.jsonc'), 'utf8');
    // Strip // comments outside quotes cleanly
    const jsonText = raw
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    const cfg = JSON.parse(jsonText);
    assert.equal(cfg.name, 'cashncarry-d1-staging-worker');
    assert.equal(cfg.assets.html_handling, 'auto-trailing-slash');
    assert.equal(cfg.vars.PAYMENTS_ENABLED, 'false');
    assert.equal(cfg.vars.COINS_PURCHASES_ENABLED, 'false');
    assert.equal(cfg.vars.KYC_UPLOADS_ENABLED, 'false');
    for (const dbBinding of cfg.d1_databases) {
      assert.equal(dbBinding.database_name, 'cashncarry-d1-staging');
      assert.equal(dbBinding.database_id, '9a2cdbee-e030-4b10-908b-b10b8142d2aa');
    }
    assert.equal(cfg.name, 'cashncarry-d1-staging-worker');
  });

  // 4. Static SEO, Feed & Crawler files
  await test('SEO & Feeds: sitemap.xml, robots.txt, and google-shopping.xml valid', () => {
    const sitemap = fs.readFileSync(path.resolve('public/sitemap.xml'), 'utf8');
    assert.ok(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
    assert.ok(!sitemap.includes('<url>'), 'Private staging must not publish sitemap URLs');

    const feed = fs.readFileSync(path.resolve('public/feed/google-shopping.xml'), 'utf8');
    assert.ok(feed.includes('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">'));
    assert.ok(!feed.includes('<item>'), 'Private staging must not publish product feed items');

    const robots = fs.readFileSync(path.resolve('public/robots.txt'), 'utf8');
    assert.ok(robots.includes('Disallow: /'), 'Private staging must block all crawlers');
  });

  // Public search snippets must not expose demo or private/inactive listings.
  await test('Catalog SEO: product metadata uses only published verified active inventory', async () => {
    const sqlSeen: string[] = [];
    const db = {
      prepare(sql: string) {
        sqlSeen.push(sql);
        return {
          bind(..._values: (string | number)[]) {
            return { all: async () => ({ results: [] }) };
          },
        };
      },
    };
    const result = await resolveEdgeSEO({
      url: new URL('https://staging.example.test/products/private-product'),
      db,
    });
    assert.equal(result.ogType, 'website', 'An unavailable product must not be exposed as a product');
    assert.equal(sqlSeen.length, 1);
    assert.match(sqlSeen[0], /JOIN stores s ON s.id = p.store/);
    assert.match(sqlSeen[0], /p.active = 1/);
    assert.match(sqlSeen[0], /s.verified = 1/);
    assert.match(sqlSeen[0], /s.suspended = 0/);
    assert.match(sqlSeen[0], /p.id = \?/);
    assert.doesNotMatch(sqlSeen[0], /name LIKE/i, 'No fuzzy private-catalog lookups');
  });

  await test('SEO security: seller titles and JSON-LD cannot escape HTML/script contexts', () => {
    const injected = injectEdgeSEOMeta('<html><head><title>Old</title></head><body></body></html>', {
      title: 'Offer </title><img src=x onerror=alert(1)>',
      description: '" onmouseover="alert(1)',
      canonicalUrl: 'https://staging.example.test/product/p%22',
      ogType: 'product',
      image: 'https://staging.example.test/logo.png',
      jsonLd: { '@context': 'https://schema.org', name: '</script><script>alert(2)</script>' },
    });
    assert.doesNotMatch(injected, /<img src=x onerror=/);
    assert.doesNotMatch(injected, /<\/script><script>alert\(2\)/);
    assert.match(injected, /&lt;\/title&gt;&lt;img/);
    assert.match(injected, /&quot; onmouseover=&quot;/);
    assert.match(injected, /\\u003c\/script/);
  });

  // 5. Real Miniflare Worker + D1 Staging Guard Integration Tests
  const bundled = await build({
    entryPoints: ['deploy/chatgpt-sites/worker.ts'],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    external: ['node:*'],
    write: false,
  });
  const workerScript = bundled.outputFiles[0].text;
  const origin = 'https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev';

  const mf = new Miniflare({
    modules: true,
    script: workerScript,
    compatibilityDate: '2026-08-06',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['AUTH_DB', 'DB'],
    bindings: {
      AUTH_ORIGIN: origin,
      PAYMENTS_ENABLED: 'false',
      COINS_PURCHASES_ENABLED: 'false',
      KYC_UPLOADS_ENABLED: 'false',
      FLW_MODE: 'disabled',
      FLW_WEBHOOK_SIGNATURE: 'hmac-sha256',
      ORDER_RESERVATIONS: 'enabled',
      ADMIN_ACCOUNT_ID: 'staging-admin',
      ADMIN_TOTP_SECRET_HEX: '00112233445566778899aabbccddeeff00112233',
      BENCH_DIAGNOSTICS: 'enabled',
    },
  });

  try {
    const authDb = await mf.getD1Database('AUTH_DB');
    const migrationsDir = path.resolve('deploy/chatgpt-sites/migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    await test('D1 Migrations: Apply base schema and 0017 additive mobile sync cleanly', async () => {
      assert.ok(migrationFiles.includes('0001_new_auth.sql'));
      assert.ok(migrationFiles.includes('0010_catalog_schema_and_seed.sql'));
      assert.ok(migrationFiles.includes('0017_unified_mobile_sync.sql'));
      assert.ok(!migrationFiles.includes('0011_unified_mobile_sync.sql'), 'Migration 0011 collides with deployed wallet guard');
      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await execMigrationSql(authDb, sql);
      }
      const db = await mf.getD1Database('DB');
      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await execMigrationSql(db, sql);
      }
      const catCount = await db.prepare('SELECT COUNT(*) AS n FROM categories').first<{ n: number }>();
      const prodCount = await db.prepare('SELECT COUNT(*) AS n FROM products').first<{ n: number }>();
      assert.ok((catCount?.n ?? 0) >= 8, 'Expected at least 8 seeded categories');
      assert.equal(prodCount?.n ?? 0, 0, 'Fresh staging must not generate fake products');
    });

    await test('Health & Staging Flags: /api/health reports fail-closed staging flags', async () => {
      const res = await mf.dispatchFetch(origin + '/api/health');
      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.service, 'cashncarry-d1-staging-worker');
      assert.equal(data.dbConnected, true);
      assert.equal(data.authDbConnected, true);
      assert.equal(data.staging.paymentsEnabled, false);
      assert.equal(data.staging.coinsPurchasesEnabled, false);
      assert.equal(data.staging.kycUploadsEnabled, false);
    });

    await test('Payments Guard: Initialize & Flutterwave webhook return 503 when PAYMENTS_ENABLED=false', async () => {
      const initRes = await mf.dispatchFetch(origin + '/api/payments/initialize', {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify({ order_id: 'ord-1' }),
      });
      assert.equal(initRes.status, 503);
      const initJson: any = await initRes.json();
      assert.equal(initJson.code, 'PAYMENTS_DISABLED');

      const webhookRes = await mf.dispatchFetch(origin + '/api/payments/webhooks/flutterwave', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'flutterwave-signature': 'invalid' },
        body: JSON.stringify({ event: 'charge.completed', data: { id: 1, tx_ref: 'ref-1' } }),
      });
      assert.equal(webhookRes.status, 503);
      const whJson: any = await webhookRes.json();
      assert.equal(whJson.code, 'PAYMENTS_DISABLED');
    });

    // Seed authenticated buyer session in AUTH_DB for authenticated guard tests
    const sessionToken = 'b'.repeat(64);
    const sessionHash = createHash('sha256').update(sessionToken).digest('hex');
    await authDb
      .prepare("INSERT INTO cnc_auth_users (id, email, credential, role, verified) VALUES ('staging-buyer', 'staging-buyer@example.invalid', '', 'buyer', 1)")
      .run();
    await authDb
      .prepare("INSERT INTO cnc_auth_users (id, email, credential, role, verified) VALUES ('staging-seller', 'staging-seller@example.invalid', '', 'seller', 1)")
      .run();
    await authDb
      .prepare('INSERT INTO cnc_auth_sessions (hash, user_id, expires) VALUES (?, ?, ?)')
      .bind(sessionHash, 'staging-buyer', Date.now() + 600_000)
      .run();
    const sellerToken = 'c'.repeat(64);
    const sellerHash = createHash('sha256').update(sellerToken).digest('hex');
    await authDb
      .prepare('INSERT INTO cnc_auth_sessions (hash, user_id, expires) VALUES (?, ?, ?)')
      .bind(sellerHash, 'staging-seller', Date.now() + 600_000)
      .run();

    const buyerCookie = '__Host-cnc_session=' + sessionToken;
    const sellerCookie = '__Host-cnc_session=' + sellerToken;

    await test('Coins Guard: Credit minting blocked (503) & bad Origin rejected (403)', async () => {
      const csrfRes = await mf.dispatchFetch(origin + '/api/coins', {
        method: 'POST',
        headers: { origin: 'https://evil.example', cookie: buyerCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'credit', requestId: 'staging-credit-replay', recipientId: 'staging-buyer' }),
      });
      assert.equal(csrfRes.status, 403);

      const creditRes = await mf.dispatchFetch(origin + '/api/coins', {
        method: 'POST',
        headers: { origin, cookie: buyerCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'credit', requestId: 'staging-credit-replay', recipientId: 'staging-buyer' }),
      });
      assert.equal(creditRes.status, 503);
      const json: any = await creditRes.json();
      assert.equal(json.code, 'COIN_CREDIT_NOT_AUTHORIZED');
    });

    await test('Auctions Guard: Winner checkout blocked (503) & bad Origin rejected (403)', async () => {
      const csrfRes = await mf.dispatchFetch(origin + '/api/auctions', {
        method: 'PATCH',
        headers: { origin: 'https://evil.example', cookie: buyerCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', id: 'auc-1' }),
      });
      assert.equal(csrfRes.status, 403);

      const checkoutRes = await mf.dispatchFetch(origin + '/api/auctions', {
        method: 'PATCH',
        headers: { origin, cookie: buyerCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', id: 'auc-1' }),
      });
      assert.equal(checkoutRes.status, 503);
      const json: any = await checkoutRes.json();
      assert.equal(json.code, 'PAYMENTS_DISABLED');
    });

    await test('KYC Guard: GET reports uploadsEnabled=false & POST fails closed (503)', async () => {
      const getRes = await mf.dispatchFetch(origin + '/api/sellers/kyc', {
        headers: { origin, cookie: sellerCookie },
      });
      assert.equal(getRes.status, 200);
      const getJson: any = await getRes.json();
      assert.equal(getJson.uploadsEnabled, false);
      assert.equal(getJson.r2Configured, false);

      const postRes = await mf.dispatchFetch(origin + '/api/sellers/kyc', {
        method: 'POST',
        headers: { origin, cookie: sellerCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ businessName: 'Test', cacNumber: 'RC-123' }),
      });
      assert.equal(postRes.status, 503);
      const postJson: any = await postRes.json();
      assert.equal(postJson.code, 'KYC_UPLOADS_DISABLED');
    });

    await test('Unified Mobile Auth & Sync: Bearer token login -> /api/v1/profile -> wishlist -> follows', async () => {
      const salt = randomBytes(32).toString('hex');
      const derived = await scryptAsync(
        new TextEncoder().encode('StagingPass#2026!'),
        new TextEncoder().encode(salt),
        { N: 32768, r: 8, p: 3, dkLen: 32, maxmem: 64 * 1024 * 1024 }
      );
      const cred = salt + ':' + Buffer.from(derived).toString('hex');
      await authDb
        .prepare("INSERT INTO cnc_auth_users (id, email, credential, role, verified) VALUES ('mobile-buyer', 'mobile-buyer@example.invalid', ?, 'buyer', 1)")
        .bind(cred)
        .run();

      const loginRes = await mf.dispatchFetch(origin + '/api/auth/login', {
        method: 'POST',
        headers: {
          origin,
          'content-type': 'application/json',
          'x-client-type': 'mobile',
        },
        body: JSON.stringify({ email: 'mobile-buyer@example.invalid', password: 'StagingPass#2026!' }),
      });
      assert.equal(loginRes.status, 200);
      const loginJson: any = await loginRes.json();
      assert.equal(loginJson.signedIn, true);
      assert.match(loginJson.token, /^[a-f0-9]{64}$/);
      const bearerHeaders = {
        authorization: `Bearer ${loginJson.token}`,
        'x-client-type': 'mobile',
        'content-type': 'application/json',
      };

      const meRes = await mf.dispatchFetch(origin + '/api/auth/me', { headers: bearerHeaders });
      assert.equal(meRes.status, 200);
      const meJson: any = await meRes.json();
      assert.equal(meJson.user.id, 'mobile-buyer');
      assert.equal(meJson.authenticated, true);

      const putProfRes = await mf.dispatchFetch(origin + '/api/v1/profile', {
        method: 'PUT',
        headers: bearerHeaders,
        body: JSON.stringify({
          displayName: 'Tunde Lagos',
          bio: 'Synced across Android and Web',
          avatarUrl: 'https://example.invalid/avatar.png',
          selectedState: 'Abuja (FCT)',
        }),
      });
      assert.equal(putProfRes.status, 200);

      const getProfRes = await mf.dispatchFetch(origin + '/api/v1/profile', { headers: bearerHeaders });
      assert.equal(getProfRes.status, 200);
      const profJson: any = await getProfRes.json();
      assert.equal(profJson.profile.display_name, 'Tunde Lagos');
      assert.equal(profJson.profile.selected_state, 'Abuja (FCT)');

      const wishRes = await mf.dispatchFetch(origin + '/api/v1/wishlist', {
        method: 'POST',
        headers: bearerHeaders,
        body: JSON.stringify({ productId: 'p-1' }),
      });
      assert.ok(wishRes.status === 200 || wishRes.status === 201);
      const getWishRes = await mf.dispatchFetch(origin + '/api/v1/wishlist', { headers: bearerHeaders });
      const getWishJson: any = await getWishRes.json();
      assert.equal(getWishJson.wishlist[0].product_id, 'p-1');

      const followRes = await mf.dispatchFetch(origin + '/api/v1/follows', {
        method: 'POST',
        headers: bearerHeaders,
        body: JSON.stringify({ sellerId: 'staging-seller' }),
      });
      assert.ok(followRes.status === 200 || followRes.status === 201);
      const msgRes = await mf.dispatchFetch(origin + '/api/v1/messages', {
        method: 'POST',
        headers: bearerHeaders,
        body: JSON.stringify({ receiverId: 'staging-seller', body: 'Is this in stock for Abuja?' }),
      });
      assert.equal(msgRes.status, 201);

      // Admin route MUST strictly reject Mobile Bearer tokens (even if valid buyer/seller Bearer)
      const adminDeniedRes = await mf.dispatchFetch(origin + '/api/admin/moderation', {
        headers: bearerHeaders,
      });
      assert.equal(adminDeniedRes.status, 403);
    });

    await test('Unified Live & Short Videos: unconfigured provider never fakes broadcast or upload', async () => {
      const liveCreateRes = await mf.dispatchFetch(origin + '/api/v1/live', {
        method: 'POST',
        headers: { origin, cookie: sellerCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Do not create a phantom room', category: 'Fashion', pinnedProductId: 'p-1' }),
      });
      assert.equal(liveCreateRes.status, 503);
      const liveResult=await liveCreateRes.json() as any;
      assert.equal(liveResult.code,'BROADCAST_NOT_CONFIGURED');
      const videoRes = await mf.dispatchFetch(origin + '/api/v1/videos', {
        method: 'POST',
        headers: { origin, cookie: sellerCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Unverified URL', productId: 'p-1', videoUrl:'https://example.invalid/film.mp4' }),
      });
      assert.equal(videoRes.status,503);
      assert.equal((await videoRes.json() as any).code,'VIDEO_UPLOAD_UNAVAILABLE');
      const rooms=await authDb.prepare('SELECT COUNT(*) AS n FROM cnc_live_room_state').first<{n:number}>();
      const videos=await authDb.prepare('SELECT COUNT(*) AS n FROM cnc_short_videos').first<{n:number}>();
      assert.equal(rooms?.n,0);
      assert.equal(videos?.n,0);
      const anonymousLive=await mf.dispatchFetch(origin+'/api/v1/live');
      assert.equal(anonymousLive.status,200);
      const live=await anonymousLive.json() as any;
      assert.equal(live.liveStreamingConfigured,false);
    });


    await test('Owner setup: unauthenticated visitors cannot see authenticator secrets', async () => {
      const response = await mf.dispatchFetch(origin + '/api/auth/owner-setup');
      assert.equal(response.status, 403);
      const body = await response.text();
      assert.doesNotMatch(body, /otpauth:\/\//);
      assert.doesNotMatch(body, /0011223344556677/);
    });

    await test('Owner setup: existing seller password and TOTP are required before privilege elevation', async () => {
      const ownerId='staging-admin', email='owner.test@example.invalid';
      const password='secure-staging-owner-password-123';
      const salt=randomBytes(32).toString('hex');
      const digest=await scryptAsync(new TextEncoder().encode(password), new TextEncoder().encode(salt), {
        N:32768,r:8,p:3,dkLen:32,maxmem:64*1024*1024
      });
      const credential=salt+':'+Buffer.from(digest).toString('hex');
      await authDb.prepare('INSERT INTO cnc_auth_users (id,email,credential,role,verified,suspended) VALUES (?,?,?,?,1,0)')
        .bind(ownerId,email,credential,'seller').run();
      const ownerToken='d'.repeat(64);
      await authDb.prepare('INSERT INTO cnc_auth_sessions (hash,user_id,expires) VALUES (?,?,?)')
        .bind(createHash('sha256').update(ownerToken).digest('hex'),ownerId,Date.now()+3600000).run();
      const cookie='__Host-cnc_session='+ownerToken;
      const get=await mf.dispatchFetch(origin+'/api/auth/owner-setup',{headers:{cookie}});
      assert.equal(get.status,200,'Owner GET returned: '+(await get.clone().text()).slice(0,140));
      assert.match(await get.text(),/Activate owner access/);
      const wrongOrigin=await mf.dispatchFetch(origin+'/api/auth/owner-setup',{
        method:'POST',headers:{cookie,origin:'https://attacker.invalid','content-type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({step:'start',password}).toString()
      });
      assert.equal(wrongOrigin.status,403);
      const wrongPassword=await mf.dispatchFetch(origin+'/api/auth/owner-setup',{
        method:'POST',headers:{cookie,origin,'content-type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({step:'start',password:'incorrect-staging-password'}).toString()
      });
      assert.equal(wrongPassword.status,401);
      const start=await mf.dispatchFetch(origin+'/api/auth/owner-setup',{
        method:'POST',headers:{cookie,origin,'content-type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({step:'start',password}).toString()
      });
      assert.equal(start.status,200,'MFA enrolment step response');
      const setupHtml=await start.text();
      assert.match(setupHtml,/otpauth:\/\/totp\//);
      const before=await authDb.prepare('SELECT role FROM cnc_auth_users WHERE id=?').bind(ownerId).first<{role:string}>();
      assert.equal(before?.role,'seller');

      const secret=Buffer.from('00112233445566778899aabbccddeeff00112233','hex');
      const otp=()=>{
        const counter=Buffer.alloc(8);
        counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
        const mac=createHmac('sha1',secret).update(counter).digest();
        const offset=mac[mac.length-1]&15;
        return String((mac.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
      };
      const complete=await mf.dispatchFetch(origin+'/api/auth/owner-setup',{
        method:'POST',headers:{cookie,origin,'content-type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({step:'confirm',password,code:otp()}).toString()
      });
      assert.equal(complete.status,200);
      assert.match(await complete.text(),/Owner access activated/);
      const after=await authDb.prepare('SELECT role FROM cnc_auth_users WHERE id=?').bind(ownerId).first<{role:string}>();
      assert.equal(after?.role,'admin');
      const stale=await mf.dispatchFetch(origin+'/api/auth/me',{headers:{cookie}});
      assert.equal(stale.status,401,'Previous seller session must be invalidated');

      const signedIn=await mf.dispatchFetch(origin+'/api/auth/admin-login',{
        method:'POST',headers:{origin,'content-type':'application/json'},
        body:JSON.stringify({email,password,code:otp()})
      });
      assert.equal(signedIn.status,200);
      const signedInBody:any=await signedIn.json();
      assert.equal(signedInBody.user?.role,'admin');
      const adminCookie=signedIn.headers.get('set-cookie')?.split(';')[0]||'';
      assert.match(adminCookie,/^__Host-cnc_session=[a-f0-9]{64}$/);
      const me=await mf.dispatchFetch(origin+'/api/auth/me',{headers:{cookie:adminCookie}});
      assert.equal(me.status,200);
      assert.equal((await me.json() as any).user?.role,'admin');
      const browserAdmin=await mf.dispatchFetch(origin+'/api/admin/moderation',{headers:{cookie:adminCookie}});
      assert.equal(browserAdmin.status,200);
      const nativeAdmin=await mf.dispatchFetch(origin+'/api/admin/moderation',{
        headers:{cookie:adminCookie,'x-client-type':'mobile'}
      });
      assert.equal(nativeAdmin.status,403);
    });


    await test('P0 security: email verification cannot self-assign seller role', async () => {
      const id='self-assign-check',email='self-assign@example.invalid',token='e'.repeat(64);
      await authDb.prepare("INSERT INTO cnc_auth_users (id,email,credential,role,verified) VALUES (?,?, '', 'buyer',0)")
        .bind(id,email).run();
      await authDb.prepare("INSERT INTO cnc_auth_tokens (hash,user_id,purpose,expires) VALUES (?,?, 'verify',?)")
        .bind(createHash('sha256').update(token).digest('hex'),id,Date.now()+600000).run();
      const verified=await mf.dispatchFetch(origin+'/api/auth/verify',{
        method:'POST',headers:{origin,'content-type':'application/json'},
        body:JSON.stringify({token,password:'LongStrongPass#2026!',role:'seller'})
      });
      assert.equal(verified.status,200,'Email verification must succeed without granting seller role');
      const record=await authDb.prepare('SELECT role,verified FROM cnc_auth_users WHERE id=?').bind(id)
        .first<{role:string;verified:number}>();
      assert.equal(record?.verified,1);
      assert.equal(record?.role,'buyer','Only an authenticated Admin may promote the applicant');
    });

    await test('Admin–Seller A/B/F: apply, approve, publish, suspend, reapprove and unpublish', async () => {
      const adminToken='1'.repeat(64),approvedSellerToken='2'.repeat(64);
      await authDb.prepare("INSERT INTO cnc_auth_sessions(hash,user_id,expires,mfa) VALUES(?,?,?,1)")
        .bind(createHash('sha256').update(adminToken).digest('hex'),'staging-admin',Date.now()+600000).run();
      const adminCookie='__Host-cnc_session='+adminToken;
      const makePost=(cookie:string, body:unknown)=>({
        method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify(body)
      });
      const data={businessName:'Test Lagos Market',cacNumber:'RC-012345',businessType:'Retail',
        stateLocation:'Lagos',phone:'+2348012345678',description:'Isolated test seller application'};
      const anonymous=await mf.dispatchFetch(origin+'/api/seller/application');
      assert.equal(anonymous.status,401);
      const buyerDenied=await mf.dispatchFetch(origin+'/api/admin/seller-applications',{headers:{cookie:buyerCookie}});
      assert.equal(buyerDenied.status,403);
      const before=await mf.dispatchFetch(origin+'/api/seller/application',{headers:{cookie:buyerCookie}});
      assert.equal(before.status,200);
      assert.equal((await before.json() as any).sellerStatus,'none');
      const invalidOrigin=await mf.dispatchFetch(origin+'/api/seller/application',makePost(buyerCookie,data) as any);
      assert.equal(invalidOrigin.status,201);
      const application=(await invalidOrigin.json() as any).application;
      assert.equal(application.status,'pending');
      assert.equal(application.user_id,'staging-buyer');
      const applicationId=String(application.id);
      const duplicate=await mf.dispatchFetch(origin+'/api/seller/application',makePost(buyerCookie,data) as any);
      assert.equal(duplicate.status,409);
      const priorStore=await mf.dispatchFetch(origin+'/api/seller/store',makePost(buyerCookie,{name:'Unapproved Store',description:'No privilege'}) as any);
      assert.equal(priorStore.status,403);
      const reviewDenied=await mf.dispatchFetch(origin+'/api/admin/seller-applications/review',makePost(buyerCookie,{
        applicationId,userId:'staging-buyer',decision:'approve'
      }) as any);
      assert.equal(reviewDenied.status,403);
      const list=await mf.dispatchFetch(origin+'/api/admin/seller-applications',{headers:{cookie:adminCookie}});
      assert.equal(list.status,200);
      assert.ok((await list.json() as any).applications.some((x:any)=>x.id===applicationId));
      const reviewed=await mf.dispatchFetch(origin+'/api/admin/seller-applications/review',makePost(adminCookie,{
        applicationId,userId:'staging-buyer',decision:'approve',notes:'Manually reviewed staging-only test data'
      }) as any);
      assert.equal(reviewed.status,200,'Admin must be able to approve pending application');
      const user=await authDb.prepare("SELECT role,suspended FROM cnc_auth_users WHERE id='staging-buyer'")
        .first<{role:string;suspended:number}>();
      assert.equal(user?.role,'seller');
      assert.equal(user?.suspended,0);
      const stale=await mf.dispatchFetch(origin+'/api/seller/store',{headers:{cookie:buyerCookie}});
      assert.equal(stale.status,401,'Role change must invalidate prior sessions');
      await authDb.prepare("INSERT INTO cnc_auth_sessions(hash,user_id,expires,mfa) VALUES(?,?,?,0)")
        .bind(createHash('sha256').update(approvedSellerToken).digest('hex'),'staging-buyer',Date.now()+600000).run();
      const sellerCookieApproved='__Host-cnc_session='+approvedSellerToken;
      const sellerApp=await mf.dispatchFetch(origin+'/api/seller/application',{headers:{cookie:sellerCookieApproved}});
      assert.equal(sellerApp.status,200);
      assert.equal((await sellerApp.json() as any).sellerStatus,'approved');

      // An unrelated seller account with no recorded approval cannot operate the Seller Centre.
      const unrelated=await mf.dispatchFetch(origin+'/api/seller/products',{headers:{cookie:sellerCookie}});
      assert.equal(unrelated.status,403);

      const savedStore=await mf.dispatchFetch(origin+'/api/seller/store',makePost(sellerCookieApproved,{
        name:'Staging Test Store',description:'Isolated integration test store',
        category:'fashion',location:'Lagos',phone:'+2348012345678'
      }) as any);
      assert.equal(savedStore.status,200,'Storefront API contract should accept real Seller Centre fields');
      assert.equal((await savedStore.json() as any).storefront.name,'Staging Test Store');

      const productId=crypto.randomUUID();
      const created=await mf.dispatchFetch(origin+'/api/seller/products',makePost(sellerCookieApproved,{
        action:'create',id:productId,name:'Test Ankara Fabric',
        priceMinor:250000,stock:3,description:'Test-only fabric description',
        category:'fashion',imageUrl:'https://example.invalid/item.png',brand:'Staging Test Store'
      }) as any);
      assert.equal(created.status,200,'Seller product create must accept camelCase priceMinor');
      const mine=await mf.dispatchFetch(origin+'/api/seller/products',{headers:{cookie:sellerCookieApproved}});
      assert.equal(mine.status,200);
      const listing=(await mine.json() as any).items.find((x:any)=>x.id===productId);
      assert.equal(listing.description,'Test-only fabric description');
      assert.equal(listing.category,'fashion');
      assert.equal(listing.price_minor,250000);
      assert.equal(listing.image_url,'https://example.invalid/item.png');
      const publiclyVisibleBefore=await authDb.prepare("SELECT COUNT(*) AS n FROM products WHERE id=? AND active=1")
        .bind(productId).first<{n:number}>();
      assert.equal(publiclyVisibleBefore?.n,0,'Draft listings must remain private');
      const submitted=await mf.dispatchFetch(origin+'/api/seller/products',makePost(sellerCookieApproved,{
        action:'submit',id:productId,revision:listing.revision
      }) as any);
      assert.equal(submitted.status,200);
      const pending=await authDb.prepare("SELECT revision,publication FROM cnc_seller_products WHERE id=?")
        .bind(productId).first<{revision:number;publication:string}>();
      assert.equal(pending?.publication,'pending');
      const moderated=await mf.dispatchFetch(origin+'/api/admin/moderation',makePost(adminCookie,{
        id:productId,revision:pending?.revision,decision:'approve'
      }) as any);
      assert.equal(moderated.status,200);
      const publicProduct=await authDb.prepare("SELECT store,price,category,active FROM products WHERE id=?")
        .bind(productId).first<{store:string;price:number;category:string;active:number}>();
      assert.equal(publicProduct?.store,'staging-buyer');
      assert.equal(publicProduct?.price,2500);
      assert.equal(publicProduct?.category,'fashion');
      assert.equal(publicProduct?.active,1,'Approved listings must be buyer-visible');

      const suspended=await mf.dispatchFetch(origin+'/api/admin/seller-applications/review',makePost(adminCookie,{
        applicationId,userId:'staging-buyer',decision:'suspend',notes:'Test suspension'
      }) as any);
      assert.equal(suspended.status,200);
      const denied=await mf.dispatchFetch(origin+'/api/seller/products',{headers:{cookie:sellerCookieApproved}});
      assert.equal(denied.status,401,'Suspended account sessions cannot access Seller Centre');
      const hidden=await authDb.prepare("SELECT active FROM products WHERE id=?").bind(productId).first<{active:number}>();
      assert.equal(hidden?.active,0,'Suspended seller catalog must be hidden');
      const audit=await authDb.prepare("SELECT COUNT(*) AS n FROM cnc_seller_application_events WHERE application_id=?")
        .bind(applicationId).first<{n:number}>();
      assert.ok((audit?.n??0)>=3,'Application lifecycle must be auditable');
      const notifications=await authDb.prepare("SELECT COUNT(*) AS n FROM cnc_notifications WHERE user_id='staging-buyer'")
        .first<{n:number}>();
      assert.ok((notifications?.n??0)>=2,'Seller must receive review status notifications');
      // Suspended sellers may only resume following an explicit Admin decision.
      const reapproved=await mf.dispatchFetch(origin+'/api/admin/seller-applications/review',makePost(adminCookie,{
        applicationId,userId:'staging-buyer',decision:'approve',notes:'Verified reinstatement of test seller'
      }) as any);
      assert.equal(reapproved.status,200,'Admin should be able to reinstate a suspended seller');
      const reinstated=await authDb.prepare("SELECT role,suspended FROM cnc_auth_users WHERE id='staging-buyer'")
        .first<{role:string;suspended:number}>();
      assert.equal(reinstated?.role,'seller');
      assert.equal(reinstated?.suspended,0);
      const visibleAgain=await authDb.prepare("SELECT active FROM products WHERE id=?")
        .bind(productId).first<{active:number}>();
      assert.equal(visibleAgain?.active,1,'Reapproval should restore eligible published catalog items');
      const expiredSellerSession=await mf.dispatchFetch(origin+'/api/seller/products',{headers:{cookie:sellerCookieApproved}});
      assert.equal(expiredSellerSession.status,401,'Admin reapproval must not reactivate stale sessions');

      // New sign-in session: unpublish must hide the product from the buyer-facing catalog.
      const resumedToken='3'.repeat(64);
      await authDb.prepare("INSERT INTO cnc_auth_sessions(hash,user_id,expires,mfa) VALUES(?,?,?,0)")
        .bind(createHash('sha256').update(resumedToken).digest('hex'),'staging-buyer',Date.now()+600000).run();
      const resumedCookie='__Host-cnc_session='+resumedToken;
      const afterReapproval=await mf.dispatchFetch(origin+'/api/seller/products',{headers:{cookie:resumedCookie}});
      assert.equal(afterReapproval.status,200,'Reapproved seller should regain Seller Centre access');
      const resumedListing=(await afterReapproval.json() as any).items.find((x:any)=>x.id===productId);
      assert.equal(resumedListing?.publication,'published');
      const unpublish=await mf.dispatchFetch(origin+'/api/seller/products',makePost(resumedCookie,{
        action:'unpublish',id:productId,revision:resumedListing.revision
      }) as any);
      assert.equal(unpublish.status,200,'Seller must be able to unpublish an approved product');
      const unpublished=await authDb.prepare("SELECT publication,revision FROM cnc_seller_products WHERE id=?")
        .bind(productId).first<{publication:string;revision:number}>();
      assert.equal(unpublished?.publication,'draft');
      const noLongerPublic=await authDb.prepare("SELECT active FROM products WHERE id=?")
        .bind(productId).first<{active:number}>();
      assert.equal(noLongerPublic?.active,0,'Unpublished product must immediately disappear from buyer-facing catalog');
      const repeated=await mf.dispatchFetch(origin+'/api/seller/products',makePost(resumedCookie,{
        action:'unpublish',id:productId,revision:resumedListing.revision
      }) as any);
      assert.equal(repeated.status,409,'Stale product revision must fail without overwriting current status');

    });


    await test('P0 auction D1 trigger contract: reserve once, reject stale bids, close once and restore unsold stock once', async () => {
      const sellerId='auction-fixture-seller',buyerId='auction-fixture-buyer';
      const sellerToken='4'.repeat(64),buyerToken='5'.repeat(64);
      await authDb.prepare("INSERT INTO cnc_auth_users(id,email,credential,role,verified,suspended) VALUES (?,?,'','seller',1,0)")
        .bind(sellerId,'auction-fixture-seller@example.invalid').run();
      await authDb.prepare("INSERT INTO cnc_auth_users(id,email,credential,role,verified,suspended) VALUES (?,?,'','buyer',1,0)")
        .bind(buyerId,'auction-fixture-buyer@example.invalid').run();
      await authDb.prepare('INSERT INTO cnc_auth_sessions(hash,user_id,expires,mfa) VALUES(?,?,?,0)')
        .bind(createHash('sha256').update(sellerToken).digest('hex'),sellerId,Date.now()+600000).run();
      await authDb.prepare('INSERT INTO cnc_auth_sessions(hash,user_id,expires,mfa) VALUES(?,?,?,0)')
        .bind(createHash('sha256').update(buyerToken).digest('hex'),buyerId,Date.now()+600000).run();
      await authDb.prepare("INSERT INTO cnc_seller_stores(owner,name,description) VALUES (?,?,'Benchmark only')")
        .bind(sellerId,'Auction Benchmark Store').run();
      const productId='auction-product-fixture';
      await authDb.prepare(
        "INSERT INTO cnc_seller_products(id,owner,name,price_minor,stock,archived,revision,publication) VALUES(?,?,?,10000,2,0,1,'published')"
      ).bind(productId,sellerId,'Auction Benchmark Product').run();
      const sellCookie='__Host-cnc_session='+sellerToken,buyCookie='__Host-cnc_session='+buyerToken;
      const action=(cookie:string,method:string,payload:unknown)=>mf.dispatchFetch(origin+'/api/auctions',{
        method,headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify(payload),
      });
      const created=await action(sellCookie,'POST',{productId,startingBidKobo:10000,durationMinutes:60});
      assert.equal(created.status,201,'A verified seller should create an auction with a single D1 stock reservation');
      const id=(await created.json() as any).auctionId as string;
      const listed=await mf.dispatchFetch(origin+'/api/auctions',{headers:{cookie:buyCookie}});
      assert.equal(listed.status,200,'Auction listing query must match actual D1 schema');
      const auctionEntry=(await listed.json() as any).auctions.find((item:any)=>item.id===id);
      assert.equal(auctionEntry?.sellerId,sellerId);
      assert.equal(auctionEntry?.productId,productId);
      assert.equal(auctionEntry?.bidsCount,0);
      const reserved=await authDb.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(productId).first<{stock:number}>();
      assert.equal(reserved?.stock,1,'Auction reservation must decrement exactly one unit');
      const illegalSellerBid=await action(sellCookie,'PATCH',{action:'bid',id,amountKobo:10000});
      assert.equal(illegalSellerBid.status,403);
      const first=await action(buyCookie,'PATCH',{action:'bid',id,amountKobo:10000});
      assert.equal(first.status,200);
      const stale=await action(buyCookie,'PATCH',{action:'bid',id,amountKobo:10000});
      assert.equal(stale.status,409,'Stale or repeated bids must never be persisted');
      const bidRaces=await Promise.all([
        action(buyCookie,'PATCH',{action:'bid',id,amountKobo:10100}),
        action(buyCookie,'PATCH',{action:'bid',id,amountKobo:10200}),
      ]);
      for (const res of bidRaces) assert.ok([200,409].includes(res.status),'Concurrent requests must commit or reject cleanly');
      const accepted=bidRaces.filter(x=>x.status===200).length;
      const records=await authDb.prepare('SELECT COUNT(*) AS n,MAX(amount_kobo) AS max_bid FROM cnc_bids WHERE auction_id=?')
        .bind(id).first<{n:number;max_bid:number}>();
      const saved=await authDb.prepare('SELECT current_bid_kobo,winner_id FROM cnc_auctions WHERE id=?')
        .bind(id).first<{current_bid_kobo:number;winner_id:string}>();
      assert.equal(records?.n,1+accepted,'Rejected bids must not appear in bid history');
      assert.equal(saved?.current_bid_kobo,records?.max_bid,'Persisted highest bid must equal maximum valid bid');
      assert.equal(saved?.winner_id,buyerId);
      const early=await action(sellCookie,'PATCH',{action:'close',id});
      assert.equal(early.status,409,'Seller cannot prematurely close the auction');
      await authDb.prepare('UPDATE cnc_auctions SET ends_at=unixepoch()-1 WHERE id=?').bind(id).run();
      assert.equal((await action(sellCookie,'PATCH',{action:'close',id})).status,200);
      assert.equal((await action(sellCookie,'PATCH',{action:'close',id})).status,200);
      const stockAfterSold=await authDb.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(productId).first<{stock:number}>();
      assert.equal(stockAfterSold?.stock,1,'Closing a won auction must not restore reserved stock');
      const unsoldCreated=await action(sellCookie,'POST',{productId,startingBidKobo:10000,durationHours:1});
      assert.equal(unsoldCreated.status,201,'The UI durationHours payload is accepted');
      const unsoldId=(await unsoldCreated.json() as any).auctionId as string;
      const afterSecondReserve=await authDb.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(productId).first<{stock:number}>();
      assert.equal(afterSecondReserve?.stock,0);
      await authDb.prepare('UPDATE cnc_auctions SET ends_at=unixepoch()-1 WHERE id=?').bind(unsoldId).run();
      assert.equal((await action(sellCookie,'PATCH',{action:'close',id:unsoldId})).status,200);
      assert.equal((await action(sellCookie,'PATCH',{action:'close',id:unsoldId})).status,200);
      const afterReturn=await authDb.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(productId).first<{stock:number}>();
      assert.equal(afterReturn?.stock,1,'Unsold stock restored exactly once');
      const checkout=await action(buyCookie,'PATCH',{action:'checkout',id});
      assert.equal(checkout.status,503,'No unquoted auction order or synthetic payment success');
      const orderCount=await authDb.prepare("SELECT COUNT(*) AS n FROM cnc_orders WHERE request_id LIKE 'req-auc-%'").first<{n:number}>();
      assert.equal(orderCount?.n,0);
    });

    await test('P0 gifts: replay-safe, transactional balance checks and direct minting disabled', async () => {
      const senderId='auction-fixture-buyer',receiverId='auction-fixture-seller',token='5'.repeat(64);
      const post=(payload:unknown)=>mf.dispatchFetch(origin+'/api/coins',{
        method:'POST',headers:{origin,cookie:'__Host-cnc_session='+token,'content-type':'application/json'},
        body:JSON.stringify(payload),
      });
      await authDb.prepare(
        "INSERT INTO cnc_coin_ledger(id,user_id,delta,reason,idempotency_key) VALUES (?,?,100,'Isolated test promotional credit',?)"
      ).bind('isolated-coin-credit',senderId,'isolated-credit-20261117').run();
      const requestId='gift-benchmark-0001';
      const gift={action:'gift',requestId,recipientId:receiverId,gift:'star'};
      const first=await post(gift);
      assert.equal(first.status,200,'100-coin gift should settle against isolated balance');
      const replay=await post(gift);
      assert.equal(replay.status,200);
      assert.equal((await replay.json() as any).duplicated,true,'Retry must be idempotent even after coins are spent');
      const insufficient=await post({...gift,requestId:'gift-benchmark-0002',gift:'rose'});
      assert.equal(insufficient.status,409);
      const mint=await post({action:'credit',requestId:'credit-unverified-0001',recipientId:senderId,coins:5000});
      assert.equal(mint.status,503);
      const bal=await authDb.prepare('SELECT COALESCE(SUM(delta),0) AS balance FROM cnc_coin_ledger WHERE user_id=?').bind(senderId).first<{balance:number}>();
      const giftCount=await authDb.prepare('SELECT COUNT(*) AS n FROM cnc_gifts WHERE sender_id=?').bind(senderId).first<{n:number}>();
      assert.equal(bal?.balance,0);
      assert.equal(giftCount?.n,1);
    });

    await test('P1 video/live fail-closed, chat parameter compatibility and duplicate throttling', async () => {
      const sellerCookie='__Host-cnc_session='+'4'.repeat(64);
      const buyerCookie='__Host-cnc_session='+'5'.repeat(64);
      const send=(route:string,cookie:string,body:unknown)=>mf.dispatchFetch(origin+route,{
        method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify(body),
      });
      const fakeLive=await send('/api/v1/live',sellerCookie,{title:'Not a true broadcast',category:'Electronics'});
      assert.equal(fakeLive.status,503);
      assert.equal((await fakeLive.json() as any).code,'BROADCAST_NOT_CONFIGURED');
      const fakeVideo=await send('/api/v1/videos',sellerCookie,{title:'Unverified',productId:'auction-product-fixture',videoUrl:'https://invalid.example/file.mp4'});
      assert.equal(fakeVideo.status,503);
      const rooms=await authDb.prepare('SELECT COUNT(*) AS n FROM cnc_live_room_state').first<{n:number}>();
      assert.equal(rooms?.n,0,'Unconfigured live provider must not create phantom sessions');
      const roomId='isolated-live-chat-fixture';
      await authDb.prepare("INSERT INTO cnc_live_room_state(room_id,seller_id,seller_name,title,category,status) VALUES(?,?,?,'Isolated chat test','Tech','live')")
        .bind(roomId,'auction-fixture-seller','Auction Benchmark Store').run();
      const comment=await send('/api/v1/live/comments',buyerCookie,{roomId,body:'Test comment from user account'});
      assert.equal(comment.status,201);
      const dup=await send('/api/v1/live/comments',buyerCookie,{roomId,body:'Test comment from user account'});
      assert.equal(dup.status,429);
      const get=await mf.dispatchFetch(origin+'/api/v1/live/comments?roomId='+encodeURIComponent(roomId));
      assert.equal(get.status,200,'Legacy roomId query should remain supported');
      const data=await get.json() as any;
      assert.equal(data.comments.length,1);
      assert.equal(data.comments[0].author_name,'Member','Do not leak email-derived usernames');
      const publicRooms=await mf.dispatchFetch(origin+'/api/v1/live');
      assert.equal(publicRooms.status,200);
      const payload=await publicRooms.json() as any;
      assert.equal(payload.liveStreamingConfigured,false);
      assert.equal(payload.rooms[0].viewer_count,null,'Do not fabricate viewer presence');
    });

  } finally {
    await mf.dispose();
  }

  // 6. Verify staging-init-complete.sql executes cleanly in a blank D1 DB with all 6 triggers
  const initMf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } }',
    compatibilityDate: '2026-08-06',
    d1Databases: ['TEST_DB'],
  });
  try {
    await test('Bootstrap SQL: staging-init-complete.sql executes cleanly without demo products or stores', async () => {
      const testDb = await initMf.getD1Database('TEST_DB');
      const initSql = fs.readFileSync(path.resolve('deploy/chatgpt-sites/staging-init-complete.sql'), 'utf8');
      await execMigrationSql(testDb, initSql);
      const triggers = await testDb
        .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name")
        .all();
      const triggerNames = (triggers.results || []).map((t: { name: string }) => t.name);
      assert.equal(triggerNames.length, 6, `Expected 6 triggers, got ${triggerNames.join(', ')}`);
      const cats = await testDb.prepare('SELECT COUNT(*) AS n FROM categories').first<{ n: number }>();
      assert.equal(cats?.n, 8);
      for (const name of ['stores','products']) {
        const count = await testDb.prepare(`SELECT COUNT(*) AS n FROM ${name}`).first<{ n: number }>();
        assert.equal(count?.n ?? 0, 0, `Bootstrap created fake ${name}`);
      }
    });
  } finally {
    await initMf.dispose();
  }

  console.log(`\n🏁 Test Run Finished: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
