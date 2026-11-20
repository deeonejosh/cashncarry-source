import { createHash, createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare, createFetchMock } from 'miniflare';
const browserPort = 18797;
const origin = process.env.CNC_TEST_CHROMIUM ? 'https://127.0.0.1:' + browserPort : 'https://market.example.invalid';
const delivery = [];
const fetchMock = createFetchMock();
fetchMock.disableNetConnect();
const flutterwave = fetchMock.get('https://api.flutterwave.com');
const worker = new Miniflare({
  ...(process.env.CNC_TEST_CHROMIUM ? { https: true, host: '127.0.0.1', port: browserPort } : {}),
  fetchMock, modules: true, compatibilityDate: '2026-08-06', scriptPath: 'worker-dist/_worker.js',
  d1Databases: { AUTH_DB: 'auth-smoke', DB: 'auth-smoke' }, bindings: { AUTH_ORIGIN: origin, ORDER_RESERVATIONS: 'enabled', PAYMENTS_ENABLED: 'true', FLW_MODE:'sandbox', FLW_SECRET_KEY:'FLWSECK_TEST-fixture', FLW_WEBHOOK_HASH:'synthetic-signing-key', FLW_WEBHOOK_SIGNATURE:'hmac-sha256', ADMIN_ACCOUNT_ID: 'fixture-admin', ADMIN_TOTP_SECRET_HEX: '3132333435363738393031323334353637383930' },
  serviceBindings: { AUTH_EMAIL: async req => { delivery.push(await req.json()); return new Response(null,{status:204}); } },
});
try {
  const db = await worker.getD1Database('AUTH_DB');
  const migrations = 'deploy/chatgpt-sites/migrations';
  for (const file of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
    const sql = await readFile(migrations + '/' + file, 'utf8');
    const [schema, ...triggers] = sql.split(/(?=CREATE TRIGGER)/);
    const ddl = schema.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim();
    if (ddl) await db.exec(ddl.replace(/\s+/g, ' ').replace(/;\s*/g, ';\n').trim());
    for (const trigger of triggers) {
      await db.prepare(trigger.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim()).run();
    }
  }
  await db.exec("INSERT INTO stores (id,name,description) VALUES ('store','Fixture catalog',''); INSERT INTO products (id,store,name,description,category,price,stock,image,featured,active) VALUES ('fixture-product','store','Cart fixture','','fashion',100,2,'',0,1)");
  const web = (path, form, cookie = '', requestOrigin = origin) => worker.dispatchFetch(origin + path, form === undefined
    ? {redirect:'manual',headers:{cookie}} : {redirect:'manual',method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(form)});
  const request = (route, body, extra = {}) => worker.dispatchFetch(origin + '/api/auth/' + route, body === undefined
    ? { headers: extra } : { method:'POST', headers:{ 'content-type':'application/json', origin, ...extra }, body:JSON.stringify(body) });
  const email = 'buyer@example.invalid';
  const password = 'fixture-password-123';
  assert.equal((await request('register',{email})).status,202);
  assert.equal((await request('login',{email,password})).status,401);
  const verified = await request('verify',{token:delivery.at(-1).token,password});
  assert.equal(verified.status,200,await verified.text());
  assert.equal((await request('verify',{token:delivery.at(-1).token,password})).status,400);
  assert.equal((await request('login',{email,password:'wrong-fixture-password'})).status,401);
  assert.equal((await request('login',{email,password},{origin:'https://other.invalid'})).status,403);
  const login = await request('login',{email,password});
  assert.equal(login.status,200);
  const setCookie = login.headers.get('set-cookie');
  assert.match(setCookie,/Secure; HttpOnly; SameSite=Strict/);
  const cookie = setCookie.split(';')[0];
  assert.equal((await (await request('me',undefined,{cookie})).json()).user.role,'buyer');
  assert.equal((await request('request-reset',{email:'missing@example.invalid'})).status,202);
  assert.equal(delivery.length,1);
  assert.equal((await request('request-reset',{email})).status,202);
  const reset = await request('reset',{token:delivery.at(-1).token,password:'replacement-password-123'});
  assert.equal(reset.status,200,await reset.text());
  assert.equal((await request('me',undefined,{cookie})).status,401);
  const replacement = await request('login',{email,password:'replacement-password-123'});
  assert.equal(replacement.status,200);
  const nextCookie = replacement.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('logout',{}, {cookie:nextCookie})).status,200);
  assert.equal((await request('me',undefined,{cookie:nextCookie})).status,401);
  const seller = 'seller@example.invalid';
  assert.equal((await request('register',{email:seller})).status,202);
  assert.equal((await request('verify',{token:delivery.at(-1).token,password,role:'seller'})).status,200);
  const applicantLogin = await request('login',{email:seller,password});
  assert.equal(applicantLogin.status, 200);
  const applicantCookie = applicantLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await request('me',undefined,{cookie:applicantCookie})).json()).user.role,'buyer');
  assert.equal((await web('/seller/dashboard',undefined,applicantCookie)).status,403);
  // Seed an approved seller for the remaining marketplace smokes. The isolated
  // marketplace suite exercises the actual admin approval and session revocation.
  await db.prepare("UPDATE cnc_auth_users SET role='seller' WHERE email=?").bind(seller).run();
  await db.prepare("INSERT INTO cnc_seller_applications (id,user_id,business_name,phone,description,status) SELECT 'seller-smoke',id,'Fixture shop','08012345678','Approved smoke fixture','approved' FROM cnc_auth_users WHERE email=?").bind(seller).run();
  const sellerLogin = await request('login',{email:seller,password});
  assert.equal(sellerLogin.status,200);
  const sellerCookie = sellerLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await request('me',undefined,{cookie:sellerCookie})).json()).user.role,'seller');
  const form = await web('/sign-in');
  const csrf = (await form.text()).match(/name="admin_csrf" value="([^"]+)"/)?.[1];
  assert.ok(csrf);
  const csrfCookie = form.headers.get('set-cookie').split(';')[0];
  const signIn = await web('/sign-in', {email,password:'replacement-password-123',admin_csrf:csrf},csrfCookie);
  assert.equal(signIn.status,303,await signIn.text());
  const buyerCookie = signIn.headers.get('set-cookie').split(';')[0];
  assert.equal((await web('/account')).headers.get('location'),'/sign-in');
  assert.match(await (await web('/account',undefined,buyerCookie)).text(),/buyer@example\.invalid/);
  assert.equal((await web('/seller/dashboard',undefined,buyerCookie)).status,403);
  assert.equal((await web('/seller/dashboard',undefined,sellerCookie)).status,200);
  const address = {action:'add',recipient:'Fixture Buyer',line:'1 Test Lane',city:'Lagos',state:'Lagos'};
  assert.equal((await web('/addresses',address,buyerCookie,'https://other.invalid')).status,403);
  assert.equal((await web('/addresses',address,buyerCookie)).status,303);
  assert.match(await (await web('/addresses',undefined,buyerCookie)).text(),/1 Test Lane/);
  assert.doesNotMatch(await (await web('/addresses',undefined,sellerCookie)).text(),/1 Test Lane/);
  const storedAddress = await db.prepare('SELECT id FROM cnc_buyer_addresses').first();
  assert.equal((await web('/addresses',{action:'delete',id:storedAddress.id},sellerCookie)).status,303);
  assert.ok(await db.prepare('SELECT id FROM cnc_buyer_addresses WHERE id=?').bind(storedAddress.id).first());
  assert.equal((await web('/addresses',{action:'delete',id:storedAddress.id},buyerCookie)).status,303);
  assert.equal(await db.prepare('SELECT id FROM cnc_buyer_addresses WHERE id=?').bind(storedAddress.id).first(),null);
  assert.equal((await web('/seller/products',undefined,buyerCookie)).status,403);
  assert.equal((await web('/seller/store',{name:'Fixture shop',description:'Test'},sellerCookie)).status,303);
  const draft = {action:'create',id:crypto.randomUUID(),name:'Fixture draft',price_minor:'1250',stock:'4'};
  assert.equal((await web('/seller/products',draft,sellerCookie)).status,303);
  assert.equal((await web('/seller/products',draft,sellerCookie)).status,409);
  const update = {...draft,action:'update',revision:'1'};
  const concurrent = await Promise.all([web('/seller/products',{...update,stock:'2'},sellerCookie),web('/seller/products',{...update,stock:'3'},sellerCookie)]);
  assert.deepEqual(concurrent.map(response => response.status).sort(),[303,409]);
  assert.equal((await web('/seller/products',{...update,revision:'2',stock:'-1'},sellerCookie)).status,400);
  await db.exec("INSERT INTO cnc_auth_users (id,email,credential,role,verified) VALUES ('other-seller','other@example.invalid','','seller',1); INSERT INTO cnc_seller_stores (owner,name,description) VALUES ('other-seller','Other store',''); INSERT INTO cnc_seller_products (id,owner,name,price_minor,stock) VALUES ('foreign-draft','other-seller','Foreign draft',100,1)");
  assert.equal((await web('/seller/products',{...update,id:'foreign-draft'},sellerCookie)).status,409);
  assert.doesNotMatch(await (await web('/seller/products',undefined,sellerCookie)).text(),/Foreign draft/);
  assert.equal((await web('/seller/products',{action:'archive',id:draft.id,revision:'2'},sellerCookie)).status,303);
  assert.equal((await web('/cart',{id:'fixture-product',quantity:'3'},buyerCookie)).status,409);
  assert.equal((await web('/cart',{id:'fixture-product',quantity:'2'},buyerCookie)).status,303);
  assert.match(await (await web('/cart',undefined,buyerCookie)).text(),/Cart fixture/);
  assert.equal((await web('/cart',undefined,sellerCookie)).status,200);
  assert.equal((await web('/cart',{id:'fixture-product',quantity:'0'},buyerCookie)).status,303);
  const orderProduct = {...draft,id:crypto.randomUUID(),name:'Reserved fixture',stock:'1'};
  assert.equal((await web('/seller/products',orderProduct,sellerCookie)).status,303);
  assert.equal((await web('/seller/products',{action:'submit',id:orderProduct.id,revision:'1'},sellerCookie)).status,303);
  assert.equal((await db.prepare('SELECT publication FROM cnc_seller_products WHERE id=?').bind(orderProduct.id).first()).publication,'pending');
  const verifiedBuyer = await db.prepare('SELECT credential FROM cnc_auth_users WHERE email=?').bind(email).first();
  const adminEmail = 'fixture-admin@example.invalid';
  await db.prepare("INSERT INTO cnc_auth_users (id,email,credential,role,verified) VALUES ('fixture-admin',?,?,'admin',1)").bind(adminEmail,verifiedBuyer.credential).run();
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const mac=createHmac('sha1',Buffer.from('12345678901234567890')).update(counter).digest();
  const code=String((mac.readUInt32BE(mac[19]&15)&0x7fffffff)%1000000).padStart(6,'0');
  const auth = {email:adminEmail,password:'replacement-password-123',code};
  assert.equal((await request('login',auth)).status,401);
  assert.equal((await request('admin-login',{...auth,code:'invalid'})).status,401);
  assert.equal((await request('admin-login',auth,{'x-client-type':'mobile'})).status,403);
  const admin = await request('admin-login',auth);
  assert.equal(admin.status,200,await admin.text());
  const adminCookie=admin.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('admin-login',auth)).status,401);
  assert.equal((await web('/admin',undefined,sellerCookie)).status,403);
  assert.match(await (await web('/admin',undefined,adminCookie)).text(),/Reserved fixture/);
  assert.equal((await web('/admin',{id:orderProduct.id,revision:'2',decision:'approve'},adminCookie,'https://other.invalid')).status,403);
  const review={id:orderProduct.id,revision:'2',decision:'approve'};
  const moderation=await Promise.all([web('/admin',review,adminCookie),web('/admin',review,adminCookie)]);
  assert.deepEqual(moderation.map(response=>response.status).sort(),[303,409]);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM cnc_product_reviews').first()).n,1);
  const buyer = await db.prepare('SELECT id FROM cnc_auth_users WHERE email=?').bind(email).first();
  const secondToken = 'a'.repeat(64);
  await db.exec("INSERT INTO cnc_auth_users (id,email,credential,role,verified) VALUES ('second-buyer','second@example.invalid','','buyer',1)");
  await db.prepare('INSERT INTO cnc_auth_sessions (hash,user_id,expires) VALUES (?,?,?)').bind(createHash('sha256').update(secondToken).digest('hex'),'second-buyer',Date.now()+600000).run();
  const secondCookie = '__Host-cnc_session=' + secondToken;
  const orderAddress = async (id,owner) => db.prepare('INSERT INTO cnc_buyer_addresses VALUES (?,?,?,?,?,?)').bind(id,owner,'Fixture','Address','Lagos','Lagos').run();
  await orderAddress('addr-first',buyer.id);
  await orderAddress('addr-second','second-buyer');
  assert.equal((await web('/cart',{id:orderProduct.id,quantity:'1',source:'replacement'},buyerCookie)).status,303);
  assert.equal((await web('/cart',{id:orderProduct.id,quantity:'1',source:'replacement'},secondCookie)).status,303);
  const payloads = [{request_id:'checkout-fixture-01',address_id:'addr-first'},{request_id:'checkout-fixture-02',address_id:'addr-second'}];
  const cookies = [buyerCookie,secondCookie];
  assert.equal((await web('/api/checkout',{...payloads[0],address_id:'addr-second'},buyerCookie)).status,400);
  const checkouts = await Promise.all(payloads.map((payload,index) => web('/api/checkout',payload,cookies[index])));
  assert.deepEqual(checkouts.map(response => response.status).sort(),[200,409]);
  const winner = checkouts.findIndex(response => response.ok);
  const {order} = await checkouts[winner].json();
  assert.equal(order.status,'awaiting_payment');
  assert.equal((await (await web('/api/checkout',payloads[winner],cookies[winner])).json()).order.id,order.id);
  assert.equal((await (await web('/api/orders',undefined,cookies[1-winner])).json()).orders.length,0);
  assert.equal((await db.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(orderProduct.id).first()).stock,0);
  assert.equal((await web('/api/orders/cancel',{id:order.id},cookies[1-winner])).status,409);
  assert.equal((await web('/api/orders/cancel',{id:order.id},cookies[winner])).status,200);
  assert.equal((await web('/api/orders/cancel',{id:order.id},cookies[winner])).status,409);
  assert.equal((await db.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(orderProduct.id).first()).stock,1);
  const expiryProduct = {...orderProduct,id:crypto.randomUUID(),stock:'1'};
  assert.equal((await web('/seller/products',expiryProduct,sellerCookie)).status,303);
  await db.prepare("UPDATE cnc_seller_products SET publication='published' WHERE id=?").bind(expiryProduct.id).run();
  assert.equal((await web('/cart',{id:expiryProduct.id,quantity:'1',source:'replacement'},cookies[winner])).status,303);
  const expiryOrder = (await (await web('/api/checkout',{...payloads[winner],request_id:'expiry-fixture-01'},cookies[winner])).json()).order;
  await db.prepare('UPDATE cnc_orders SET created=unixepoch()-1801 WHERE id=?').bind(expiryOrder.id).run();
  await Promise.all([web('/api/orders',undefined,cookies[winner]),web('/api/orders',undefined,cookies[winner])]);
  assert.equal((await db.prepare('SELECT status FROM cnc_orders WHERE id=?').bind(expiryOrder.id).first()).status,'cancelled');
  assert.equal((await db.prepare('SELECT stock FROM cnc_seller_products WHERE id=?').bind(expiryProduct.id).first()).stock,1);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM cnc_reservation_expiries WHERE order_id=?').bind(expiryOrder.id).first()).n,1);
  const interruptedBuyer = 1 - winner;
  const secondCheckout = await web('/api/checkout',payloads[interruptedBuyer],cookies[interruptedBuyer]);
  assert.equal(secondCheckout.status,200);
  const interrupted = (await secondCheckout.json()).order;
  flutterwave.intercept({path:'/v3/payments',method:'POST'}).reply(502,{status:'error'});
  assert.equal((await web('/api/payments/initialize',{order_id:interrupted.id},cookies[interruptedBuyer])).status,502);
  const ledger = await db.prepare('SELECT reference,amount_minor FROM cnc_flutterwave_payments WHERE order_id=?').bind(interrupted.id).first();
  assert.ok(ledger);
  assert.equal((await web('/api/orders/cancel',{id:interrupted.id},cookies[interruptedBuyer])).status,409);
  await db.prepare('UPDATE cnc_orders SET created=unixepoch()-1801 WHERE id=?').bind(interrupted.id).run();
  await web('/api/orders',undefined,cookies[interruptedBuyer]);
  assert.equal((await db.prepare('SELECT status FROM cnc_orders WHERE id=?').bind(interrupted.id).first()).status,'awaiting_payment');
  const callback = JSON.stringify({event:'charge.completed',data:{id:123,tx_ref:ledger.reference}});
  const sign = createHmac('sha256','synthetic-signing-key').update(callback).digest('base64');
  const sendCallback = signature => worker.dispatchFetch(origin+'/api/payments/webhooks/flutterwave',{
    method:'POST',headers:{'flutterwave-signature':signature},body:callback,
  });
  assert.equal((await sendCallback('invalid')).status,401);
  flutterwave.intercept({path:'/v3/transactions/123/verify',method:'GET'}).reply(200,{
    status:'success',data:{id:123,tx_ref:ledger.reference,status:'successful',currency:'NGN',amount:ledger.amount_minor/100},
  });
  assert.equal((await sendCallback(sign)).status,200);
  assert.equal((await sendCallback(sign)).status,200);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM cnc_flutterwave_payments WHERE order_id=? AND transaction_id=? AND paid_at IS NOT NULL').bind(interrupted.id,'123').first()).n,1);
  assert.equal((await (await web('/api/payments/status?order_id='+interrupted.id,undefined,cookies[interruptedBuyer])).json()).status,'paid');
  assert.equal((await web('/api/payments/status?order_id='+interrupted.id,undefined,cookies[winner])).status,404);
  fetchMock.assertNoPendingInterceptors();
  await db.prepare('DELETE FROM cnc_buyer_cart WHERE product=?').bind(orderProduct.id).run();
  await db.prepare("DELETE FROM cnc_buyer_addresses WHERE id IN ('addr-first','addr-second')").run();
  assert.equal((await web('/sign-out',{},buyerCookie)).status,303);
  assert.equal((await web('/account',undefined,buyerCookie)).headers.get('location'),'/sign-in');
  await db.prepare('UPDATE cnc_auth_users SET suspended=1 WHERE email=?').bind(seller).run();
  assert.equal((await request('me',undefined,{cookie:sellerCookie})).status,401);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM cnc_auth_audit').first()).n,5);
  if (process.env.CNC_TEST_CHROMIUM) {
    await db.prepare('DELETE FROM cnc_auth_rate').run();
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({executablePath:process.env.CNC_TEST_CHROMIUM,headless:true,args:['--no-sandbox']});
    try {
      for (const [index, viewport] of [{width:1440,height:900},{width:390,height:844}].entries()) {
        const context = await browser.newContext({viewport,ignoreHTTPSErrors:true});
        try {
          const page = await context.newPage();
          await page.goto(origin + '/sign-in');
          await page.getByLabel('Email address').fill(email);
          await page.getByLabel('Password').fill('replacement-password-123');
          await page.getByRole('button',{name:'Sign in',exact:true}).click();
          await page.waitForURL(origin + '/account');
          assert.equal(await page.getByRole('heading',{level:1}).textContent(),'My account');
          await page.goto(origin + '/products/fixture-product');
          await page.getByRole('button',{name:'Set cart quantity'}).click();
          await page.getByRole('heading',{name:'Cart fixture'}).waitFor();
          await page.getByRole('button',{name:'Remove',exact:true}).click();
          await page.getByText('Your cart is empty.').waitFor();
          await page.getByRole('link',{name:'My account'}).click();
          await page.getByRole('link',{name:'Manage delivery addresses'}).click();
          await page.getByLabel('Recipient').fill('Browser Fixture');
          await page.getByLabel('Street address').fill('12 Synthetic Street');
          await page.getByLabel('City').fill('Lagos');
          await page.getByLabel('State').fill('Lagos');
          await page.getByRole('button',{name:'Add address'}).click();
          await page.getByRole('heading',{name:'Browser Fixture'}).waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
          await page.getByRole('button',{name:'Remove address'}).click();
          await page.getByText('No saved addresses.').waitFor();
          await page.getByRole('link',{name:'My account'}).click();
          await page.getByRole('button',{name:'Sign out'}).click();
          await page.waitForURL(origin + '/sign-in');
        } finally { await context.close(); }
      }
      console.log('Desktop and mobile isolated authentication and address browser journeys passed');
    } finally { await browser.close(); }
  }
  console.log('91 authentication, moderation, marketplace, order, expiry and payment assertions passed');
} finally { await worker.dispose(); }
