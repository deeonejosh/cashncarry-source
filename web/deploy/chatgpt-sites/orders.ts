import {currentAccount, readBody, type AuthEnvironment, hasValidMutationOrigin } from './new-auth';


const routes = new Set(['/api/orders','/api/checkout','/api/orders/cancel']);
const json = (data: unknown,status=200) => Response.json(data,{status,headers:{'cache-control':'no-store'}});

export async function ordersRoute(request: Request, env: AuthEnvironment & { ORDER_RESERVATIONS?: string }): Promise<Response | null> {
  const url = new URL(request.url);
  if (!routes.has(url.pathname)) return null;
  if (!env.AUTH_DB || env.ORDER_RESERVATIONS !== 'enabled') return json({error:'Order service unavailable'},503);
  const account = await currentAccount(request,env);
  if (!account) return json({error:'Sign-in required'},401);
  if (!['buyer','seller'].includes(account.role)) return json({error:'Buyer or seller account required'},403);
  const db = env.AUTH_DB;
  if (url.pathname === '/api/orders') {
    if (request.method !== 'GET') return json({error:'Method not allowed'},405);
    const {results} = await db.prepare(`SELECT o.id,o.status,o.created,SUM(i.quantity*i.price_minor) AS total_minor
      FROM cnc_orders o JOIN cnc_order_items i ON i.order_id=o.id WHERE o.buyer=?
      GROUP BY o.id ORDER BY o.created DESC,o.id LIMIT 50`).bind(account.id).all();
    return json({orders:results});
  }
  if (request.method !== 'POST') return json({error:'Method not allowed'},405);
  if (!hasValidMutationOrigin(request, env)) return json({error:'Invalid request origin'},403);
  let body: Record<string,unknown>;
  try { body=await readBody(request); } catch { return json({error:'Invalid request'},400); }
  if (url.pathname === '/api/orders/cancel') {
    if (typeof body.id !== 'string' || body.id.length > 100) return json({error:'Invalid order'},400);
    try {
      const cancelled = await db.prepare(`UPDATE cnc_orders SET status='cancelled'
        WHERE id=? AND buyer=? AND status='awaiting_payment' RETURNING id,status`).bind(body.id,account.id).first();
      return cancelled ? json({order:cancelled}) : json({error:'Order unavailable'},409);
    } catch (error) {
      if (error instanceof Error && error.message.includes('CNC_PAYMENT_IN_PROGRESS')) return json({error:'Payment awaiting reconciliation'},409);
      throw error;
    }
  }
  if (typeof body.request_id !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(body.request_id)
      || typeof body.address_id !== 'string' || body.address_id.length > 100) return json({error:'Invalid order request'},400);
  try {
    await db.prepare(`INSERT INTO cnc_orders (id,buyer,request_id,address_id,delivery_address)
      SELECT ?,user_id,?,id,json_object('recipient',recipient,'line',line,'city',city,'state',state)
      FROM cnc_buyer_addresses WHERE id=? AND user_id=? ON CONFLICT(buyer,request_id) DO NOTHING`)
      .bind(crypto.randomUUID(),body.request_id,body.address_id,account.id).run();
  } catch (error) {
    if (error instanceof Error && /CNC_CART_EMPTY|CNC_STOCK_UNAVAILABLE/.test(error.message)) return json({error:'Cart is empty or stock unavailable'},409);
    throw error;
  }
  const order = await db.prepare('SELECT id,status,address_id FROM cnc_orders WHERE buyer=? AND request_id=?')
    .bind(account.id,body.request_id).first<{id:string;status:string;address_id:string}>();
  if (!order) return json({error:'Delivery address unavailable'},400);
  if (order.address_id !== body.address_id) return json({error:'Order request ID already used'},409);
  return json({order:{id:order.id,status:order.status}});
}
