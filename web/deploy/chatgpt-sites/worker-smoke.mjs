import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';

const worker = new Miniflare({
  modules: true,
  scriptPath: 'dist/_worker.js',
  compatibilityDate: '2026-08-06',
  d1Databases: ['DB'],
  serviceBindings: {
    ASSETS: async request => {
      const path = new URL(request.url).pathname;
      if (!['/brand/logo.png', '/brand/icon.png', '/manifest.webmanifest'].includes(path)) return new Response(null, { status: 404 });
      return new Response(await readFile('public' + path), { headers: {
        'content-type': path.endsWith('.png') ? 'image/png' : 'application/manifest+json',
      } });
    },
  },
});

try {
  const base = 'http://localhost';
  assert.equal((await worker.dispatchFetch(base + '/api/categories')).status, 503);
  const db = await worker.getD1Database('DB');
  // Synthetic fixture with the verified column names. Production constraints are unknown.
  await db.exec('CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT, active INTEGER)');
  await db.batch([
    db.prepare('INSERT INTO categories VALUES (?, ?, ?)').bind('1', '100% Cotton', 1),
    db.prepare('INSERT INTO categories VALUES (?, ?, ?)').bind('2', '100x Cotton', 1),
    db.prepare('INSERT INTO categories VALUES (?, ?, ?)').bind('3', 'Hidden', 0),
  ]);
  const response = await worker.dispatchFetch(base + '/api/categories');
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).categories.map(({ id }) => id), ['1', '2']);
  const search = await worker.dispatchFetch(base + '/api/categories?q=%25');
  assert.deepEqual((await search.json()).categories.map(({ id }) => id), ['1']);
  const literal = await worker.dispatchFetch(base + '/api/categories?q=' + encodeURIComponent("' OR 1=1 --"));
  assert.deepEqual((await literal.json()).categories, []);
  assert.equal((await worker.dispatchFetch(base + '/api/categories?q=' + 'x'.repeat(101))).status, 400);
  assert.equal((await worker.dispatchFetch(base + '/api/categories', { method: 'POST' })).status, 405);
  assert.equal((await worker.dispatchFetch(base + '/api/coins')).status, 503);
  await db.exec("CREATE TABLE stores (id TEXT PRIMARY KEY, name TEXT, description TEXT, category TEXT, location TEXT, verified INTEGER, suspended INTEGER, phone TEXT); CREATE TABLE products (id TEXT PRIMARY KEY, store TEXT, name TEXT, description TEXT, category TEXT, price INTEGER, stock INTEGER, image TEXT, featured INTEGER, active INTEGER)");
  await db.exec("INSERT INTO stores VALUES ('s1','Visible','Description','1','Lagos',1,0,'private'),('s2','Suspended','','1','Lagos',1,1,'private'); INSERT INTO products VALUES ('p1','s1','Cotton','Description','1',100,2,'/image',1,1),('p2','s2','Hidden','','1',100,3,'',0,1),('p3','s1','Inactive','','2',100,4,'',0,0)");
  assert.deepEqual((await (await worker.dispatchFetch(base + '/api/products?q=Cotton&store=s1&category=1')).json()).products.map(p => p.id), ['p1']);
  assert.deepEqual((await (await worker.dispatchFetch(base + '/api/products?offset=1')).json()).products, []);
  assert.equal((await (await worker.dispatchFetch(base + '/api/products/p1')).json()).product.stock, 2);
  assert.equal((await worker.dispatchFetch(base + '/api/products/p2')).status, 404);
  assert.equal((await worker.dispatchFetch(base + '/api/products/p3')).status, 404);
  const listed = await (await worker.dispatchFetch(base + '/api/storefronts')).json();
  assert.deepEqual(listed.storefronts.map(x => x.id), ['s1']);
  assert.equal('phone' in listed.storefronts[0], false);
  assert.equal((await worker.dispatchFetch(base + '/api/storefronts/s2')).status, 404);
  const { storefront } = await (await worker.dispatchFetch(base + '/api/storefronts/s1')).json();
  assert.equal(storefront.name, 'Visible');
  assert.equal('phone' in storefront, false);
  const shopPage = await worker.dispatchFetch(base + '/shop?q=Cotton&category=1');
  assert.equal(shopPage.status, 200);
  assert.match(await shopPage.text(), /href="\/products\/p1"/);
  const detailPage = await worker.dispatchFetch(base + '/products/p1');
  assert.match(await detailPage.text(), /<h1>Cotton<\/h1>[\s\S]*In stock[\s\S]*href="\/sellers\/s1"/);
  assert.match(await (await worker.dispatchFetch(base + '/sellers/s1')).text(), /Verified seller[\s\S]*Cotton/);
  assert.equal((await worker.dispatchFetch(base + '/sellers/s2')).status, 404);
  assert.equal((await worker.dispatchFetch(base + '/shop?offset=-1')).status, 400);
  assert.equal((await worker.dispatchFetch(base + '/products/%FF')).status, 400);
  assert.equal((await worker.dispatchFetch(base + '/brand/logo.png')).headers.get('content-type'), 'image/png');
  assert.equal((await worker.dispatchFetch(base + '/api/seller/products', { method: 'POST' })).status, 503);
  const home = await worker.dispatchFetch(base + '/');
  assert.equal(home.status, 200);
  const homepage = await home.text();
  assert.match(homepage, /href="\/shop\?category=1">100% Cotton/);
  assert.match(homepage, /href="\/products\/p1">Cotton/);
  assert.doesNotMatch(homepage, /Suspended|Inactive|Studio wireless headphones/);
  assert.equal((await worker.dispatchFetch(base + '/profile', { headers: { Cookie: 'fake=session' } })).status, 503);
  assert.equal((await worker.dispatchFetch(base + '/admin')).status, 503);
  assert.equal((await worker.dispatchFetch(base + '/api/auth/login', { method: 'POST' })).status, 503);
  assert.equal((await worker.dispatchFetch(base + '/brand/icon.png')).headers.get('content-type'), 'image/png');
  assert.equal((await (await worker.dispatchFetch(base + '/manifest.webmanifest')).json()).start_url, '/');
  for (const [route, title] of [
    ['/account', 'My account'], ['/sign-in', 'Sign in'], ['/register', 'Create an account'],
    ['/seller/dashboard', 'Seller Centre'], ['/seller/products', 'Manage products'], ['/admin', 'Admin Console'],
  ]) {
    const response = await worker.dispatchFetch(base + route, { headers: {
      'oai-authenticated-user-id': 'synthetic-visitor',
      'oai-authenticated-user-email': 'synthetic@example.invalid',
      Cookie: 'session=synthetic',
    } });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const html = await response.text();
    assert.ok(html.includes('<h1>' + title + '</h1>'));
    assert.doesNotMatch(html, /synthetic|<form/);
  }
  assert.equal((await worker.dispatchFetch(base + '/api/account/orders')).status, 503);
  assert.equal((await worker.dispatchFetch(base + '/api/auth/link', { method: 'POST' })).status, 503);
  if (process.env.CNC_TEST_CHROMIUM) {
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath: process.env.CNC_TEST_CHROMIUM, headless: true, args: ['--no-sandbox'] });
    try {
      const origin = (await worker.ready).origin;
      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        const page = await browser.newPage({ viewport });
        try {
          await page.goto(origin + '/');
          await page.getByRole('link', { name: 'My account' }).click();
          assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'My account');
          await page.getByRole('link', { name: 'Seller Centre' }).click();
          assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Seller Centre');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.goto(origin + '/');
          await page.getByRole('link', { name: '100% Cotton' }).click();
          assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Discover all the best deals');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.getByLabel('Search products').fill('Cotton');
          await page.getByRole('button', { name: 'Search' }).click();
          await page.getByRole('link', { name: 'Cotton', exact: true }).click();
          assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Cotton');
          await page.getByRole('link', { name: 'Visit storefront' }).click();
          await page.reload();
          assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Visible');
        } finally {
          await page.close();
        }
      }
      console.log('Desktop and mobile catalog browser flows passed');
    } finally {
      await browser.close();
    }
  }
  await db.prepare('UPDATE products SET name = ? WHERE id = ?').bind('<script>bad()</script>', 'p1').run();
  assert.match(await (await worker.dispatchFetch(base + '/products/p1')).text(), /&lt;script&gt;bad/);
  console.log('60 local Worker/D1 assertions passed');
} finally {
  await worker.dispose();
}
