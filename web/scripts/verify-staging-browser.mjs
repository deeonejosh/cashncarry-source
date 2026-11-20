import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Miniflare } from 'miniflare';
import { chromium } from 'playwright-core';

// Respect Playwright's browser installation on GitHub-hosted runners.
const CHROME_PATH = process.env.CNC_TEST_CHROMIUM || chromium.executablePath();
const CHECK_PRODUCT_LINK_BASELINE = process.env.CNC_TEST_PRODUCT_LINK_BASELINE === '1';

const DIST_DIR = path.resolve('dist');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

function serveDistAsset(request) {
  const url = new URL(request.url);
  let rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  let target = path.join(DIST_DIR, rel);
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    // Match Wrangler assets.not_found_handling = "single-page-application"
    target = path.join(DIST_DIR, 'index.html');
    rel = 'index.html';
  }
  const ext = path.extname(rel).toLowerCase();
  return new Response(fs.readFileSync(target), {
    status: 200,
    headers: { 'content-type': MIME_TYPES[ext] || 'application/octet-stream' },
  });
}

async function execMigrationSql(db, sql) {
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

const browserPort = 18799;
const workerOrigin = `https://127.0.0.1:${browserPort}`;

const mf = new Miniflare({
  https: true,
  host: '127.0.0.1',
  port: browserPort,
  modules: true,
  scriptPath: 'worker-dist/_worker.js',
  compatibilityDate: '2026-08-06',
  compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['AUTH_DB', 'DB'],
  bindings: {
    AUTH_ORIGIN: workerOrigin,
    PAYMENTS_ENABLED: 'false',
    COINS_PURCHASES_ENABLED: 'false',
    KYC_UPLOADS_ENABLED: 'false',
    FLW_MODE: 'disabled',
    FLW_WEBHOOK_SIGNATURE: 'hmac-sha256',
    ORDER_RESERVATIONS: 'enabled',
  },
  serviceBindings: {
    ASSETS: serveDistAsset,
  },
});

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox'],
});

