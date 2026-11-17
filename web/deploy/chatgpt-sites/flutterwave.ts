import {currentAccount, readBody, type AuthEnvironment, hasValidMutationOrigin } from './new-auth';


export interface PaymentEnvironment extends AuthEnvironment {
  PAYMENTS_ENABLED?: string;
  FLW_MODE?: string;
  FLW_SECRET_KEY?: string;
  FLW_WEBHOOK_HASH?: string;
  FLW_WEBHOOK_SIGNATURE?: string;
}

const json = (data: unknown, status=200) => Response.json(data,{status,headers:{'cache-control':'no-store'}});
const encoder = new TextEncoder();
type Payment = { reference: string; amount_minor: number; checkout_url: string | null; transaction_id: string | null };

export async function verifyFlutterwaveSignature(body: Uint8Array, signature: string, secret: string) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(signature),char=>char.charCodeAt(0)),new Uint8Array(body));
}

export function verifiedAmount(data: Record<string,unknown>, id: string, payment: Pick<Payment,'reference'|'amount_minor'>) {
  return String(data.id)===id && data.tx_ref===payment.reference && data.status==='successful'
    && data.currency==='NGN' && typeof data.amount==='number' && Number.isFinite(data.amount)
    && data.amount===payment.amount_minor/100;
}

