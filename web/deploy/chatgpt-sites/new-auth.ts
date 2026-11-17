import { deliverAuthEmail, emailConfigured, type EmailEnvironment } from './auth-email';
import { verifyTotp } from './totp';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import type { RecoveryDatabase } from './recovery';

type Role = 'buyer' | 'seller' | 'admin';
type User = { id: string; email: string; credential: string; role: Role; verified: number; suspended: number };
export interface AuthEnvironment extends EmailEnvironment {
  AUTH_DB?: RecoveryDatabase;
  AUTH_ORIGIN?: string;
  ADMIN_ACCOUNT_ID?: string;
  ADMIN_TOTP_SECRET_HEX?: string;
}
const cookie = '__Host-cnc_session';
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const sha = async (text: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text))));
const tokenFormat = /^[a-f0-9]{64}$/;
const sessionSeconds = 8 * 60 * 60;
async function derive(password: string, salt: string) {
  return hex(await scryptAsync(encoder.encode(password), encoder.encode(salt), {
    N: 32768, r: 8, p: 3, dkLen: 32, maxmem: 64 * 1024 * 1024,
  }));
}
async function credential(password: string) {
  const salt = random();
  return salt + ':' + await derive(password, salt);
}
export async function passwordMatches(password: string, stored?: string) {
  const [salt, expected] = (stored || '0'.repeat(64) + ':' + '0'.repeat(64)).split(':');
  const actual = await derive(password, salt);
  let different = 0;
  for (let i = 0; i < actual.length; i++) different |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return different === 0 && Boolean(stored);
}
const json = (data: unknown, status = 200, setCookie?: string) => Response.json(data, {
  status, headers: { 'cache-control': 'no-store', ...(setCookie ? { 'set-cookie': setCookie } : {}) },
});
const sessionCookie = (value: string, age: number) =>
  `${cookie}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Strict`;
const generic = () => json({ accepted: true }, 202);

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type')?.split(';')[0];
  if ((type !== 'application/json' && type !== 'application/x-www-form-urlencoded') || !request.body) throw Error();
  const reader = request.body.getReader();
  let size = 0;
  let text = '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); throw Error(); }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  if (type === 'application/x-www-form-urlencoded') return Object.fromEntries(new URLSearchParams(text));
  const body: unknown = JSON.parse(text);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
  return body as Record<string, unknown>;
}

export function isMobileBearerRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  return tokenFormat.test(bearer) && !request.headers.get('cookie');
}

export function hasValidMutationOrigin(request: Request, env: AuthEnvironment): boolean {
  if (!env.AUTH_ORIGIN) return false;
  if (request.headers.get('origin') === env.AUTH_ORIGIN) return true;
  // Native mobile clients carry an explicit Authorization Bearer token without browser ambient cookies
  if (request.headers.get('x-client-type')?.toLowerCase() === 'mobile' && isMobileBearerRequest(request)) {
    return true;
  }
  return false;
}

async function requestSessionHash(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (tokenFormat.test(bearer)) return await sha(bearer);
  }
  const rawSession = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(cookie + '='))?.slice(cookie.length + 1);
  return rawSession && tokenFormat.test(rawSession) ? await sha(rawSession) : '';
}

