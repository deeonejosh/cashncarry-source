import fs from 'node:fs';
import path from 'node:path';
import {Miniflare} from 'miniflare';
import {chromium} from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';

const ROOT=process.cwd();
const output=path.resolve(ROOT,'reports/benchmark');
fs.mkdirSync(path.join(output,'screenshots'),{recursive:true});
const source=fs.readFileSync(path.join(ROOT,'src/App.tsx'),'utf8');
const routes=[...new Set(['home',...[...source.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map(match=>match[1])])];
// Browser benchmarks run against real Worker API routes and isolated D1,
// not Vite's frontend-only preview (which returned false-positive API 502s).
const base='https://127.0.0.1:18799';
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png',
  '.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json',
  '.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const dist=path.resolve(ROOT,'dist');
function assetFromDist(request){
 const url=new URL(request.url);
 let rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/, '');
 rel=rel.replace(/\\/g,'/');
 let target=path.resolve(dist,rel);
 if(!target.startsWith(dist+path.sep)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){
   rel='index.html';target=path.join(dist,rel);
 }
 return new Response(fs.readFileSync(target),{
   status:200,headers:{'content-type':mime[path.extname(rel)]||'application/octet-stream'}
 });
}
async function applyMigration(db,sql) {
 const chunks=sql.split(/(?=CREATE TRIGGER)/);
 const ddl=chunks[0].split('\n').filter(x=>!x.trim().startsWith('--')).join('\n').trim();
 if(ddl)await db.exec(ddl.replace(/\s+/g,' ').replace(/;\s*/g,';\n').trim());
 for(const segment of chunks.slice(1)){
   const trigger=segment.split('\n').filter(x=>!x.trim().startsWith('--')).join('\n').trim();
   if(trigger)await db.prepare(trigger).run();
 }
}
const mf=new Miniflare({
 https:true,host:'127.0.0.1',port:18799,modules:true,scriptPath:'worker-dist/_worker.js',
 compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],
 d1Databases:['DB','AUTH_DB'],
 bindings:{
  AUTH_ORIGIN:base,PAYMENTS_ENABLED:'false',COINS_PURCHASES_ENABLED:'false',
  KYC_UPLOADS_ENABLED:'false',FLW_MODE:'disabled',FLW_WEBHOOK_SIGNATURE:'hmac-sha256',
  ORDER_RESERVATIONS:'enabled'
 },
 serviceBindings:{ASSETS:assetFromDist}
});
async function ready() {
 const dir=path.resolve(ROOT,'deploy/chatgpt-sites/migrations');
 const files=fs.readdirSync(dir).filter(x=>x.endsWith('.sql')).sort();
 for(const binding of ['DB','AUTH_DB']){
  const db=await mf.getD1Database(binding);
  for(const file of files)await applyMigration(db,fs.readFileSync(path.join(dir,file),'utf8'));
 }
 await mf.ready;
 const response=await mf.dispatchFetch(base+'/api/health');
 if(response.status!==200)throw Error('Isolated Worker health HTTP '+response.status);
 const health=await response.json();
 if(!health.dbConnected||health.staging?.paymentsEnabled!==false)
   throw Error('Isolated DB not ready or staging safety flags changed');
}
const safeName=x=>x.replace(/[^a-z0-9_-]/gi,'-');
const records=[];
let browser;
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:process.env.CNC_TEST_CHROMIUM||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{label:'desktop',width:1440,height:900},{label:'mobile',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1,ignoreHTTPSErrors:true});
  for(const route of routes){
   const page=await context.newPage(),errors=[],failures=[],apiErrors=[];
   page.on('response',response=>{ const responseUrl=new URL(response.url());
     if(responseUrl.origin===base && responseUrl.pathname.startsWith('/api/') && response.status()>=500)
       apiErrors.push({url:responseUrl.pathname,status:response.status()});
   });
   page.on('pageerror',e=>errors.push(e.message.slice(0,350)));
   page.on('requestfailed',req=>failures.push({url:req.url(),error:req.failure()?.errorText}));
   const url=route==='home'?base+'/':base+'/?tab='+encodeURIComponent(route);
   const item={route,viewport:viewport.label,url,executed:true,pass:false,httpStatus:null,loadMs:null,overflowPx:null,buttons:null,forms:null,visibleTextLength:0,consoleErrors:[],failedResources:[],apiErrors:[],axeViolations:[],axeStatus:'blocked',screenshot:null,issue:null};
   const began=Date.now();
   try{
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
    item.httpStatus=response?.status()??null;
    item.loadMs=Date.now()-began;
    await page.waitForTimeout(350);
    const info=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth,visibleTextLength:(document.body.innerText||'').trim().length,buttons:document.querySelectorAll('button').length,forms:document.querySelectorAll('form').length}));
    item.overflowPx=Math.max(0,info.scrollWidth-info.viewportWidth);
    item.visibleTextLength=info.visibleTextLength;
    item.buttons=info.buttons;item.forms=info.forms;
    item.consoleErrors=errors;item.failedResources=failures.slice(0,12);item.apiErrors=apiErrors.slice(0,20);
    const screenshot=path.join('screenshots',viewport.label+'-'+safeName(route)+'.png');
    await page.screenshot({path:path.join(output,screenshot),animations:'disabled',fullPage:false});
    item.screenshot=screenshot;
    try{
     const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
     item.axeStatus='executed';
     item.axeViolations=scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,help:v.help,targets:v.nodes.slice(0,12).map(n=>({selector:n.target,summary:(n.failureSummary||'').slice(0,380)}))}));
    }catch(e){item.axeStatus='blocked';item.axeError=String(e).slice(0,250)}
    item.pass=item.httpStatus===200&&item.overflowPx<=1&&item.visibleTextLength>20&&errors.length===0&&apiErrors.length===0&&item.axeStatus==='executed'&&item.axeViolations.length===0;
   }catch(e){item.issue=String(e).slice(0,380)}
   records.push(item);
   await page.close();
  }
  await context.close();
 }
}finally{
 if(browser)await browser.close().catch(()=>{});
 await mf.dispose();
}
const group={};
for(const r of records){
 const obj=group[r.route]||(group[r.route]={tested:0,passed:0,failed:0,blocked:0,axeFindings:0});
 obj.tested++;
 if(r.issue||r.axeStatus==='blocked')obj.blocked++;
 else if(r.pass)obj.passed++;
 else obj.failed++;
 obj.axeFindings+=r.axeViolations?.length||0;
}
const total={routesDiscovered:routes.length,viewsAttempted:records.length,viewsPassed:records.filter(r=>r.pass).length,viewsFailed:records.filter(r=>!r.pass&&!r.issue&&r.axeStatus==='executed').length,viewsBlocked:records.filter(r=>!!r.issue||r.axeStatus==='blocked').length};
const result={timestamp:new Date().toISOString(),commit:process.env.GITHUB_SHA||null,scope:'Local rebuilt frontend + Cloudflare Worker with isolated Miniflare/D1. Guest routes only; NOT deployed staging or real authenticated customer sessions.',method:'Playwright Chromium + axe WCAG A/AA',total,routes:group,views:records};
fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(result,null,2));
const md=['# Cash N Carry - browser and accessibility benchmark','', 'Build: '+(result.commit||'local'), 'Scope: '+result.scope,'','Routes discovered: '+total.routesDiscovered,'Desktop/mobile views attempted: '+total.viewsAttempted,'Passed: '+total.viewsPassed,'Failed: '+total.viewsFailed,'Blocked: '+total.viewsBlocked,'','| Route | Tested | Passed | Failed | Blocked | Axe findings |','|---|---:|---:|---:|---:|---:|',...Object.entries(group).map(([name,v])=>'| '+name+' | '+v.tested+' | '+v.passed+' | '+v.failed+' | '+v.blocked+' | '+v.axeFindings+' |'),'','See evidence.json and screenshots for per-viewport details.'];
fs.writeFileSync(path.join(output,'BROWSER-BENCHMARK.md'),md.join('\n'));
console.log('Benchmark:',JSON.stringify(total));
if(total.viewsBlocked>0||total.viewsFailed>0)process.exitCode=1;
