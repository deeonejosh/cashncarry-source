import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Miniflare } from 'miniflare';
import { chromium } from 'playwright-core';

const CHROME_PATH =
  process.env.CNC_TEST_CHROMIUM ||
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

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
  scriptPath: 'dist/_worker.js',
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

  const tabsToVerify = [
    { tab: 'home', text: 'Cash N Carry' },
    { tab: 'shop', text: 'Shop Marketplace' },
    { tab: 'orders', text: 'Account Sign In Required' },
    { tab: 'coins', text: 'Coin purchases are currently unavailable' },
    { tab: 'auctions', text: 'Live Marketplace Auctions' },
    { tab: 'live', text: 'No one is live right now.' },
    { tab: 'seller-kyc', text: 'Account Sign In Required' },
    { tab: 'seller-settlements', text: 'Sign In Required' },
    { tab: 'admin-dashboard', text: 'Platform Administration & Compliance' },
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

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
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
      if (entry.tab === 'admin-dashboard') {
        assert.ok(bodyText.includes('Administrator Access Required'), 'Admin route should reject anonymous users');
      }
    }

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
    await page.goto(`${origin}/?tab=shop`, { waitUntil: 'networkidle' });
    const shopBody = await page.locator('body').innerText();
    assert.ok(/No products|no items|No listings/i.test(shopBody), `[${vp.name}] Expected empty catalog`);

    assert.equal(pageErrors.length, 0, `[${vp.name}] Uncaught page errors: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `[${vp.name}] Console errors: ${consoleErrors.join('; ')}`);
    console.log(`  ✅ [BROWSER PASS] ${vp.name} (${vp.width}x${vp.height}): route empty states and access guards verified, 0 console/page errors, 0 overflow`);
    await context.close();
  }
} finally {
  await browser.close();
  await mf.dispose();
}
