import { currentAccount, hasValidMutationOrigin, passwordMatches, readBody, type AuthEnvironment } from './new-auth';
import { verifyTotp } from './totp';

function response(contents: string, status = 200): Response {
  const markup = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Cash N Carry — Owner setup</title><style>body{background:#f8fafc;color:#0f172a;font:16px system-ui,sans-serif;margin:0;padding:28px 16px}' +
    'main{max-width:480px;margin:5vh auto;background:#fff;padding:28px;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 9px 30px #0206170c}' +
    'h1{font-size:23px;margin:0 0 14px}p{line-height:1.55;color:#334155}label{display:block;font-size:14px;font-weight:700;margin:18px 0 7px}' +
    'input{box-sizing:border-box;width:100%;min-height:44px;border:1px solid #94a3b8;border-radius:10px;padding:10px 12px;font-size:16px}' +
    'button{min-height:44px;margin-top:18px;border:0;background:#0e6b38;color:#fff;border-radius:10px;padding:10px 18px;font-weight:700;cursor:pointer}' +
    'a{color:#0e6b38;font-weight:650}a:focus-visible,input:focus-visible,button:focus-visible{outline:3px solid #0e6b38;outline-offset:2px}' +
    'code{display:block;overflow-wrap:anywhere;background:#f1f5f9;border-radius:10px;padding:15px;font-size:16px;letter-spacing:1px}small{color:#475569}</style>' +
    '</head><body><main>' + contents + '</main></body></html>';
  return new Response(markup, { status, headers: {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'x-robots-tag': 'noindex,nofollow,noarchive',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  } });
}

function base32FromHex(secret: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = Uint8Array.from(secret.match(/../g) || [], pair => Number.parseInt(pair, 16));
  let value = 0, bits = 0, result = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits -= 5)) & 31];
    }
  }
  if (bits) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}

async function permitOwnerAttempt(env: AuthEnvironment, id: string): Promise<boolean> {
  const bucket = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('owner-setup:' + id)));
  const key = Array.from(bucket, b => b.toString(16).padStart(2, '0')).join('');
  const window = Math.floor(Date.now() / 600000);
  const row = await env.AUTH_DB!.prepare(
    'INSERT INTO cnc_auth_rate VALUES (?,?,1) ON CONFLICT(bucket) DO UPDATE SET ' +
    'window=excluded.window, attempts=CASE WHEN cnc_auth_rate.window=excluded.window THEN cnc_auth_rate.attempts+1 ELSE 1 END ' +
    'WHERE cnc_auth_rate.window<excluded.window OR (cnc_auth_rate.window=excluded.window AND cnc_auth_rate.attempts<8) RETURNING attempts'
  ).bind(key, window).first();
  return Boolean(row);
}

