import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const candidates = [
  process.env.CHROME_BIN, '/usr/bin/google-chrome',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = candidates.find(path => existsSync(path));
if (!executablePath) throw new Error('Chrome or Chromium required for mobile livestream UI QA');

const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], { stdio: 'ignore' });
let browser;
const base = 'http://127.0.0.1:3000/scripts/fixtures/mobile-live-fixture.html';
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { const r = await fetch(base); if (r.ok) { ready = true; break; } }
    catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  if (!ready) throw new Error('Vite did not serve the mobile livestream QA fixture');
  browser = await chromium.launch({ executablePath, headless: true, args:['--no-sandbox'] });

  const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(base + '?role=buyer');
  await page.getByRole('region', {name:'Mobile livestream shopping room'}).waitFor({timeout:15000});
  assert.equal(await page.getByText('Gaming Accessories Deals').count(), 1);
  assert.equal(await page.getByText('Video broadcasting is not configured').count(), 1);
  assert.equal(await page.getByRole('button',{name:'Buy now'}).count(), 1);
  await page.getByRole('button',{name:'Buy now'}).click();
  assert.deepEqual(await page.evaluate(() => window.__cncLiveQaActions),['buy']);

  await page.getByRole('button',{name:'View products'}).click();
  await page.getByRole('dialog',{name:'Shop live products'}).waitFor();
  assert(await page.getByText('RGB Wireless Gaming Controller').count() >= 1);
  await page.getByRole('button',{name:'Add RGB Wireless Gaming Controller to cart'}).click();
  await page.getByRole('button',{name:'Close'}).click();
  assert((await page.evaluate(() => window.__cncLiveQaActions)).includes('cart'));

  await page.getByRole('button',{name:'Like this room'}).click();
  await page.getByRole('textbox',{name:'Live comment'}).fill('Looks excellent!');
  await page.getByRole('button',{name:'Send live comment'}).click();
  await page.getByText('Looks excellent!').waitFor();
  await page.getByRole('button',{name:'Send a gift'}).click();
  assert((await page.evaluate(() => window.__cncLiveQaActions)).includes('gift'));
  const dimensions=await page.evaluate(() => ({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
  assert(dimensions.scroll <= dimensions.width+3, JSON.stringify(dimensions));
  mkdirSync('mobile-live-qa-artifacts',{recursive:true});
  await page.screenshot({path:'mobile-live-qa-artifacts/buyer-mobile-390.png',fullPage:true});

  const seller=await browser.newPage({viewport:{width:360,height:740},deviceScaleFactor:1});
  seller.on('pageerror',err=>errors.push(err.message));
  await seller.goto(base + '?role=seller');
  await seller.getByRole('region',{name:'Mobile livestream shopping room'}).waitFor({timeout:15000});
  await seller.getByRole('button',{name:'Pin a published product'}).click();
  assert((await seller.evaluate(() => window.__cncLiveQaActions)).includes('pin'));
  await seller.getByRole('button',{name:'End live room'}).click();
  await seller.getByRole('alertdialog',{name:'Confirm end live room'}).waitFor();
  await seller.getByRole('button',{name:'Keep room open'}).click();
  await seller.getByRole('button',{name:'End live room'}).click();
  await seller.getByRole('button',{name:'End live room',exact:true}).last().click();
  await seller.getByRole('status').getByText('Room closed for QA').waitFor();
  await seller.screenshot({path:'mobile-live-qa-artifacts/seller-mobile-360.png',fullPage:true});
  assert.deepEqual(errors,[], 'Mobile buyer/seller frontend must have no browser errors');
  console.log('PASS: mobile 3D glass livestream UI, chat, cart, buy, gifts, seller pin/confirmation, viewport and browser errors');
} finally {
  await browser?.close();
  child.kill('SIGTERM');
}
