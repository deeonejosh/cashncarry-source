import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const chrome = [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(existsSync);
if (!chrome) throw new Error('Chromium is required for mobile studio visual QA');

const server = spawn('npm',['run','dev','--','--host','127.0.0.1'],{stdio:'ignore'});
let browser;
const root='http://127.0.0.1:3000/scripts/fixtures/seller-empty-fixture.html';
try {
  let ready=false;
  for(let i=0;i<55;i++){
    try {if((await fetch(root)).ok){ready=true;break;}}catch{ /* Vite boot */ }
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(!ready)throw new Error('Vite seller studio fixture never started');
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
  const errors=[];
  const seller=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  seller.on('pageerror',error=>errors.push(error.message));
  await seller.goto(root+'?seller=1');
  await seller.getByRole('region',{name:'Livestream studio'}).waitFor({timeout:12000});
  await seller.getByRole('heading',{name:'The live stage is ready'}).waitFor();
  await seller.getByRole('button',{name:'Set up live room'}).waitFor();
  await seller.getByText('Cloudflare Stream is available for authorised sellers.').waitFor();
  const hologram=await seller.locator('.cnc-live-empty-hologram').evaluate(el=>({
    width:el.getBoundingClientRect().width,
    height:el.getBoundingClientRect().height,
    border:getComputedStyle(el).borderWidth,
    anim:getComputedStyle(el).animationName,
  }));
  assert(hologram.width>80&&hologram.height>80&&hologram.anim.includes('cnc-neon-hologram'),
    '3D animated hologram stage CSS must load');
  const bounding=await seller.evaluate(()=>({viewport:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(bounding.scroll<=bounding.viewport+3,'Seller studio has horizontal overflow: '+JSON.stringify(bounding));
  mkdirSync('seller-live-redesign-qa',{recursive:true});
  await seller.screenshot({path:'seller-live-redesign-qa/seller-empty-390.png',fullPage:true});
  await seller.getByRole('button',{name:'Set up live room'}).click();
  await seller.getByRole('status',{name:'',exact:false}).getByText('Setup opened').waitFor();
  assert.deepEqual(await seller.evaluate(()=>window.__cncEmptyQaActions),['setup']);

  const buyer=await browser.newPage({viewport:{width:360,height:740},deviceScaleFactor:1});
  buyer.on('pageerror',e=>errors.push(e.message));
  await buyer.goto(root+'?seller=0');
  await buyer.getByRole('region',{name:'Livestream studio'}).waitFor({timeout:12000});
  assert.equal(await buyer.getByRole('button',{name:'Set up live room'}).count(),0,'Buyers cannot start a seller broadcast');
  await buyer.screenshot({path:'seller-live-redesign-qa/buyer-empty-360.png',fullPage:true});
  await buyer.getByRole('button',{name:'Return to shop'}).click();
  await buyer.getByRole('status').getByText('Exited studio').waitFor();
  assert.deepEqual(errors,[],'No browser errors expected');
  console.log('PASS: Seller/buyer empty livestream screen, animated 3D glass stage, CTA, responsive 390/360, no browser errors');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
