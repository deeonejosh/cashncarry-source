import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const [{ text }] = (await build({
  entryPoints: ['deploy/chatgpt-sites/recovery.ts'], bundle: true, platform: 'browser', format: 'esm', write: false,
})).outputFiles;
const runtime = new Miniflare({
  modules: true, compatibilityDate: '2026-08-06', d1Databases: ['DB'],
  script: `${text}
export default { async fetch(request, env) {
  const { action, email, token, time, fail, suspended } = await request.json();
  const account = email => email && /^([a-z0-9-]+)@example\\.invalid$/.test(email) && !email.startsWith('missing')
    ? { id: email.split('@')[0], email, role: email.startsWith('admin') ? 'admin' : email.startsWith('seller') ? 'seller' : 'buyer',
        suspended: Boolean(suspended), requiresTwoFactor: email.startsWith('mfa') } : null;
  let delivered = null;
  const service = createRecoveryService({
    db: env.DB, now: () => time,
    accounts: { byEmail: async email => account(email), byId: async id => account(id + '@example.invalid') },
    delivery: { send: async (_, value) => { delivered = value; if (fail) throw new Error('test transport'); } },
  });
  let result = null;
  if (action === 'request') await service.request(email, 'fixture-client');
  if (action === 'redeem') result = await service.redeem(token);
  if (action === 'validate') result = (await service.validate(token))?.id ?? null;
  if (action === 'revoke') await service.revoke(token);
  return Response.json({ delivered, result });
}};`,
});

try {
  const db = await runtime.getD1Database('DB');
  const schema = await readFile('deploy/chatgpt-sites/recovery-schema.sql', 'utf8');
  await db.exec(schema.split('\n').filter(line => !line.startsWith('--')).join(' ').replace(/;\s*/g, ';\n').trim());
  const base = 600000;
  async function call(action, fields = {}) {
    const res = await runtime.dispatchFetch('http://localhost', { method: 'POST', body: JSON.stringify({ action, time: base, ...fields }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async function request(name, fields = {}) {
    return (await call('request', { email: name + '@example.invalid', ...fields })).delivered;
  }
  const token = await request('buyer');
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(await db.prepare('SELECT hash FROM recovery_tokens WHERE hash = ?').bind(token).first(), null);
  const pair = await Promise.all([call('redeem', { token }), call('redeem', { token })]);
  const sessions = pair.map(item => item.result).filter(Boolean);
  assert.equal(sessions.length, 1);
  const [session] = sessions;
  assert.equal((await call('validate', { token: session })).result, 'buyer');
  assert.equal((await call('validate', { token: session, suspended: true })).result, null);
  assert.equal((await call('validate', { token: session, time: base + 8 * 60 * 60_000 })).result, null);
  assert.equal((await call('redeem', { token: 'a'.repeat(64) })).result, null);
  assert.equal((await call('redeem', { token: await request('expired'), time: base + 600000 })).result, null);
  await call('revoke', { token: session });
  assert.equal((await call('validate', { token: session })).result, null);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM recovery_audit').first()).n, 1);
  for (const name of ['missing', 'admin', 'seller', 'mfa']) assert.equal(await request(name), null);
  assert.equal(await request('suspended', { suspended: true }), null);
  const failed = await request('delivery-failed', { fail: true });
  assert.equal((await call('redeem', { token: failed })).result, null);
  const first = await request('limited');
  const second = await request('limited');
  assert.equal((await call('redeem', { token: first })).result, null);
  assert.match(second, /^[0-9a-f]{64}$/);
  assert.match(await request('limited'), /^[0-9a-f]{64}$/);
  assert.equal(await request('limited'), null);
  console.log('20 isolated recovery assertions passed');
} finally {
  await runtime.dispose();
}
