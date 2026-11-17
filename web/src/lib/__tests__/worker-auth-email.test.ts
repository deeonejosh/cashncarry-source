import { afterEach, expect, it, vi } from 'vitest';
import { deliverAuthEmail, emailConfigured } from '../../../deploy/chatgpt-sites/auth-email';

afterEach(() => vi.unstubAllGlobals());

const env = { AUTH_RESEND_API_KEY: 'fixture-key', AUTH_EMAIL_FROM: 'Cash N Carry <test@example.invalid>' };

it('requires both sender and provider secret when a service binding is absent', () => {
  expect(emailConfigured({AUTH_EMAIL_FROM:env.AUTH_EMAIL_FROM})).toBe(false);
  expect(emailConfigured(env)).toBe(true);
});

it('sends through the fixed provider endpoint with a token-independent recipient and idempotency header', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, {status:202}));
  vi.stubGlobal('fetch',fetch);
  await deliverAuthEmail(env,'buyer@example.invalid','fixture-code','reset','fixture-id');
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('https://api.resend.com/emails');
  expect(options.redirect).toBe('manual');
  expect(options.headers['idempotency-key']).toBe('cashncarry-auth/fixture-id');
  expect(JSON.parse(options.body)).toMatchObject({to:['buyer@example.invalid'],subject:'Reset your Cash N Carry password'});
});

it('fails when the provider rejects a request without exposing its response body', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('provider detail',{status:403})));
  await expect(deliverAuthEmail(env,'buyer@example.invalid','fixture-code','verify','fixture-id')).rejects.toThrow('Authentication email provider rejected delivery');
});
