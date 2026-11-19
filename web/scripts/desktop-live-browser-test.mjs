import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import{spawn}from'node:child_process';
import{chromium}from'playwright-core';

const path=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>p&&existsSync(p));
if(!path)throw Error('Chromium is required for desktop visual QA.');
const child=spawn('npm',['run','dev','--','--host','127.0.0.1'],{stdio:'ignore'});
let browser;
try {
 const base='http://127.0.0.1:3000/scripts/fixtures/desktop-live-fixture.html';
 let ready=false;
 for(let i=0;i<50;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw Error('Vite did not start');
 browser=await chromium.launch({executablePath:path,headless:true,args:['--no-sandbox']});
 const errs=[];
 mkdirSync('desktop-live-qa-artifacts',{recursive:true});
 for(const ended of [false,true]){
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('pageerror',e=>errs.push(e.message));
  await page.goto(base+(ended?'?ended=1':''));
  await page.getByRole('region',{name:'Desktop livestream studio'}).waitFor();
  await page.getByRole('heading',{name:ended?'Livestream Ended':'The live stage is ready'}).waitFor();
  await page.getByText('Cloudflare Stream is configured. Camera broadcast begins when you start a room.').waitFor();
  const stats=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth,stage:getComputedStyle(document.querySelector('.cnc-desktop-live-empty')).display}));
  assert(stats.sw<=stats.vw+2,JSON.stringify(stats));
  assert.notEqual(stats.stage,'none');
  await page.screenshot({path:'desktop-live-qa-artifacts/'+(ended?'desktop-ended-1440':'desktop-ready-1440')+'.png',fullPage:true});
  await page.getByRole('button',{name:ended?'Go Live Again':'Set Up Live Room'}).click();
  await page.getByRole('status').getByText('Action: start').waitFor();
  await page.getByRole('button',{name:'Return to Seller Centre'}).click();
  await page.getByRole('status').getByText('Action: seller').waitFor();
  await page.close();
 }
 assert.deepEqual(errs,[]);
 console.log('PASS: desktop seller live ready and ended screens, focusable CTAs, no horizontal overflow, Chrome screenshots');
}finally{
 await browser?.close();
 child.kill('SIGTERM');
}