try {
  // Seed both D1 bindings identically to cashncarry-d1-staging
  const migrationsDir = path.resolve('deploy/chatgpt-sites/migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const binding of ['AUTH_DB', 'DB']) {
    const db = await mf.getD1Database(binding);
    for (const file of files) {
      await execMigrationSql(db, fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
    }
  }

  const origin = (await mf.ready).origin.replace(/\/$/, '');

  // Check API health first
  const healthRes = await mf.dispatchFetch(origin + '/api/health');
  const healthData = await healthRes.json();
  assert.equal(healthData.ok, true);
  assert.equal(healthData.dbConnected, true);
  assert.equal(healthData.staging.paymentsEnabled, false);
  assert.equal(healthData.staging.coinsPurchasesEnabled, false);
  assert.equal(healthData.staging.kycUploadsEnabled, false);

  const liveLinkContext = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const page = await liveLinkContext.newPage();
    const sharedRoom = 'shared-room-regression';
    await page.goto(`${origin}/?tab=live&room=${sharedRoom}`, { waitUntil: 'networkidle' });
    await page.locator('main[data-cnc-route="live"]').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('room'), sharedRoom);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(new URL(page.url()).searchParams.get('room'), sharedRoom);
    console.log('PASS: shared livestream room remains in the URL after initialization and reload');
  } finally {
    await liveLinkContext.close();
  }

  const tabsToVerify = [
    { tab: 'home', text: 'Cash N Carry' },
    { tab: 'shop', text: 'Shop' },
    { tab: 'orders', text: 'Account Sign In Required' },
    { tab: 'coins', text: 'Coin purchases are currently unavailable' },
    { tab: 'auctions', text: 'Auctions' },
    { tab: 'live', text: 'No live streams' },
    { tab: 'seller-kyc', text: 'Account Sign In Required' },
    { tab: 'seller-settlements', text: 'Sign In Required' },
    { tab: 'admin-dashboard', text: 'Administrator Access Required' },
  ];

  // Exhaustive anonymous route smoke; auth-only pages must fail closed, not crash.
  // These checks do not replace authenticated click-through tests.
  const allCustomerTabs = [
    'home', 'shop', 'for-you', 'product-detail', 'checkout',
    'checkout-complete', 'orders', 'profile', 'live', 'auctions',
    'coins', 'flash-deals', 'wishlist', 'shipments', 'messages',
    'notifications', 'returns', 'seller-dashboard', 'seller-products',
    'seller-orders', 'seller-kyc', 'seller-settlements',
    'admin-dashboard', 'email-marketing', 'storefront', 'policies'
  ];
  const FORBIDDEN_CUSTOMER_UI = [
    'V17 Staging ZIP', 'QA Suite', 'Export ZIP', 'Chidi Okafor',
    'Run Automated Staging Diagnostic',
  ];

  const screenshotDir = path.resolve(process.env.CNC_TEST_SCREENSHOTS || 'reports/uiux/screenshots');
  fs.mkdirSync(screenshotDir, {recursive:true});
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of CHECK_PRODUCT_LINK_BASELINE ? [] : viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const forbiddenResourceResponses = [];
    page.on('response', (response) => {
      // Guest sessions deliberately receive 401 on protected API endpoints.
      // 401 on static assets or unknown origins remains a release failure.
      if (response.status() === 401) {
        const route = new URL(response.url()).pathname;
        if (!route.startsWith('/api/')) forbiddenResourceResponses.push(response.url());
      }
    });
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const message = msg.text();
      if (/^Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/.test(message)) {
        return; // Checked separately above by URL and status.
      }
      consoleErrors.push(message);
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    for (const entry of tabsToVerify) {
      const targetUrl = entry.tab === 'home' ? origin + '/' : `${origin}/?tab=${entry.tab}`;
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);

      const bodyText = await page.locator('body').innerText();
      assert.ok(
        bodyText.includes(entry.text),
        `[${vp.name}] Expected "${entry.text}" on tab=${entry.tab}`
      );

      const overflowCheck = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      assert.ok(
        overflowCheck.scrollWidth <= overflowCheck.innerWidth + 1,
        `[${vp.name}] Horizontal overflow on tab=${entry.tab}: ${overflowCheck.scrollWidth} > ${overflowCheck.innerWidth}`
      );

      if (entry.tab === 'coins') {
        const coinBtn = page.getByRole('button', { name: 'Coin Purchases Disabled' });
        assert.equal(await coinBtn.isDisabled(), true, `[${vp.name}] Coin Purchases button must be disabled`);
      }
      if (entry.tab === 'seller-kyc' || entry.tab === 'seller-settlements') {
        const restricted = page.locator('body');
        assert.match(
          await restricted.innerText(),
          /Sign In Required|Account Sign In Required/,
          `[${vp.name}] Anonymous sellers must not access KYC or settlements`
        );
      }
      if (entry.tab === 'shop') {
        assert.equal((await page.locator('main[data-cnc-route="shop"] h1').innerText()).trim(), 'Shop',
          `[${vp.name}] Shop heading should match the simplified route`);
      }
      if (entry.tab === 'admin-dashboard') {
        assert.ok(bodyText.includes('Administrator Access Required'), 'Admin route should reject anonymous users');
      }
    }

    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    const logos = page.locator('header img[alt="Cash N Carry Nigeria"], footer img[alt="Cash N Carry Nigeria"]');
    assert.equal(await logos.count(), 2, 'Expected header and footer branding');
    assert.ok(await logos.evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
      `[${vp.name}] Both brand logos must render`);

    const cartButton = page.getByRole('button', { name: /^Cart(?: 0)?$/ });
    await cartButton.click();
    const drawer = page.getByRole('dialog', { name: /^Your Cart/ });
    const closeCart = drawer.getByRole('button', { name: 'Close cart' });
    await closeCart.waitFor();
    assert.ok(await closeCart.evaluate((button) => document.activeElement === button));
    await closeCart.press('Escape');
    await drawer.waitFor({ state: 'hidden' });
    assert.ok(await cartButton.evaluate((button) => document.activeElement === button));

    await page.goto(`${origin}/?tab=policies`);
    const policy = page.locator('main[data-cnc-route="policies"]');
    await policy.getByRole('button', { name: 'Privacy & NDPA', exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get('section') === 'privacy');
    await page.reload();
    await policy.getByRole('heading', { name: /Privacy Notice & NDPA/ }).waitFor();
    await policy.getByRole('button', { name: 'Returns & Refunds', exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get('section') === 'returns');
    await page.goBack();
    await policy.getByRole('heading', { name: /Privacy Notice & NDPA/ }).waitFor();

    // Route-by-route smoke across all 26 website tabs on desktop + mobile.
    for (const tab of allCustomerTabs) {
      await page.goto(tab === 'home' ? `${origin}/` : `${origin}/?tab=${tab}`, { waitUntil: 'networkidle' });
      const body = await page.locator('body').innerText();
      assert.ok(body.trim().length > 35, `[${vp.name}] Empty or crashed tab: ${tab}`);
      for (const label of FORBIDDEN_CUSTOMER_UI) {
        assert.equal(body.includes(label), false, `[${vp.name}] Developer UI exposed at ${tab}: ${label}`);
      }
      const {scrollWidth, innerWidth} = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
      }));
      assert.ok(scrollWidth <= innerWidth + 1, `[${vp.name}] Horizontal overflow: ${tab}`);
      await page.screenshot({path:path.join(screenshotDir,`${vp.name}-${tab}.png`),fullPage:false});
      if (tab === 'admin-dashboard' || tab === 'email-marketing') {
        assert.ok(/Access Required|Administrator|Sign In|Access Denied/i.test(body),
          `[${vp.name}] Admin tab not protected: ${tab}`);
      }
    }

    // Guest Sign In remains a normal customer feature after removing the QA bar.
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    const signIn = page.getByRole('button', {name: /^Sign In$/i}).first();
    if (await signIn.isVisible()) {
      await signIn.click();
      assert.ok(await page.getByRole('button', {name: /Sign In/i}).count() >= 1,
        `[${vp.name}] Sign-in button failed to open auth interface`);
    }

    // Fresh staging must show genuine empty states. No demo products are seeded.
    await page.goto(`${origin}/?tab=profile`, { waitUntil: 'networkidle' });
    const guestProfile = await page.locator('body').innerText();
    assert.ok(guestProfile.includes('Your Account'), `[${vp.name}] Guest account sign-in panel missing`);
    assert.equal(guestProfile.includes('Guest Shopper'), false, `[${vp.name}] Fake guest profile visible`);
    assert.ok(guestProfile.includes('Sign In / Create Account'), `[${vp.name}] Guest login action missing`);

    await page.goto(`${origin}/?tab=shop`, { waitUntil: 'networkidle' });
    const shopBody = await page.locator('body').innerText();
    assert.ok(/No products|no items|No listings/i.test(shopBody), `[${vp.name}] Expected empty catalog`);

    assert.equal(forbiddenResourceResponses.length, 0, `[${vp.name}] Unexpected anonymous 401s for static resources: ${forbiddenResourceResponses.join('; ')}`);
    assert.equal(pageErrors.length, 0, `[${vp.name}] Uncaught page errors: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `[${vp.name}] Console errors: ${consoleErrors.join('; ')}`);
    console.log(`  ✅ [BROWSER PASS] ${vp.name} (${vp.width}x${vp.height}): route empty states and access guards verified, 0 console/page errors, 0 overflow`);
    await context.close();
  }

  const productContext = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const page = await productContext.newPage();
    const product = { id: 'routing-fixture', name: 'Marketplace routing fixture', price: 1500, stock: 5 };
    if (CHECK_PRODUCT_LINK_BASELINE) {
      await page.route(`${origin}/api/products`, (route) => route.fulfill({ json: { products: [product] } }));
      await page.goto(`${origin}/?tab=product-detail&id=${product.id}`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Product not found', exact: true }).waitFor({ timeout: 5000 });
      assert.equal(new URL(page.url()).searchParams.get('id'), null, 'Baseline must reproduce the dropped ID');
      await page.screenshot({ path: path.join(screenshotDir, 'product-share-link-before.png') });
      console.log('  [BASELINE REPRODUCED] Product share link drops the ID and shows Product not found');
    } else {
      let releaseCatalog;
      const catalogReady = new Promise((resolve) => { releaseCatalog = resolve; });
      await page.route(`${origin}/api/products/${product.id}`, async (route) => {
        await catalogReady;
        await route.fulfill({ json: { product } });
      });

      try {
        await page.goto(`${origin}/?tab=product-detail&id=${product.id}`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('status').filter({ hasText: 'Loading product' }).waitFor({ timeout: 5000 });
        assert.equal(new URL(page.url()).searchParams.get('id'), product.id, 'Product ID must survive catalog loading');
      } finally {
        releaseCatalog();
      }
      const productHeading = page.getByRole('heading', { name: product.name, exact: true });
      await productHeading.waitFor();
      await page.getByRole('button', { name: 'Increase quantity' }).click();
      await page.getByRole('button', { name: 'Decrease quantity' }).click();
      await page.screenshot({ path: path.join(screenshotDir, 'product-share-link-after.png') });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await productHeading.waitFor();
      await page.getByRole('button', { name: 'Back to products' }).click();
      await page.getByRole('heading', { name: 'Shop', exact: true, level: 1 }).waitFor();
      await page.goBack();
      await productHeading.waitFor();
      await page.goto(`${origin}/?productId=${product.id}`);
      await productHeading.waitFor();
      console.log('  ✅ [BROWSER PASS] Product outside the first catalogue page loads by share link, reloads, restores on Back, and accepts the legacy productId parameter');
    }
  } finally {
    await productContext.close();
  }

  if (!CHECK_PRODUCT_LINK_BASELINE) {
    const db = await mf.getD1Database('AUTH_DB');
    const seller = 'seller-photo-browser-fixture';
    const token = randomBytes(32).toString('hex');
    await db.batch([
      db.prepare("INSERT INTO cnc_auth_users (id,email,credential,role,verified) VALUES (?,?,'','seller',1)")
        .bind(seller, 'seller-photo@example.invalid'),
      db.prepare("INSERT INTO cnc_seller_applications (id,user_id,business_name,phone,description,status) VALUES (?,?,'QA Store','0000000000','Isolated browser test','approved')")
        .bind(seller, seller),
      db.prepare("INSERT INTO cnc_seller_stores (owner,name,description) VALUES (?,'QA Store','Isolated browser test')")
        .bind(seller),
      db.prepare('INSERT INTO cnc_auth_sessions (hash,user_id,expires,mfa) VALUES (?,?,?,0)')
        .bind(createHash('sha256').update(token).digest('hex'), seller, Date.now() + 600000),
    ]);
    const sellerContext = await browser.newContext({
      viewport: { width: 360, height: 480 },
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: true,
    });
    try {
      await sellerContext.addCookies([{ name: '__Host-cnc_session', value: token, url: origin, secure: true }]);
      const page = await sellerContext.newPage();
      await page.goto(`${origin}/?tab=seller-products`);
      await page.getByRole('button', { name: 'Add New Product' }).click();
      const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Save Product Draft' }) });
      await form.getByPlaceholder('Enter exact product title').fill('QA Product with device photo');
      await form.getByRole('spinbutton').first().fill('1200.25');
      await form.getByPlaceholder('Detailed specifications, size, condition...').fill('Isolated browser test');
      const picture = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 40;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'green';
        ctx.fillRect(0, 0, 40, 40);
        return canvas.toDataURL('image/png').split(',')[1];
      });
      const file = { name: 'product.png', mimeType: 'image/png', buffer: Buffer.from(picture, 'base64') };
      await form.getByLabel('Upload a photo').setInputFiles(file);
      const preview = form.getByRole('img', { name: 'Uploaded product photo' });
      await preview.waitFor({ timeout: 5000 });
      assert.equal(await preview.evaluate((image) => image.decode().then(() => image.naturalWidth)), 40);
      const response = page.waitForResponse((res) => new URL(res.url()).pathname === '/api/seller/products' && res.request().method() === 'POST');
      await form.getByRole('button', { name: 'Save Product Draft' }).click();
      const saved = await response;
      assert.equal(saved.status(), 200, await saved.text());
      const row = page.getByRole('row').filter({ hasText: 'QA Product with device photo' });
      await row.getByRole('button', { name: 'Edit product' }).click();
      const update = page.getByRole('button', { name: 'Save Changes' });
      await update.scrollIntoViewIfNeeded();
      const box = await update.boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= 480, 'Save Changes must be reachable on a short mobile screen');
      await update.click();
      await update.waitFor({ state: 'hidden' });
      await row.getByRole('button', { name: 'Submit for review' }).click();
      await row.getByText('In Moderation').waitFor();
      await page.reload();
      await row.getByText('In Moderation').waitFor();
      const photo = row.getByRole('img', { name: 'QA Product with device photo' });
      assert.equal(await photo.evaluate((image) => image.decode().then(() => image.naturalWidth)), 40);
      const persisted = await db.prepare('SELECT price_minor, image, publication FROM cnc_seller_products WHERE owner=?').bind(seller).first();
      assert.equal(persisted.price_minor, 120025);
      assert.equal(persisted.publication, 'pending');
      assert.match(persisted.image, /\/media\/product-photos\//);
      assert.equal((await mf.dispatchFetch(persisted.image)).status, 404, 'Pending photo must remain private');
      console.log('  ✅ [BROWSER PASS] Seller uploads a device photo, saves, edits and submits on mobile; price and photo survive reload');
    } finally {
      await sellerContext.close();
    }
  }
} finally {
  await browser.close();
  await mf.dispose();
}
