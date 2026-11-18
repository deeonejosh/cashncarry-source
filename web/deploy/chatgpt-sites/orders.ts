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
    const {results} = await db.prepare(`SELECT o.id,o.buyer,o.status,o.payment_state,o.delivery_address,o.created,
      SUM(i.quantity*i.price_minor) AS total_minor
      FROM cnc_orders o JOIN cnc_order_items i ON i.order_id=o.id WHERE o.buyer=?
      GROUP BY o.id ORDER BY o.created DESC,o.id LIMIT 50`).bind(account.id).all<{
        id:string;status:string;payment_state:string;created:number;total_minor:number
      }>();
    // Order tracking is seller-scoped. An order spanning multiple sellers
    // exposes one real fulfilment record per seller, not an invented single
    // tracking number or premature 'delivered' state.
    const {results:fulfilments} = await db.prepare(`
      SELECT f.order_id,f.seller_id,COALESCE(st.name,'') AS store_name,
             f.status,f.carrier,f.tracking_number,f.updated_at
      FROM cnc_seller_order_fulfilments f
      JOIN cnc_orders o ON o.id=f.order_id
      LEFT JOIN cnc_seller_stores st ON st.owner=f.seller_id
      WHERE o.buyer=? AND o.id IN (
        SELECT id FROM cnc_orders WHERE buyer=? ORDER BY created DESC,id LIMIT 50
      )
      ORDER BY f.updated_at DESC LIMIT 150
    `).bind(account.id,account.id).all<{
      order_id:string;seller_id:string;store_name:string;status:string;
      carrier:string;tracking_number:string;updated_at:number
    }>();
    // Item details are selected from the buyer's own orders, never from
    // client-provided prices. All 50 visible orders can include multiple sellers.
    const {results:items} = await db.prepare(`
      SELECT i.order_id,i.product_id,i.seller AS seller_id,
             COALESCE(st.name,'') AS seller_name,
             i.name,i.quantity,i.price_minor,COALESCE(p.image,'') AS image
      FROM cnc_order_items i
      JOIN cnc_orders o ON o.id=i.order_id
      LEFT JOIN cnc_seller_stores st ON st.owner=i.seller
      LEFT JOIN cnc_seller_products p ON p.id=i.product_id
      WHERE o.buyer=? AND o.id IN (
        SELECT id FROM cnc_orders WHERE buyer=? ORDER BY created DESC,id LIMIT 50
      )
      ORDER BY o.created DESC,i.product_id LIMIT 2000
    `).bind(account.id,account.id).all<{
      order_id:string;product_id:string;seller_id:string;seller_name:string;
      name:string;quantity:number;price_minor:number;image:string
    }>();
    const itemsByOrder = new Map<string,typeof items>();
    for (const item of items) {
      const group=itemsByOrder.get(item.order_id)||[];
      group.push(item);
      itemsByOrder.set(item.order_id,group);
    }
    const byOrder = new Map<string,typeof fulfilments>();
    for (const item of fulfilments) {
      const group=byOrder.get(item.order_id)||[];
      group.push(item);
      byOrder.set(item.order_id,group);
    }
    return json({orders:results.map(order=>({
      ...order,items:itemsByOrder.get(order.id)||[],
      fulfilments:byOrder.get(order.id)||[]
    }))});
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
