import { expect, it, vi } from 'vitest';
import { streamRoute } from '../../../deploy/chatgpt-sites/stream';
import { currentAccount } from '../../../deploy/chatgpt-sites/new-auth';
vi.mock('../../../deploy/chatgpt-sites/new-auth', () => ({currentAccount:vi.fn()}));

const origin = 'https://market.example.invalid';
const env = {
  AUTH_ORIGIN:origin, STREAM_SELLER_ID:'fixture-seller',
  STREAM_WHIP_URL:'https://customer-fixture.cloudflarestream.com/secret/webRTC/publish',
  STREAM_WHEP_URL:'https://customer-fixture.cloudflarestream.com/public/webRTC/play',
};
const request = (mode: string, allowedOrigin = origin) => new Request(origin+'/api/live/cloudflare/'+mode,{
  method:mode === 'publish' ? 'POST' : 'GET',headers:{origin:allowedOrigin},
});
it('requires an active session and reserves WHIP for the configured seller',async () => {
  vi.mocked(currentAccount).mockResolvedValue(null);
  expect((await streamRoute(request('publish'),env))?.status).toBe(401);
  vi.mocked(currentAccount).mockResolvedValue({id:'other',role:'seller',email:'fixture@example.invalid'});
  expect((await streamRoute(request('publish'),env))?.status).toBe(403);
  vi.mocked(currentAccount).mockResolvedValue({id:'fixture-seller',role:'seller',email:'fixture@example.invalid'});
  expect((await streamRoute(request('publish','https://other.invalid'),env))?.status).toBe(403);
  const response = await streamRoute(request('publish'),env);
  expect(await response?.json()).toEqual({whipUrl:env.STREAM_WHIP_URL});
  expect(response?.headers.get('cache-control')).toBe('no-store');
});
it('gives a buyer only playback and rejects a non-Cloudflare endpoint',async () => {
  vi.mocked(currentAccount).mockResolvedValue({id:'fixture-seller',role:'buyer',email:'fixture@example.invalid'});
  expect((await streamRoute(request('publish'),env))?.status).toBe(403);
  expect(await (await streamRoute(request('play'),env))?.json()).toEqual({whepUrl:env.STREAM_WHEP_URL});
  expect((await streamRoute(request('play'),{...env,STREAM_WHEP_URL:'https://other.invalid/play'}))?.status).toBe(503);
});
