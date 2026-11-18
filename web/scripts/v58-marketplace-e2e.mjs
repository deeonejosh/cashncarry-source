import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

// ALL identities, products, and orders are created inside a disposable Miniflare D1.
// This script MUST NOT issue network requests to the remote staging Worker or any provider.
const origin = 'https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev';
const runId = 'v58-isolated-e2e-' + Date.now();
const evidence = [];
function record(name, data) { evidence.push({ name, ...data }); console.log('PASS: ' + name); }
function digest(s) { return createHash('sha256').update(s).digest('hex'); }

async function migrate(db, sql) {
  const sections = sql.split(/(?=CREATE TRIGGER)/);
  const ddl = sections[0].split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim();
  if (ddl) await db.exec(ddl.replace(/\s+/g, ' ').replace(/;\s*/g, ';\n').trim());
  for (const segment of sections.slice(1)) {
    const trigger = segment.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim();
    if (trigger) await db.prepare(trigger).run();
  }
}

const bundle = await build({
  entryPoints: ['deploy/chatgpt-sites/worker.ts'],
  bundle: true, write: false, platform: 'browser', format: 'esm', target: 'es2022', external: ['node:*'],
});
const mf = new Miniflare({
  modules: true, script: bundle.outputFiles[0].text,
  compatibilityDate: '2026-08-06', compatibilityFlags: ['nodejs_compat'],
  // These two bindings refer to the SAME D1 database in deployed staging.
  d1Databases: { AUTH_DB: 'v58-disposable-database', DB: 'v58-disposable-database' },
  bindings: {
    AUTH_ORIGIN: origin, ADMIN_ACCOUNT_ID: 'v58-e2e-owner',
    ADMIN_TOTP_SECRET_HEX: '00112233445566778899aabbccddeeff00112233',
    PAYMENTS_ENABLED: 'false', COINS_PURCHASES_ENABLED: 'false',
    KYC_UPLOADS_ENABLED: 'false', FLW_MODE: 'disabled',
    ORDER_RESERVATIONS: 'enabled', FLW_WEBHOOK_SIGNATURE: 'hmac-sha256',
  },
});
let result = { status: 'FAILED', cases: 0, steps: evidence, remoteStagingWrites: 0 };
try {
  const db = await mf.getD1Database('AUTH_DB');
  const dir = path.resolve('deploy/chatgpt-sites/migrations');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    await migrate(db, fs.readFileSync(path.join(dir, f), 'utf8'));
  }
  const catalogDb = await mf.getD1Database('DB');
  const cats = await catalogDb.prepare('SELECT COUNT(*) AS n FROM categories').first();
  assert.ok(cats?.n >= 8, 'DB and AUTH_DB must resolve to same isolated database');
  record('same physical D1 database exposed through both Worker bindings', { categories: cats.n });

  const ids = {
    owner: 'v58-e2e-owner', seller: 'v58-e2e-seller',
    buyerA: 'v58-e2e-buyer-a', buyerB: 'v58-e2e-buyer-b',
    pending: 'v58-e2e-pending-seller',
  };
  const tokens = {};
  async function user(role, id, verified = 1) {
    await db.prepare('INSERT INTO cnc_auth_users (id,email,credential,role,verified) VALUES (?,?,?,?,?)')
      .bind(id, id + '@example.invalid', '', role, verified).run();
    const token = createHash('sha256').update(id + ':' + runId).digest('hex');
    tokens[id] = token;
    await db.prepare('INSERT INTO cnc_auth_sessions (hash,user_id,expires,mfa) VALUES (?,?,?,?)')
      .bind(digest(token), id, Date.now() + 3600_000, role === 'admin' ? 1 : 0).run();
    return token;
  }
  await user('admin', ids.owner);
  await user('buyer', ids.seller);
  await user('buyer', ids.buyerA);
  await user('buyer', ids.buyerB);
  await user('buyer', ids.pending);
  record('disposable owner, seller-applicant, two buyers and pending seller seeded in isolated D1', { isolated: true });

  async function call(url, roleId, method = 'GET', body = undefined) {
    const headers = { origin };
    if (roleId) headers.cookie = '__Host-cnc_session=' + tokens[roleId];
    if (body !== undefined) headers['content-type'] = 'application/json';
    const response = await mf.dispatchFetch(origin + url, {
      method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    return { status: response.status, data };
  }
  async function expectStatus(url, role, method, body, status, name) {
    const r = await call(url, role, method, body);
    assert.equal(r.status, status, name + ': ' + JSON.stringify(r.data));
    record(name, { http: status });
    return r.data;
  }

  await expectStatus('/api/admin/overview', ids.buyerA, 'GET', undefined, 403, 'buyer cannot open owner Admin Console');
  await expectStatus('/api/seller/store', ids.seller, 'GET', undefined, 403, 'unapproved seller applicant cannot use Seller Centre');

  const app = await expectStatus('/api/seller/application', ids.seller, 'POST',
    { businessName: 'Isolated Staging Goods', cacNumber: '', businessType: 'Retail',
      stateLocation: 'Lagos', phone: '08012345678', description: 'Temporary isolated end-to-end test seller.' },
    201, 'buyer submits seller application');
  assert.equal(app.sellerStatus, 'pending');
  const appId = app.application.id;
  await expectStatus('/api/seller/store', ids.seller, 'GET', undefined, 403, 'pending seller remains restricted');
  const applications = await expectStatus('/api/admin/seller-applications', ids.owner, 'GET', undefined, 200, 'owner can inspect pending seller application');
  assert.ok(applications.applications.some(a => a.id === appId && a.status === 'pending'));
  await expectStatus('/api/admin/seller-applications/review', ids.buyerA, 'POST',
    { applicationId: appId, userId: ids.seller, decision: 'approve' }, 403,
    'buyer cannot approve seller');
  const approved = await expectStatus('/api/admin/seller-applications/review', ids.owner, 'POST',
    { applicationId: appId, userId: ids.seller, decision: 'approve', notes: 'Isolated test only' }, 200,
    'owner approves seller');
  assert.equal(approved.sellerStatus, 'approved');
  const changed = await db.prepare('SELECT role,suspended FROM cnc_auth_users WHERE id=?').bind(ids.seller).first();
  assert.equal(changed.role, 'seller');
  assert.equal(changed.suspended, 0);
  await expectStatus('/api/auth/me', ids.seller, 'GET', undefined, 401, 'approval revokes old session');
  await userReLogin(ids.seller);
  async function userReLogin(id) {
    const token = createHash('sha256').update(id + ':' + runId + ':new-session').digest('hex');
    tokens[id] = token;
    await db.prepare('INSERT INTO cnc_auth_sessions (hash,user_id,expires,mfa) VALUES (?,?,?,0)')
      .bind(digest(token), id, Date.now() + 3600_000).run();
  }
  await expectStatus('/api/seller/store', ids.seller, 'POST',
    { name: 'Temporary E2E Seller Shop', description: 'Temporary test catalog', category: 'electronics', location: 'Lagos' },
    200, 'approved seller creates storefront');
  const publicStore = await db.prepare('SELECT name,verified,suspended FROM stores WHERE id=?').bind(ids.seller).first();
  assert.equal(publicStore.name, 'Temporary E2E Seller Shop');
  assert.equal(publicStore.verified, 1);
  record('approved seller storefront synchronises to public catalog', { database: true });

  const productId = '00000000-0000-4000-a000-' + 'a'.repeat(12);
  await expectStatus('/api/seller/products', ids.seller, 'POST',
    { action: 'create', id: productId, name: 'Temporary Test USB Cable', priceMinor: 150000,
      stock: 5, category: 'electronics', description: 'Temporary isolated test product' },
    200, 'seller creates private draft product');
  let products = await call('/api/seller/products', ids.seller);
  let product = products.data.items.find(x => x.id === productId);
  assert.equal(product.publication, 'draft');
  await expectStatus('/api/seller/products', ids.seller, 'POST',
    { action: 'submit', id: productId, revision: product.revision },
    200, 'seller submits product for moderation');
  const mod = await expectStatus('/api/admin/moderation', ids.owner, 'GET', undefined, 200, 'owner sees pending product');
  assert.ok(mod.products.some(x => x.id === productId));
  product = mod.products.find(x => x.id === productId);
  await expectStatus('/api/admin/moderation', ids.owner, 'POST',
    { id: productId, revision: product.revision, decision: 'approve' },
    200, 'owner approves product');
  const browse = await expectStatus('/api/products', ids.buyerA, 'GET', undefined, 200, 'buyer can search published public catalog');
  assert.ok(browse.products.some(p => p.id === productId), 'Published product must be visible to buyer');
  record('public product catalog matches owner-approved product', { id: productId });

  for (const buyer of [ids.buyerA, ids.buyerB, ids.seller]) {
    await expectStatus('/api/v1/addresses', buyer, 'POST',
      { recipient: 'Temporary Test Recipient', line: 'Private Test Lane 1', city: 'Ikeja', state: 'Lagos' },
      201, 'test account saves a delivery address');
  }
  const sellerAddr = await call('/api/v1/addresses', ids.seller);
  assert.ok(sellerAddr.data.addresses?.[0]?.id, 'Seller address must persist for role-guard regression');
  await expectStatus('/api/cart', ids.seller, 'POST',
    { id: productId, quantity: 1, source: 'replacement' },
    200, 'seller cart can save product without permission to place buyer order');
  const sellerBefore = await db.prepare('SELECT COUNT(*) AS n FROM cnc_orders WHERE buyer=?').bind(ids.seller).first();
  assert.equal(sellerBefore.n, 0);
  const sellerCheckout = await call('/api/checkout', ids.seller, 'POST',
    { request_id: 'seller_checkout_must_block_20261118', address_id: sellerAddr.data.addresses[0].id });
  // EXPECTED REPRO FAILURE against v58: backend allows seller to create buyer order.
  assert.equal(sellerCheckout.status, 403,
    'P0 seller/buyer permission bug: sellers must not create buyer orders via /api/checkout; got ' + sellerCheckout.status);
  const sellerAfter = await db.prepare('SELECT COUNT(*) AS n FROM cnc_orders WHERE buyer=?').bind(ids.seller).first();
  assert.equal(sellerAfter.n, 0);
  record('buyer-only order creation enforced server-side', { http: sellerCheckout.status });

  const buyerAddr = await call('/api/v1/addresses', ids.buyerA);
  assert.ok(buyerAddr.data.addresses?.[0]?.id);
  await expectStatus('/api/cart', ids.buyerA, 'POST',
    { id: productId, quantity: 2, source: 'replacement' },
    200, 'buyer adds approved product to persisted cart');
  const requestId = 'isolated_checkout_20261118_abcdef';
  const purchase = await expectStatus('/api/checkout', ids.buyerA, 'POST',
    { request_id: requestId, address_id: buyerAddr.data.addresses[0].id },
    200, 'buyer creates unpaid stock-reserved order');
  assert.ok(purchase.order.id);
  const same = await call('/api/checkout', ids.buyerA, 'POST',
    { request_id: requestId, address_id: buyerAddr.data.addresses[0].id });
  assert.equal(same.status, 200);
  assert.equal(same.data.order.id, purchase.order.id);
  const count = await db.prepare('SELECT COUNT(*) AS n FROM cnc_orders WHERE buyer=?').bind(ids.buyerA).first();
  assert.equal(count.n, 1);
  const productStock = await db.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(productId).first();
  assert.equal(productStock.stock, 3);
  record('checkout idempotency and single stock reservation in D1', { orders: count.n, remainingStock: productStock.stock });
  await expectStatus('/api/orders/cancel', ids.buyerB, 'POST',
    { id: purchase.order.id }, 409, 'different buyer cannot cancel another buyer order');
  await expectStatus('/api/payments/initialize?order_id=' + purchase.order.id, ids.buyerA, 'POST',
    {}, 503, 'Flutterwave payment remains disabled in isolated tests');
  await expectStatus('/api/orders/cancel', ids.buyerA, 'POST',
    { id: purchase.order.id }, 200, 'buyer cancels unpaid reservation');
  const restored = await db.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(productId).first();
  assert.equal(restored.stock, 5, 'Cancelled unpaid reservation returns stock exactly once');
  const integrity = await db.prepare('PRAGMA quick_check').first();
  assert.equal(integrity.quick_check, 'ok');
  record('cancelled order restores stock and database integrity', { stock: restored.stock });

  const summary = await call('/api/orders', ids.buyerA);
  assert.equal(summary.status, 200);
  assert.equal(summary.data.orders.length, 1);
  assert.equal(summary.data.orders[0].status, 'cancelled');
  record('buyer order history reflects persisted cancellation', { orderCount: summary.data.orders.length });

  const auction = await expectStatus('/api/auctions', ids.seller, 'POST',
    { productId, startingBidKobo: 10000, durationMinutes: 60 },
    201, 'approved seller creates auction with atomic stock reservation');
  const auctionId = auction.auctionId;
  const afterAuction = await db.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(productId).first();
  assert.equal(afterAuction.stock, 4);
  await expectStatus('/api/auctions', ids.buyerA, 'PATCH',
    { action: 'bid', id: auctionId, amountKobo: 15000 }, 200, 'buyer A submits valid bid');
  await expectStatus('/api/auctions', ids.buyerB, 'PATCH',
    { action: 'bid', id: auctionId, amountKobo: 18000 }, 200, 'buyer B outbids buyer A');
  await expectStatus('/api/auctions', ids.buyerA, 'PATCH',
    { action: 'bid', id: auctionId, amountKobo: 17000 }, 409, 'stale losing bid rejected');
  await expectStatus('/api/auctions', ids.owner, 'PATCH',
    { action: 'close', id: auctionId }, 200, 'owner closes auction without bypassing buyer permissions');
  const winner = await db.prepare('SELECT winner_id,current_bid_kobo,closed_at FROM cnc_auctions WHERE id=?').bind(auctionId).first();
  assert.equal(winner.winner_id, ids.buyerB);
  assert.equal(winner.current_bid_kobo, 18000);
  assert.ok(winner.closed_at);
  record('auction winner is higher bidder; winner is persisted in D1', { amountKobo: winner.current_bid_kobo });
  await expectStatus('/api/auctions', ids.buyerB, 'PATCH',
    { action: 'checkout', id: auctionId }, 503,
    'winning-auction checkout remains fail-closed until verified payment settlement exists');
  result = { status: 'PASSED', cases: evidence.length, steps: evidence, remoteStagingWrites: 0,
    providerPaymentsTested: false, realStreamingTested: false, authenticatedAccessTests: false };
} catch(error) {
  result = { ...result, status: 'FAILED', cases: evidence.length, steps: evidence, error: String(error),
    remoteStagingWrites: 0 };
  console.error('FAIL: ' + String(error));
  process.exitCode = 1;
} finally {
  const output = 'reports/v58-isolated-marketplace-e2e.json';
  fs.mkdirSync(path.dirname(output), {recursive:true});
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  console.log('Evidence written to ' + output + ' (no remote D1/account changes)');
  await mf.dispose();
}
