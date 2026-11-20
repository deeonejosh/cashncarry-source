import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Miniflare} from 'miniflare';

const root = process.cwd();
const releaseDir = path.join(root,'worker-dist','staging-v58');
fs.mkdirSync(releaseDir,{recursive:true});
fs.copyFileSync('deploy/chatgpt-sites/staging-ui-kv-wrapper.mjs',path.join(releaseDir,'entry.mjs'));
fs.copyFileSync('worker-dist/_worker.js',path.join(releaseDir,'backend-v57.mjs'));

const expected = [
  ['index.html','cnc:v58:ui:index.html','d885970af9a34102f4a8d63b0f6d4b4bea90bd3c13b6d00c109fdcdac99c660c'],
  ['assets/index-DjAQX0oY.js','cnc:v58:ui:assets:index-DjAQX0oY.js','6595806be9b58806b6bf1b34d8c6dab88fd0f2864b14004884d39e36df68ae72'],
  ['assets/index-uvdl1fkh.css','cnc:v58:ui:assets:index-uvdl1fkh.css','a25a7fb15bf5883b5152e0cb296a317feffaf4688c043e6a6ac51b9c68d51057'],
];
for (const [file,,sha] of expected) {
  const bytes=fs.readFileSync(path.join('dist',file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,
    'Source bundle changed unexpectedly: '+file);
}
const origin='https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev';
const mf=new Miniflare({
  modules:true,scriptPath:path.join(releaseDir,'entry.mjs'),
  compatibilityDate:'2026-08-06',
  compatibilityFlags:['nodejs_compat'],
  kvNamespaces:['CNC_STAGING_ASSETS'],
  d1Databases:['AUTH_DB','DB'],
  bindings:{
    AUTH_ORIGIN:origin,ORDER_RESERVATIONS:'enabled',
    PAYMENTS_ENABLED:'false',COINS_PURCHASES_ENABLED:'false',
    KYC_UPLOADS_ENABLED:'false',FLW_MODE:'disabled',
  },
  serviceBindings:{ASSETS:()=>new Response('legacy static asset fixture',{status:200})},
});
try {
  const kv=await mf.getKVNamespace('CNC_STAGING_ASSETS');
  for(const [file,key] of expected){
    await kv.put(key,fs.readFileSync(path.join('dist',file),'utf8'));
  }
  const checks=[
    ['/',expected[0][0],'text/html'],
    ['/?tab=shop',expected[0][0],'text/html'],
    ['/assets/index-DjAQX0oY.js',expected[1][0],'application/javascript'],
    ['/assets/index-uvdl1fkh.css',expected[2][0],'text/css'],
  ];
  for(const [url,file,type] of checks){
    const res=await mf.dispatchFetch(origin+url);
    assert.equal(res.status,200,'Staging UI file '+url);
    assert.ok(res.headers.get('content-type')?.startsWith(type));
    const bytes=Buffer.from(await res.arrayBuffer());
    assert.equal(createHash('sha256').update(bytes).digest('hex'),
      createHash('sha256').update(fs.readFileSync(path.join('dist',file))).digest('hex'));
    if(url==='/') assert.match(res.headers.get('x-robots-tag')||'',/noindex/);
    const head=await mf.dispatchFetch(origin+url,{method:'HEAD'});
    assert.equal(head.status,200);
    assert.equal((await head.arrayBuffer()).byteLength,0);
  }
  const health=await mf.dispatchFetch(origin+'/api/health');
  assert.equal(health.status,200,'The real v57 API must remain reachable');
  const h=await health.json();
  assert.equal(h.staging.paymentsEnabled,false);
  assert.equal(h.staging.coinsPurchasesEnabled,false);
  assert.equal(h.staging.kycUploadsEnabled,false);
  assert.equal(h.staging.streamConfigured,false);
  const neverProduction=await mf.dispatchFetch('https://www.cashncarryng.com/assets/index-DjAQX0oY.js');
  assert.notEqual(await neverProduction.text(),fs.readFileSync('dist/assets/index-DjAQX0oY.js','utf8'),
    'KV asset bridge must never serve on production host');
  await kv.delete('cnc:v58:ui:assets:index-uvdl1fkh.css');
  const broken=await mf.dispatchFetch(origin+'/assets/index-uvdl1fkh.css');
  assert.equal(broken.status,503,'No partial or missing KV asset should be called healthy');
  assert.equal((await broken.json()).code,'STAGING_UI_FILE_MISSING');
  console.log('PASS: v58 staged HTML/JS/CSS byte-identical, HEAD, noindex, API compatibility, safety flags, prod-host isolation, missing-file guard');
} finally {
  await mf.dispose();
}