export async function ownerSetupRoute(request: Request, env: AuthEnvironment): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/auth/owner-setup') return response('<h1>Not found</h1>', 404);
  if (!env.AUTH_DB || !env.ADMIN_ACCOUNT_ID || !env.ADMIN_TOTP_SECRET_HEX ||
      !/^[a-f0-9]{40,128}$/i.test(env.ADMIN_TOTP_SECRET_HEX) ||
      request.headers.has('authorization') || request.headers.get('x-client-type')) {
    return response('<h1>Owner setup unavailable</h1><p>Sign in through the private staging website first.</p>', 403);
  }
  if (!['GET', 'POST'].includes(request.method)) return response('<h1>Method not allowed</h1>', 405);

  // Owner setup requires a live, verified, browser-cookie-only seller session.
  const active = await currentAccount(request, env);
  if (!active || active.id !== env.ADMIN_ACCOUNT_ID || active.role !== 'seller') {
    return response('<h1>Access denied</h1><p>Only the verified staging owner account can activate administration.</p>', 403);
  }
  if (request.method === 'GET') {
    return response('<h1>Activate owner access</h1>' +
      '<p>Confirm your existing account password, then enrol a six-digit authenticator app. ' +
      'Your current seller role changes only when the authenticator code is verified.</p>' +
      '<form action="/api/auth/owner-setup" method="post">' +
      '<input type="hidden" name="step" value="start">' +
      '<label for="password">Current account password</label>' +
      '<input id="password" name="password" type="password" autocomplete="current-password" minlength="12" required>' +
      '<button type="submit">Continue</button></form>');
  }

  if (!hasValidMutationOrigin(request, env)) return response('<h1>Invalid request origin</h1>', 403);
  if (!(await permitOwnerAttempt(env, active.id))) {
    return response('<h1>Too many attempts</h1><p>Try again later.</p>', 429);
  }
  let body: Record<string, unknown>;
  try { body = await readBody(request); } catch { return response('<h1>Invalid form</h1>', 400); }
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 12 || password.length > 128) return response('<h1>Invalid password length</h1>', 400);

  const owner = await env.AUTH_DB.prepare(
    "SELECT id,email,credential FROM cnc_auth_users WHERE id=? AND email=? AND role='seller' AND verified=1 AND suspended=0"
  ).bind(active.id, active.email).first<{ id: string; email: string; credential: string }>();
  if (!owner || !(await passwordMatches(password, owner.credential))) {
    return response('<h1>Password not recognised</h1><p>Check your existing account password.</p>' +
      '<a href="/api/auth/owner-setup">Return to setup</a>', 401);
  }

  if (body.step === 'start') {
    const key = base32FromHex(env.ADMIN_TOTP_SECRET_HEX);
    const issuer = encodeURIComponent('Cash N Carry Staging');
    const uri = 'otpauth://totp/' + encodeURIComponent('Cash N Carry Staging:Owner') +
      '?secret=' + key + '&issuer=' + issuer + '&algorithm=SHA1&digits=6&period=30';
    // The setup key is returned only after reauthentication over the owner's session.
    // It is never included in application logs, URLs to remote services, or the chat.
    return response('<h1>Set up your authenticator</h1>' +
      '<p>In Google Authenticator, Microsoft Authenticator or another TOTP app, ' +
      'choose <strong>Add account</strong> and enter this key. Keep it private.</p>' +
      '<p><a href="' + uri + '">Open authenticator app</a></p><code>' + key + '</code>' +
      '<form action="/api/auth/owner-setup" method="post">' +
      '<input type="hidden" name="step" value="confirm">' +
      '<label for="password">Confirm account password</label>' +
      '<input id="password" name="password" type="password" autocomplete="current-password" minlength="12" required>' +
      '<label for="code">Current six-digit authenticator code</label>' +
      '<input id="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>' +
      '<button type="submit">Activate Admin</button></form>' +
      '<p><small>The account is not promoted until a valid code is submitted.</small></p>');
  }
  if (body.step !== 'confirm') return response('<h1>Invalid setup step</h1>', 400);
  const code = typeof body.code === 'string' ? body.code : '';
  if (await verifyTotp(env.ADMIN_TOTP_SECRET_HEX, code, Date.now()) === null) {
    return response('<h1>Authenticator code not accepted</h1><p>Check your phone time and repeat setup.</p>' +
      '<a href="/api/auth/owner-setup">Restart setup</a>', 400);
  }

  const changed = await env.AUTH_DB.prepare(
    "UPDATE cnc_auth_users SET role='admin' WHERE id=? AND email=? AND role='seller' AND verified=1 AND suspended=0 RETURNING id"
  ).bind(owner.id, owner.email).first<{ id: string }>();
  if (!changed) return response('<h1>Owner activation unavailable</h1>', 409);
  // Invalidate all previous seller sessions, including the one that performed enrolment.
  await env.AUTH_DB.prepare('DELETE FROM cnc_auth_sessions WHERE user_id=?').bind(owner.id).run();
  return response('<h1>Owner access activated</h1>' +
    '<p>Your account is now the sole staging administrator. You have been signed out of the seller session.</p>' +
    '<p>Return to Cash N Carry, choose <strong>Admin sign-in</strong>, and enter your password and six-digit authenticator code.</p>' +
    '<a href="/">Open Cash N Carry staging</a>');
}
