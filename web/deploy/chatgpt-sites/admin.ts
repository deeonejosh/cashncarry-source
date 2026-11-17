import { currentAccount, readBody, type AuthEnvironment } from './new-auth';
import { escape, page } from './catalog-pages';

export async function adminRoute(request: Request, env: AuthEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  if (!['/admin','/api/admin/moderation'].includes(url.pathname)) return null;
  if (!env.AUTH_DB || !env.ADMIN_ACCOUNT_ID || !env.ADMIN_TOTP_SECRET_HEX) return null;
  const account = await currentAccount(request,env,true);
  if (!account) return new Response(null,{status:403,headers:{'cache-control':'no-store'}});
  const db=env.AUTH_DB;
  if (request.method === 'GET') {
    const {results} = await db.prepare(`SELECT p.id,p.name,p.revision FROM cnc_seller_products p JOIN cnc_auth_users s ON s.id=p.owner
      WHERE p.publication='pending' AND p.archived=0 AND s.verified=1 AND s.suspended=0 AND s.role='seller' ORDER BY p.id LIMIT 50`)
      .all<{id:string;name:string;revision:number}>();
    if (url.pathname.startsWith('/api/')) return Response.json({products:results},{headers:{'cache-control':'no-store'}});
    return page('Product moderation',`<h1>Product moderation</h1>${results.map(product =>
      `<section class="card"><h2>${escape(product.name)}</h2><form method="post"><input type="hidden" name="id" value="${escape(product.id)}">
      <input type="hidden" name="revision" value="${product.revision}"><button name="decision" value="approve">Approve</button>
      <button name="decision" value="reject">Return to draft</button></form></section>`).join('') || '<p>No products awaiting review.</p>'}`);
  }
  if (request.method !== 'POST') return new Response(null,{status:405,headers:{allow:'GET, POST'}});
  if (request.headers.get('origin') !== env.AUTH_ORIGIN) return new Response(null,{status:403});
  let body: Record<string,unknown>;
  try {body=await readBody(request);} catch {return new Response(null,{status:400});}
  if (typeof body.id !== 'string' || body.id.length>100 || !['approve','reject'].includes(String(body.decision))
      || !Number.isSafeInteger(Number(body.revision)) || Number(body.revision)<1) return new Response(null,{status:400});
  const reviewed = await db.prepare(`INSERT INTO cnc_product_reviews (id,product_id,admin_id,revision,decision)
    SELECT ?,p.id,?,p.revision,? FROM cnc_seller_products p JOIN cnc_auth_users s ON s.id=p.owner
    WHERE p.id=? AND p.revision=? AND p.publication='pending' AND p.archived=0 AND s.role='seller' AND s.verified=1 AND s.suspended=0 RETURNING id`)
    .bind(crypto.randomUUID(),account.id,String(body.decision),body.id,Number(body.revision)).first();
  if (!reviewed) return new Response(null,{status:409});
  return url.pathname.startsWith('/api/') ? Response.json({review:reviewed},{headers:{'cache-control':'no-store'}})
    : new Response(null,{status:303,headers:{location:'/admin','cache-control':'no-store'}});
}
