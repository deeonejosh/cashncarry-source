import { createHmac } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import { flutterwaveRoute, verifiedAmount, verifyFlutterwaveSignature } from '../../../deploy/chatgpt-sites/flutterwave';
import type { PaymentEnvironment } from '../../../deploy/chatgpt-sites/flutterwave';

afterEach(() => vi.unstubAllGlobals());
const fixture = { id: 1, tx_ref: 'fixture', status: 'successful', currency: 'NGN', amount: 12.50 };
const payment = { reference: 'fixture', amount_minor: 1250 };
const origin = 'https://market.example.invalid';
const raw = JSON.stringify({event:'charge.completed',data:fixture});
const signature = createHmac('sha256','fixture-secret').update(raw).digest('base64');
const request = (header=signature) => new Request(origin+'/api/payments/webhooks/flutterwave',{
  method:'POST',headers:{'flutterwave-signature':header},body:raw,
});

it('checks signatures against the exact callback bytes',async () => {
  expect(await verifyFlutterwaveSignature(new TextEncoder().encode(raw),signature,'fixture-secret')).toBe(true);
  expect(await verifyFlutterwaveSignature(new TextEncoder().encode(raw+' '),signature,'fixture-secret')).toBe(false);
});

it('requires exact transaction ID, reference, status, currency and amount', () => {
  expect(verifiedAmount(fixture,'1',payment)).toBe(true);
  for (const change of [{id:2},{tx_ref:'other'},{status:'pending'},{currency:'USD'},{amount:12.49}]) {
    expect(verifiedAmount({...fixture,...change},'1',payment)).toBe(false);
  }
});

it('rejects forged callbacks, verifies with the provider and acknowledges a replay without a second write',async () => {
  let applied = false;
  const prepare = vi.fn((sql:string) => ({bind:() => ({first:async () => {
    if (sql.startsWith('UPDATE')) { applied=true; return {reference:'fixture'}; }
    return {...payment,transaction_id:applied?'1':null};
  }})}));
  const env = {AUTH_DB:{prepare},AUTH_ORIGIN:origin,FLW_MODE:'sandbox',FLW_SECRET_KEY:'FLWSECK_TEST-fixture',FLW_WEBHOOK_HASH:'fixture-secret',FLW_WEBHOOK_SIGNATURE:'hmac-sha256'} as unknown as PaymentEnvironment;
  const provider=vi.fn().mockResolvedValueOnce(Response.json({status:'success',data:{...fixture,amount:12}}))
    .mockResolvedValueOnce(Response.json({status:'success',data:fixture}));
  vi.stubGlobal('fetch',provider);
  expect((await flutterwaveRoute(request('invalid'),env))?.status).toBe(401);
  expect((await flutterwaveRoute(request(),{...env,FLW_MODE:'live'}))?.status).toBe(503);
  expect((await flutterwaveRoute(request(),env))?.status).toBe(409);
  expect(applied).toBe(false);
  expect((await flutterwaveRoute(request(),env))?.status).toBe(200);
  expect((await flutterwaveRoute(request(),env))?.status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(2);
  expect(prepare.mock.calls.filter(([sql])=>sql.startsWith('UPDATE'))).toHaveLength(1);
});
