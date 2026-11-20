import assert from 'node:assert/strict';
import { test } from 'node:test';
import { broadcastStatus, streamRoute } from '../../../deploy/chatgpt-sites/stream';

const input = '1234567890abcdef1234567890abcdef';
const origin = 'https://market.example.invalid';
const env = {
  AUTH_ORIGIN: origin,
  STREAM_SELLER_ID: 'fixture-seller',
  STREAM_WHEP_URL: `https://customer-fixture.cloudflarestream.com/${input}/webRTC/play`,
  STREAM_STATUS_TOKEN: 'fixture-token',
};

test('publishing rejects unauthenticated and cross-origin requests', async () => {
  const publish = (caller: string) => new Request(origin + '/api/live/cloudflare/publish', {
    method: 'POST', headers: { origin: caller },
  });
  assert.equal((await streamRoute(publish(origin), env))?.status, 401);
  assert.equal((await streamRoute(publish('https://other.invalid'), env))?.status, 403);
});

test('only accepts explicit provider lifecycle results for the configured input', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: URL, init: RequestInit) => {
    assert.equal(url.href, `https://customer-fixture.cloudflarestream.com/${input}/lifecycle`);
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer fixture-token');
    assert.equal(init.redirect, 'manual');
    return Response.json({ isInput: true, live: true });
  });
  assert.equal(await broadcastStatus(env), true);
  fetchMock.mock.mockImplementation(async () => Response.json({ isInput: true, live: false }));
  assert.equal(await broadcastStatus(env), false);
  fetchMock.mock.mockImplementation(async () => Response.json({ live: true }));
  assert.equal(await broadcastStatus(env), null);
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  assert.equal(await broadcastStatus(env), null);
  assert.equal(await broadcastStatus({ ...env, STREAM_STATUS_TOKEN: undefined }), null);
  assert.equal(await broadcastStatus({ ...env, STREAM_WHEP_URL: 'https://example.invalid/webRTC/play' }), null);
  assert.equal(fetchMock.mock.callCount(), 4);
});
