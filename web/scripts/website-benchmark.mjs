import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';

const ROOT=process.cwd();
const output=path.resolve(ROOT,'reports/benchmark');
fs.mkdirSync(path.join(output,'screenshots'),{recursive:true});
const source=fs.readFileSync(path.join(ROOT,'src/App.tsx'),'utf8');
const routes=[...new Set(['home',...[...source.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map(match=>match[1])])];
const base='http://127.0.0.1:4173';
const server=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','preview','--','--host','127.0.0.1','--port','4173','--strictPort'],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
let serverLog='';
server.stdout.on('data',d=>{serverLog+=d.toString().slice(0,1500)});
server.stderr.on('data',d=>{serverLog+=d.toString().slice(0,1500)});
const started=Date.now();
async function ready(){
 while(Date.now()-started<35000){
  if(server.exitCode!==null)throw Error('Vite preview exited: '+serverLog);
  try{const response=await fetch(base);if(response.ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,400));
 }
 throw Error('Cannot start Vite: '+serverLog);
}
const safeName=x=>x.replace(/[^a-z0-9_-]/gi,'-');
const records=[];
let browser;
try{
 await ready();
 browser=await chromium.launch({headless:true,executablePath:process.env.CNC_TEST_CHROMIUM||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{label:'desktop',width:1440,height:900},{label:'mobile',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
  for(const route of routes){
   const page=await context.newPage(),errors=[],failures=[];
   page.on('pageerror',e=>errors.push(e.message.slice(0,350)));
   page.on('requestfailed',req=>failures.push({url:req.url(),error:req.failure()?.errorText}));
   const url=route==='home'?base+'/':base+'/?tab='+encodeURIComponent(route);
   const item={route,viewport:viewport.label,url,executed:true,pass:false,httpStatus:null,loadMs:null,overflowPx:null,buttons:null,forms:null,visibleTextLength:0,consoleErrors:[],failedResources:[],axeViolations:[],axeStatus:'blocked',screenshot:null,issue:null};
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
    item.consoleErrors=errors;item.failedResources=failures.slice(0,12);
    const screenshot=path.join('screenshots',viewport.label+'-'+safeName(route)+'.png');
    await page.screenshot({path:path.join(output,screenshot),animations:'disabled',fullPage:false});
    item.screenshot=screenshot;
    try{
     const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
     item.axeStatus='executed';
     item.axeViolations=scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,help:v.help}));
    }catch(e){item.axeStatus='blocked';item.axeError=String(e).slice(0,250)}
    item.pass=item.httpStatus===200&&item.overflowPx<=1&&item.visibleTextLength>20&&errors.length===0&&item.axeStatus==='executed'&&item.axeViolations.length===0;
   }catch(e){item.issue=String(e).slice(0,380)}
   records.push(item);
   await page.close();
  }
  await context.close();
 }
}finally{
 if(browser)await browser.close().catch(()=>{});
 server.kill('SIGTERM');
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
const result={timestamp:new Date().toISOString(),commit:process.env.GITHUB_SHA||null,scope:'Local rebuilt frontend, isolated test data. NOT authenticated production or actual deployed staging.',method:'Playwright Chromium + axe WCAG A/AA',total,routes:group,views:records};
fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(result,null,2));
const md=['# Cash N Carry - browser and accessibility benchmark','', 'Build: '+(result.commit||'local'), 'Scope: '+result.scope,'','Routes discovered: '+total.routesDiscovered,'Desktop/mobile views attempted: '+total.viewsAttempted,'Passed: '+total.viewsPassed,'Failed: '+total.viewsFailed,'Blocked: '+total.viewsBlocked,'','| Route | Tested | Passed | Failed | Blocked | Axe findings |','|---|---:|---:|---:|---:|---:|',...Object.entries(group).map(([name,v])=>'| '+name+' | '+v.tested+' | '+v.passed+' | '+v.failed+' | '+v.blocked+' | '+v.axeFindings+' |'),'','See evidence.json and screenshots for per-viewport details.'];
fs.writeFileSync(path.join(output,'BROWSER-BENCHMARK.md'),md.join('\n'));
console.log('Benchmark:',JSON.stringify(total));
if(total.viewsBlocked>0||total.viewsFailed>0)process.exitCode=1;