export async function flutterwaveRoute(request: Request, env: PaymentEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  const webhook = url.pathname === '/api/payments/webhooks/flutterwave';
  const status = url.pathname === '/api/payments/status';
  if (!webhook && !status && url.pathname !== '/api/payments/initialize') return null;
  if (request.method !== (status ? 'GET' : 'POST')) return json({error:'Method not allowed'},405);
  const paymentsEnabled = env.PAYMENTS_ENABLED === 'true';
  if (!webhook && !status && !paymentsEnabled) {
    return json({error:'Payments temporarily unavailable',code:'PAYMENTS_DISABLED',paymentsEnabled:false},503);
  }
  if (webhook && !paymentsEnabled) {
    return json({error:'Payments temporarily unavailable',code:'PAYMENTS_DISABLED',paymentsEnabled:false},503);
  }
  const db=env.AUTH_DB, secret=env.FLW_SECRET_KEY;
  if (status && !paymentsEnabled) {
    if (!db || url.protocol!=='https:' || url.origin!==env.AUTH_ORIGIN) {
      return json({error:'Payments temporarily unavailable',code:'PAYMENTS_DISABLED',paymentsEnabled:false},503);
    }
    const buyer = await currentAccount(request,env);
    if (!buyer || buyer.role !== 'buyer') return json({error:'Buyer sign-in required'},401);
    const id = url.searchParams.get('order_id');
    if (!id || id.length > 100) return json({error:'Invalid order'},400);
    const state = await db.prepare(`SELECT o.status FROM cnc_orders o WHERE o.id=? AND o.buyer=?`).bind(id,buyer.id).first();
    return state ? json({...state, paymentsEnabled: false}) : json({error:'Order unavailable'},404);
  }
  if (!db || env.FLW_MODE!=='sandbox' || !secret?.startsWith('FLWSECK_TEST-') || !env.FLW_WEBHOOK_HASH
      || env.FLW_WEBHOOK_SIGNATURE!=='hmac-sha256' || url.protocol!=='https:' || url.origin!==env.AUTH_ORIGIN) {
    return json({error:'Payment sandbox unavailable'},503);
  }
  const provider = (path: string, body?: unknown) => fetch('https://api.flutterwave.com/v3/'+path,{
    method:body ? 'POST':'GET',redirect:'manual',signal:AbortSignal.timeout(8000),
    headers:{authorization:'Bearer '+secret,'content-type':'application/json'},...(body ? {body:JSON.stringify(body)} : {}),
  });
  if (status) {
    const buyer = await currentAccount(request,env);
    if (!buyer || buyer.role !== 'buyer') return json({error:'Buyer sign-in required'},401);
    const id = url.searchParams.get('order_id');
    if (!id || id.length > 100) return json({error:'Invalid order'},400);
    const state = await db.prepare(`SELECT CASE WHEN p.transaction_id IS NOT NULL THEN 'paid' ELSE o.status END AS status
      FROM cnc_orders o LEFT JOIN cnc_flutterwave_payments p ON p.order_id=o.id WHERE o.id=? AND o.buyer=?`).bind(id,buyer.id).first();
    return state ? json({...state, paymentsEnabled: true}) : json({error:'Order unavailable'},404);
  }
  if (!webhook) {
    if (!hasValidMutationOrigin(request, env)) return json({error:'Invalid origin'},403);
    const buyer=await currentAccount(request,env);
    if (!buyer) return json({error:'Sign-in required'},401);
    if (buyer.role!=='buyer') return json({error:'Buyer access required'},403);
    let input: Record<string,unknown>;
    try {input=await readBody(request);} catch {return json({error:'Invalid request'},400);}
    if (typeof input.order_id!=='string' || input.order_id.length>100) return json({error:'Invalid order'},400);
    const order=await db.prepare(`SELECT o.id,SUM(i.price_minor*i.quantity) AS total
      FROM cnc_orders o JOIN cnc_order_items i ON i.order_id=o.id
      WHERE o.id=? AND o.buyer=? AND o.status='awaiting_payment' GROUP BY o.id`).bind(input.order_id,buyer.id).first<{id:string;total:number}>();
    if (!order || !Number.isSafeInteger(order.total) || order.total<=0) return json({error:'Order unavailable'},404);
    const created=await db.prepare(`INSERT INTO cnc_flutterwave_payments (order_id,reference,amount_minor)
      SELECT id,?,? FROM cnc_orders WHERE id=? AND buyer=? AND status='awaiting_payment'
      ON CONFLICT(order_id) DO NOTHING RETURNING reference`).bind('cnc-test-'+crypto.randomUUID(),order.total,order.id,buyer.id).first<{reference:string}>();
    if (!created) {
      const previous=await db.prepare('SELECT checkout_url,transaction_id FROM cnc_flutterwave_payments WHERE order_id=?').bind(order.id).first<Payment>();
      if (previous?.checkout_url && !previous.transaction_id) return json({checkout_url:previous.checkout_url});
      return json({error:'Payment already initiated or awaiting reconciliation'},409);
    }
    let checkout: URL;
    try {
      const response=await provider('payments',{tx_ref:created.reference,amount:order.total/100,currency:'NGN',
        redirect_url:url.origin+'/account',customer:{email:buyer.email}});
      if (!response.ok) return json({error:'Sandbox checkout unavailable'},502);
      const result=await response.json() as {status?:string;data?:{link?:string}} | null;
      if (result?.status!=='success' || typeof result.data?.link!=='string') return json({error:'Sandbox checkout unavailable'},502);
      checkout=new URL(result.data.link);
    } catch {
      return json({error:'Sandbox checkout unavailable'},502);
    }
    if (checkout.origin!=='https://checkout.flutterwave.com' || checkout.username || checkout.password) return json({error:'Invalid checkout URL'},502);
    await db.prepare('UPDATE cnc_flutterwave_payments SET checkout_url=? WHERE reference=?').bind(checkout.href,created.reference).run();
    return json({checkout_url:checkout.href});
  }

  const reader=request.body?.getReader();
  if (!reader) return json({error:'Missing callback'},400);
  const raw=new Uint8Array(65536);
  let size=0;
  for (;;) {
    const {done,value}=await reader.read();
    if (done) break;
    if (size+value.byteLength>raw.length) {await reader.cancel();return json({error:'Callback too large'},413);}
    raw.set(value,size);size+=value.byteLength;
  }
  const bytes=raw.subarray(0,size);
  if (!await verifyFlutterwaveSignature(bytes,request.headers.get('flutterwave-signature')??'',env.FLW_WEBHOOK_HASH)) {
    return json({error:'Invalid signature'},401);
  }
  let event: {event?:string;data?:{id?:number;tx_ref?:string}} | null;
  try {event=JSON.parse(new TextDecoder().decode(bytes));} catch {return json({error:'Invalid callback'},400);}
  if (event?.event!=='charge.completed') return json({received:true});
  const id=String(event.data?.id), ref=event.data?.tx_ref;
  if (!/^[1-9]\d{0,15}$/.test(id) || typeof ref!=='string' || ref.length>100) return json({error:'Invalid transaction'},400);
  const payment=await db.prepare('SELECT reference,amount_minor,transaction_id FROM cnc_flutterwave_payments WHERE reference=?').bind(ref).first<Payment>();
  if (!payment) return json({received:true});
  if (payment.transaction_id===id) return json({received:true});
  if (payment.transaction_id) return json({error:'Payment already reconciled'},409);
  let response: {status?:string;data?:Record<string,unknown>} | null;
  try {
    const verified=await provider('transactions/'+id+'/verify');
    if (!verified.ok) return json({error:'Verification unavailable'},502);
    response=await verified.json();
  } catch {
    return json({error:'Verification unavailable'},502);
  }
  if (response?.status!=='success' || !response.data || !verifiedAmount(response.data,id,payment)) return json({error:'Payment mismatch'},409);
  const updated=await db.prepare(`UPDATE cnc_flutterwave_payments SET transaction_id=?,paid_at=unixepoch()
    WHERE reference=? AND transaction_id IS NULL AND EXISTS (SELECT 1 FROM cnc_orders WHERE id=order_id AND status='awaiting_payment') RETURNING reference`)
    .bind(id,ref).first();
  if (updated) return json({received:true});
  const replay=await db.prepare('SELECT transaction_id FROM cnc_flutterwave_payments WHERE reference=?').bind(ref).first<{transaction_id:string}>();
  return replay?.transaction_id===id ? json({received:true}) : json({error:'Payment state changed'},409);
}
