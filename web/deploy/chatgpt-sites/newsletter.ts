// @ts-nocheck
// Cash N Carry — staging-only consent-based newsletter workflow.
const nEmail = (v) => typeof v === 'string' && v.length <= 254 &&
  /^[^\s@<>]{1,64}@[^\s@<>]{1,180}\.[a-z]{2,}$/i.test(v);
const nResponse = (data, status = 200) => Response.json(data, {
  status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});
const nToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),
  x => x.toString(16).padStart(2, '0')).join('');
const nHash = async (str) => Array.from(new Uint8Array(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))),
  x => x.toString(16).padStart(2, '0')).join('');
const nEscape = (s) => String(s).replace(/[&<>"']/g, ch =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function nPage(title, content, status = 200) {
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + nEscape(title) + ' · Cash N Carry</title>' +
    '<style>body{margin:0;background:#f7faf8;font:16px Arial,Helvetica,sans-serif;color:#142a1e}' +
    'main{max-width:480px;margin:9vh auto;padding:30px;background:#fff;border:1px solid #dfebe4;border-radius:20px;box-shadow:0 12px 30px #112a2011}' +
    'h1{font-size:26px;line-height:1.2;margin:0 0 14px}p{color:#476053;line-height:1.6}' +
    'button,.n-btn{background:#075a37;color:#fff;border:0;border-radius:11px;padding:14px 20px;font-size:16px;font-weight:700;text-decoration:none;display:inline-block;cursor:pointer}' +
    'a{color:#075a37}button:focus-visible,a:focus-visible{outline:3px solid #f80;outline-offset:3px}' +
    '</style></head><body><main><p style="font-weight:bold;color:#075a37">Cash N Carry Nigeria</p>' +
    '<h1>' + nEscape(title) + '</h1>' + content +
    '<p><a href="/">Return to marketplace</a></p></main></body></html>';
  return new Response(html,{status,headers:{
    'content-type':'text/html; charset=utf-8','cache-control':'no-store',
    'referrer-policy':'no-referrer','x-content-type-options':'nosniff',
    'content-security-policy':"default-src 'none';style-src 'unsafe-inline';form-action 'self';base-uri 'none';frame-ancestors 'none'",
    'x-robots-tag':'noindex, nofollow, noarchive'}});
}
function nSameSite(req) {
  const origin = new URL(req.url).origin;
  const provided = req.headers.get('origin');
  const ref = req.headers.get('referer');
  if (provided && provided !== origin) return false;
  if (req.headers.get('sec-fetch-site') === 'cross-site') return false;
  if (ref) { try { if (new URL(ref).origin !== origin) return false; } catch { return false; } }
  return true;
}
export async function newsletterRoute(request, env) {
  const url = new URL(request.url);
  if (!/^\/api\/newsletter\/(?:subscribe|confirm|unsubscribe)$/.test(url.pathname)) return null;
  if (!/staging/i.test(env.AUTH_ORIGIN || url.hostname)) return nResponse({error:'Not found'},404);
  if (!env.AUTH_DB) return nResponse({error:'Newsletter temporarily unavailable'},503);
  const db = env.AUTH_DB;
  if (url.pathname === '/api/newsletter/subscribe') {
    if (request.method !== 'POST') return nResponse({error:'Method not allowed'},405);
    if (!nSameSite(request)) return nResponse({error:'Invalid request origin'},403);
    let body;
    try { if (!(request.headers.get('content-type')||'').includes('application/json')) throw Error('type');
      body=await request.json(); } catch { return nResponse({error:'Invalid signup form'},400); }
    const email=typeof body.email==='string' ? body.email.trim().toLowerCase() : '';
    if (!nEmail(email) || body.consent !== true) return nResponse({error:'Enter a valid email and agree to receive updates'},400);
    const name=typeof body.name==='string' ? body.name.trim().slice(0,100) : '';
    const topics=Array.isArray(body.topics) ? body.topics.filter(x=>['deals','livestreams','news'].includes(x)).slice(0,3) : [];
    const source=['footer','modal'].includes(body.source) ? body.source : 'footer';
    const ip=request.headers.get('cf-connecting-ip')||'unknown';
    const bucket=await nHash('newsletter-ip:'+ip);
    const window=Math.floor(Date.now()/600000);
    const rate=await db.prepare(
      "INSERT INTO cnc_newsletter_rate(bucket,window,attempts) VALUES (?,?,1) "+
      "ON CONFLICT(bucket) DO UPDATE SET window=excluded.window, "+
      "attempts=CASE WHEN cnc_newsletter_rate.window=excluded.window THEN cnc_newsletter_rate.attempts+1 ELSE 1 END "+
      "WHERE cnc_newsletter_rate.window<excluded.window OR cnc_newsletter_rate.attempts<5 RETURNING attempts"
    ).bind(bucket,window).first();
    if (!rate) return nResponse({error:'Too many requests. Try again later.'},429);
    const token=nToken(), unsubscribe=nToken();
    const hashed=await nHash(token), unhash=await nHash(unsubscribe);
    const now=Math.floor(Date.now()/1000);
    const inserted=await db.prepare(
      "INSERT INTO cnc_newsletter_subscribers "+
      "(email,display_name,topics,status,confirmation_hash,unsubscribe_hash,source,consent_at,last_requested_at) "+
      "VALUES (?,?,?,'pending',?,?,?,?,?) "+
      "ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name,topics=excluded.topics,"+
      "status='pending',confirmation_hash=excluded.confirmation_hash,unsubscribe_hash=excluded.unsubscribe_hash,"+
      "source=excluded.source,consent_at=excluded.consent_at,last_requested_at=excluded.last_requested_at,unsubscribed_at=NULL "+
      "WHERE cnc_newsletter_subscribers.status!='confirmed' AND cnc_newsletter_subscribers.last_requested_at<=? "+
      "RETURNING email"
    ).bind(email,name,JSON.stringify(topics),hashed,unhash,source,now,now,now-600).first();
    if (!inserted) return nResponse({ok:true,message:'If this address needs confirmation, check your inbox shortly.'},202);
    if (!env.AUTH_RESEND_API_KEY) return nResponse({error:'Email delivery is not configured'},503);
    const link=url.origin+'/api/newsletter/confirm?token='+encodeURIComponent(token);
    const safeLink=nEscape(link);
    const text='Confirm your Cash N Carry newsletter subscription: '+link+
      '\n\nIf you did not request this email, you can ignore it. No marketing updates will be sent without confirmation.';
    const html='<!doctype html><html lang="en"><head><meta charset="utf-8"></head>'+
      '<body style="background:#f7faf8;font-family:Arial,sans-serif;color:#173427;padding:20px">'+
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">'+
      '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:550px;background:#fff;border:1px solid #e2ece5;border-radius:14px">'+
      '<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:18px 26px;border-bottom:3px solid #075a37"><img src="https://raw.githubusercontent.com/deeonejosh/cashncarry-source/7191c33393d67cd344cbb2b48cf6743a82352a38/web/public/brand/logo.png" width="180" height="60" border="0" alt="Cash N Carry Nigeria" style="display:block;width:180px;height:60px;border:0"></td></tr>'+
      '<tr><td style="padding:26px"><h1 style="font-size:24px">Confirm your email</h1>'+
      '<p style="line-height:1.6;color:#46564e">Please confirm your email address before receiving marketplace news, offers and livestream updates.</p>'+
      '<p><a href="'+safeLink+'" style="display:inline-block;padding:14px 22px;background:#075a37;color:white;text-decoration:none;border-radius:10px">Confirm subscription</a></p>'+
      '<p style="font-size:13px;color:#647269">If you did not request this, ignore this email. The confirmation link is valid for 24 hours.</p>'+
      '</td></tr></table></td></tr></table></body></html>';
    let sent=false;
    try {
      const mail=await fetch('https://api.resend.com/emails',{
        method:'POST',headers:{Authorization:'Bearer '+env.AUTH_RESEND_API_KEY,'Content-Type':'application/json',
          'Idempotency-Key':'cnc-newsletter-confirm-'+hashed.slice(0,40)},
        body:JSON.stringify({from:'Cash N Carry <newsletter@cashncarryng.com>',to:[email],
          subject:'Confirm your Cash N Carry updates',text,html})
      });
      sent=mail.ok;
    } catch { sent=false; }
    if (!sent) {
      await db.prepare("DELETE FROM cnc_newsletter_subscribers WHERE email=? AND status='pending' AND confirmation_hash=?")
        .bind(email,hashed).run();
      return nResponse({error:'Could not send the confirmation email. Please try again later.'},503);
    }
    return nResponse({ok:true,message:'Check your inbox to confirm your subscription.'},202);
  }
  const key=url.searchParams.get('token')||'';
  if (!/^[a-f0-9]{64}$/.test(key)) return nPage('Link unavailable','<p>This newsletter link is invalid or expired.</p>',400);
  const hashed=await nHash(key);
  const unsubscribe=url.pathname.endsWith('/unsubscribe');
  if (request.method==='GET') {
    const found=await db.prepare('SELECT email,status,last_requested_at FROM cnc_newsletter_subscribers WHERE '+(unsubscribe?'unsubscribe_hash':'confirmation_hash')+'=?').bind(hashed).first();
    if (!found) return nPage('Link unavailable','<p>This newsletter link is invalid or expired.</p>',404);
    if (!unsubscribe && (found.status!=='pending' || Date.now()/1000-found.last_requested_at>86400))
      return nPage('Link expired','<p>Request a fresh newsletter confirmation from the website.</p>',410);
    const action=unsubscribe?'Unsubscribe':'Confirm subscription';
    return nPage(action,'<p>'+ (unsubscribe ? 'Stop newsletter emails to this address?' :
      'Confirm that you want marketplace updates from Cash N Carry?')+'</p>'+
      '<form action="'+url.pathname+'?token='+encodeURIComponent(key)+'" method="post"><input type="hidden" name="token" value="'+nEscape(key)+'">'+
      '<button type="submit">'+action+'</button></form>');
  }
  if (request.method!=='POST') return nResponse({error:'Method not allowed'},405);
  if (!nSameSite(request)) return nPage('Request blocked','<p>Please open your email link and try again.</p>',403);
  let submitted;
  try { submitted=(await request.formData()).get('token'); } catch { return nPage('Invalid form','<p>Try again.</p>',400); }
  if (submitted!==key) return nPage('Request blocked','<p>Form verification failed.</p>',403);
  const now=Math.floor(Date.now()/1000);
  if (unsubscribe) {
    const changed=await db.prepare("UPDATE cnc_newsletter_subscribers SET status='unsubscribed',confirmation_hash=NULL,unsubscribed_at=? WHERE unsubscribe_hash=? RETURNING email").bind(now,hashed).first();
    return changed ? nPage('Unsubscribed','<p>You will no longer receive Cash N Carry newsletter updates.</p>') :
      nPage('Link unavailable','<p>This link is no longer valid.</p>',404);
  }
  const activated=await db.prepare("UPDATE cnc_newsletter_subscribers SET status='confirmed',confirmed_at=?,confirmation_hash=NULL WHERE confirmation_hash=? AND status='pending' AND last_requested_at>=? RETURNING email")
    .bind(now,hashed,now-86400).first();
  return activated ? nPage('Subscription confirmed','<p>Thanks for subscribing. You can unsubscribe from any newsletter email.</p>') :
    nPage('Link expired','<p>Please request another confirmation email.</p>',410);
}