export async function currentAccount(request: Request, env: AuthEnvironment, admin = false) {
  const db = env.AUTH_DB;
  const url = new URL(request.url);
  if (!db || env.AUTH_ORIGIN !== url.origin || url.protocol !== 'https:') return null;
  // Admin sessions are browser-cookie-only, require MFA and must match the configured owner ID.
  const nativeRequest = Boolean(request.headers.get('authorization') || request.headers.get('x-client-type')?.toLowerCase() === 'mobile');
  if (admin && nativeRequest) return null;
  const sessionHash = await requestSessionHash(request);
  if (!sessionHash) return null;
  const rule = admin ? "u.role='admin' AND s.mfa=1 AND u.id=?"
    : nativeRequest ? "u.role IN ('buyer','seller')"
    : "(u.role IN ('buyer','seller') OR (u.role='admin' AND s.mfa=1 AND u.id=?))";
  return db.prepare('SELECT u.id,u.email,u.role FROM cnc_auth_sessions s JOIN cnc_auth_users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND u.verified=1 AND u.suspended=0 AND ' + rule)
    .bind(sessionHash, Date.now(), ...(admin || !nativeRequest ? [env.ADMIN_ACCOUNT_ID ?? ''] : []))
    .first<Pick<User, 'id' | 'email' | 'role'>>();
}
export async function authRoute(request: Request, env: AuthEnvironment) {
  const db = env.AUTH_DB;
  const url = new URL(request.url);
  if (!db || !env.AUTH_ORIGIN || env.AUTH_ORIGIN !== url.origin || url.protocol !== 'https:') {
    return json({ error: 'Authentication unavailable' }, 503);
  }
  const action = url.pathname.replace(/^\/api\/(?:v1\/)?auth\//, '');
  const now = Date.now();
  if (action === 'me' && request.method === 'GET') {
    const user = await currentAccount(request, env);
    return user ? json({ authenticated: true, user }) : json({ authenticated: false, error: 'Sign-in required' }, 401);
  }
  const sessionHash = await requestSessionHash(request);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const isMobileHeader = request.headers.get('x-client-type')?.toLowerCase() === 'mobile';
  if (request.headers.get('origin') !== url.origin && !isMobileHeader) return json({ error: 'Invalid request origin' }, 403);
  if (action === 'logout') {
    if (sessionHash) await db.prepare('DELETE FROM cnc_auth_sessions WHERE hash=?').bind(sessionHash).run();
    return json({ signedOut: true }, 200, sessionCookie('', 0));
  }
  if (!['register','login','admin-login','verify','request-reset','reset'].includes(action)) return json({ error: 'Unknown operation' }, 404);

  let body: Record<string, unknown>;
  try { body = await readBody(request); }
  catch { return json({ error: 'Invalid request' }, 400); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const token = typeof body.token === 'string' ? body.token : '';
  const emailRequired = ['register','login','admin-login','request-reset'].includes(action);
  if (emailRequired && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return json({ error: 'Invalid email' }, 400);
  if (['login','admin-login','reset'].includes(action) && (password.length < 12 || password.length > 128)) return json({ error: 'Invalid password length' }, 400);

  async function permit(key: string, max: number) {
    const window = Math.floor(now / 600000);
    return db!.prepare(`INSERT INTO cnc_auth_rate VALUES (?,?,1) ON CONFLICT(bucket) DO UPDATE SET
      window=excluded.window, attempts=CASE WHEN cnc_auth_rate.window=excluded.window THEN cnc_auth_rate.attempts+1 ELSE 1 END
      WHERE cnc_auth_rate.window<excluded.window OR (cnc_auth_rate.window=excluded.window AND cnc_auth_rate.attempts<?)
      RETURNING attempts`).bind(await sha(key), window, max).first();
  }
  // Only use the platform's ingress-provided client address; absent addresses share a restrictive bucket.
  const client = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await permit('client:' + client, 25)) || (email && !(await permit(action + ':' + email, 5)))) {
    return action === 'register' || action === 'request-reset' ? generic() : json({ error: 'Try again later' }, 429);
  }
  const user = email ? await db.prepare('SELECT * FROM cnc_auth_users WHERE email=?').bind(email).first<User>() : null;
  if (action === 'admin-login') {
    if (isMobileHeader) return json({ error: 'Admin sign-in unavailable to mobile clients' }, 403);
    if (!env.ADMIN_ACCOUNT_ID || !env.ADMIN_TOTP_SECRET_HEX) return json({ error: 'Administrator sign-in unavailable' },503);
    const valid = await passwordMatches(password,user?.credential);
    if (!valid || !user || user.id !== env.ADMIN_ACCOUNT_ID || user.role !== 'admin' || !user.verified || user.suspended) {
      return json({error:'Invalid credentials or code'},401);
    }
    const step = await verifyTotp(env.ADMIN_TOTP_SECRET_HEX,typeof body.code === 'string' ? body.code : '',now);
    if (step === null) return json({error:'Invalid credentials or code'},401);
    const fresh = random();
    const rows = await db.batch([
      db.prepare(`INSERT INTO cnc_admin_mfa_steps SELECT id,? FROM cnc_auth_users
        WHERE id=? AND credential=? AND verified=1 AND suspended=0 AND role='admin'
        ON CONFLICT(user_id) DO UPDATE SET last_step=excluded.last_step
        WHERE cnc_admin_mfa_steps.last_step<excluded.last_step RETURNING user_id`).bind(step,user.id,user.credential),
      db.prepare('DELETE FROM cnc_auth_sessions WHERE user_id=? AND mfa=1 AND changes()=1').bind(user.id),
    ]) as {results: unknown[]}[];
    if (!rows[0]?.results.length) return json({error:'Invalid credentials or code'},401);
    const issued = await db.prepare(`INSERT INTO cnc_auth_sessions (hash,user_id,expires,mfa)
      SELECT ?,id,?,1 FROM cnc_auth_users WHERE id=? AND credential=? AND role='admin' AND verified=1 AND suspended=0
      AND (SELECT last_step FROM cnc_admin_mfa_steps WHERE user_id=cnc_auth_users.id)=? RETURNING hash`)
      .bind(await sha(fresh),now+15*60_000,user.id,user.credential,step).first();
    return issued ? json({signedIn:true,user:{id:user.id,email:user.email,role:'admin',sellerStatus:'none'}},200,sessionCookie(fresh,900)) : json({error:'Invalid credentials or code'},401);
  }
  if (action === 'login') {
    if (!(await passwordMatches(password, user?.credential)) || !user || !user.verified || user.suspended || user.role === 'admin') {
      return json({ error: 'Invalid credentials or account unavailable' }, 401);
    }
    const fresh = random();
    const issued = await db.batch([
      db.prepare('DELETE FROM cnc_auth_sessions WHERE hash=? AND user_id=?').bind(sessionHash,user.id),
      db.prepare(`INSERT INTO cnc_auth_sessions (hash,user_id,expires)
        SELECT ?,id,? FROM cnc_auth_users WHERE id=? AND credential=? AND verified=1 AND suspended=0 AND role IN ('buyer','seller') RETURNING hash`)
        .bind(await sha(fresh),now + sessionSeconds*1000,user.id,user.credential),
    ]) as {results: unknown[]}[];
    if (!issued[1]?.results.length) return json({ error: 'Invalid credentials or account unavailable' }, 401);
    if (isMobileHeader) {
      return json({
        signedIn: true,
        user: { id: user.id, email: user.email, role: user.role },
        token: fresh,
        expiresInSeconds: sessionSeconds,
      }, 200);
    }
    return json({ signedIn: true, user: { id: user.id, email: user.email, role: user.role } }, 200, sessionCookie(fresh, sessionSeconds));
  }

  if (action === 'register' || action === 'request-reset') {
    if (!emailConfigured(env)) return json({ error: 'Email delivery unavailable' }, 503);
    let target = user;
    if (action === 'register') {
      // Verification precedes password selection, so a stranger cannot pre-set the account password.
      const id = crypto.randomUUID();
      if (!target) {
        await db.prepare('INSERT INTO cnc_auth_users (id,email,credential,role) VALUES (?,?,?,?) ON CONFLICT(email) DO NOTHING')
          .bind(id,email,'','buyer').run();
        target = await db.prepare('SELECT * FROM cnc_auth_users WHERE email=?').bind(email).first<User>();
      }
    }
    if (!target || target.suspended || target.role === 'admin' || Boolean(target.verified) !== (action === 'request-reset')) return generic();
    const purpose = action === 'register' ? 'verify' : 'reset';
    const fresh = random();
    const hash = await sha(fresh);
    await db.prepare(`INSERT INTO cnc_auth_tokens VALUES (?,?,?,?)
      ON CONFLICT(user_id,purpose) DO UPDATE SET hash=excluded.hash,expires=excluded.expires`)
      .bind(hash,target.id,purpose,now+900000).run();
    try {
      await deliverAuthEmail(env,target.email,fresh,purpose,hash);
    } catch {
      await db.prepare('DELETE FROM cnc_auth_tokens WHERE hash=?').bind(hash).run();
    }
    return generic();
  }

  if (!tokenFormat.test(token)) return json({ error: 'Invalid or expired token' }, 400);
  if (password.length < 12 || password.length > 128) return json({ error: 'Invalid password length' }, 400);
  const purpose = action === 'verify' ? 'verify' : 'reset';
  const hash = await sha(token);
  const eligible = await db.prepare(`SELECT u.id FROM cnc_auth_tokens t JOIN cnc_auth_users u ON u.id=t.user_id
    WHERE t.hash=? AND t.purpose=? AND t.expires>? AND u.suspended=0 AND u.role IN ('buyer','seller') AND u.verified=?`)
    .bind(hash,purpose,now,action === 'verify' ? 0 : 1).first<{id:string}>();
  if (!eligible) return json({ error: 'Invalid or expired token' }, 400);
  const replacement = await credential(password);
  const results = await db.batch([
    db.prepare(`UPDATE cnc_auth_users SET credential=?,verified=1,role=CASE WHEN verified=0 THEN ? ELSE role END WHERE id=? AND suspended=0 AND role IN ('buyer','seller') AND verified=?
      AND EXISTS (SELECT 1 FROM cnc_auth_tokens WHERE hash=? AND user_id=cnc_auth_users.id AND purpose=? AND expires>?) RETURNING id`)
      .bind(replacement,body.role === 'seller' ? 'seller' : 'buyer',eligible.id,action === 'verify' ? 0 : 1,hash,purpose,Date.now()),
    db.prepare('DELETE FROM cnc_auth_sessions WHERE user_id=? AND changes()=1').bind(eligible.id),
    db.prepare('DELETE FROM cnc_auth_tokens WHERE hash=?').bind(hash),
  ]) as {results: unknown[]}[];
  return results[0]?.results.length ? json({ completed: true }) : json({ error: 'Invalid or expired token' }, 400);
}
