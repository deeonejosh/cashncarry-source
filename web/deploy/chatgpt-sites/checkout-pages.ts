import { currentAccount, type AuthEnvironment } from './new-auth';
import { ordersRoute } from './orders';
import { escape, page } from './catalog-pages';

export async function checkoutPage(request: Request, env: AuthEnvironment & { ORDER_RESERVATIONS?: string }): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/checkout' && url.pathname !== '/orders') return null;
  if (!env.AUTH_DB || env.ORDER_RESERVATIONS !== 'enabled') return page('Checkout unavailable','<h1>Checkout unavailable</h1>',503);
  const buyer = await currentAccount(request,env);
  if (!buyer) return new Response(null,{status:303,headers:{location:'/sign-in','cache-control':'no-store'}});
  if (buyer.role !== 'buyer') return page('Buyer access required','<h1>Buyer access required</h1>',403);
  if (request.method === 'POST') {
    const api = url.pathname === '/checkout' ? '/api/checkout' : '/api/orders/cancel';
    const result = await ordersRoute(new Request(new URL(api,url),request),env);
    if (result?.ok) return new Response(null,{status:303,headers:{location:'/orders','cache-control':'no-store'}});
    const data = await result?.json() as {error?: string} | undefined;
    return page('Order request unsuccessful',`<h1>Order request unsuccessful</h1><p>${escape(data?.error)}</p><a href="${url.pathname}">Return</a>`,result?.status ?? 503);
  }
  if (request.method !== 'GET') return new Response(null,{status:405,headers:{allow:'GET, POST'}});
  if (url.pathname === '/orders') {
    const {results} = await env.AUTH_DB.prepare('SELECT id,status FROM cnc_orders WHERE buyer=? ORDER BY created DESC,id LIMIT 50')
      .bind(buyer.id).all<{id:string;status:string}>();
    return page('Your orders',`<h1>Your orders</h1>${results.map(order => `<section class="card"><h2>Order ${escape(order.id)}</h2><p>${escape(order.status.replaceAll('_',' '))}</p>
      ${order.status === 'awaiting_payment' ? `<form method="post"><input type="hidden" name="id" value="${escape(order.id)}"><button>Cancel unpaid order</button></form>` : ''}</section>`).join('') || '<p>No orders yet.</p>'}<a href="/shop">Continue shopping</a>`);
  }
  const [addresses,cart] = await Promise.all([
    env.AUTH_DB.prepare('SELECT id,line,city FROM cnc_buyer_addresses WHERE user_id=? ORDER BY rowid DESC LIMIT 20').bind(buyer.id).all<{id:string;line:string;city:string}>(),
    env.AUTH_DB.prepare(`SELECT c.quantity,c.source,p.name,p.price_minor,p.stock,p.publication,p.archived FROM cnc_buyer_cart c
      LEFT JOIN cnc_seller_products p ON p.id=c.product WHERE c.buyer=?`).bind(buyer.id)
      .all<{quantity:number;source:string;name:string|null;price_minor:number|null;stock:number;publication:string;archived:number}>(),
  ]);
  if (!cart.results.length || cart.results.some(item => item.source !== 'replacement' || item.price_minor===null || item.stock<item.quantity || item.publication!=='published' || item.archived)) {
    return page('Review your cart','<h1>Review your cart</h1><p>Checkout needs in-stock staging products approved for ordering.</p><a href="/cart">Return to cart</a>',409);
  }
  if (!addresses.results.length) return page('Delivery address required','<h1>Delivery address required</h1><a href="/addresses">Add a delivery address</a>',409);
  const money = new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'});
  const total = cart.results.reduce((sum,item)=>sum+(item.price_minor ?? 0)*item.quantity,0);
  return page('Staging checkout',`<h1>Staging checkout</h1><ul>${cart.results.map(item=>`<li>${escape(item.name)} × ${item.quantity}</li>`).join('')}</ul>
    <p>Items total: ${money.format(total/100)}</p><p>This creates an unpaid test order.</p>
    <form class="account-form" method="post"><input type="hidden" name="request_id" value="${crypto.randomUUID()}">
    <label for="address_id">Delivery address</label><select id="address_id" name="address_id">${addresses.results.map(address=>`<option value="${escape(address.id)}">${escape(address.line)}, ${escape(address.city)}</option>`).join('')}</select>
    <button>Create test order</button></form>`);
}
