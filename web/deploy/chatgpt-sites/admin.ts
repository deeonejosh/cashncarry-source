import { currentAccount, readBody, type AuthEnvironment } from './new-auth';
import { escape, page } from './catalog-pages';

export async function adminRoute(request: Request, env: AuthEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  if (!['/admin','/api/admin/moderation','/api/admin/overview','/api/admin/seller-applications','/api/admin/seller-applications/review'].includes(url.pathname)) return null;
  if (!env.AUTH_DB || !env.ADMIN_ACCOUNT_ID || !env.ADMIN_TOTP_SECRET_HEX) return null;
  const account = await currentAccount(request,env,true);
  if (!account) return new Response(null,{status:403,headers:{'cache-control':'no-store'}});
  const db=env.AUTH_DB;

  // Real, isolated staging counts. Always enforce admin session + MFA above.
  if (url.pathname === '/api/admin/overview') {
    if (request.method !== 'GET') return new Response(null,{status:405,headers:{allow:'GET'}});
    const counts=await db.prepare(
      "SELECT (SELECT COUNT(*) FROM cnc_auth_users) AS totalUsers,"+
      "(SELECT COUNT(*) FROM cnc_auth_users WHERE role='seller' AND verified=1 AND suspended=0) AS approvedSellers,"+
      "(SELECT COUNT(*) FROM cnc_seller_products WHERE publication='pending' AND archived=0) AS pendingProducts,"+
      "(SELECT COUNT(*) FROM cnc_seller_products WHERE publication='published' AND archived=0) AS publishedProducts,"+
      "(SELECT COUNT(*) FROM cnc_orders) AS totalOrders,"+
      "(SELECT COUNT(*) FROM cnc_short_videos) AS totalVideos").first();
    const events=await db.prepare(
      "SELECT a.id,a.user_id AS actor_id,u.role AS actor_role,a.event AS action,'account' AS target_type,"+
      "a.user_id AS target_id,'' AS detail,datetime(a.created,'unixepoch') AS created "+
      "FROM cnc_auth_audit a JOIN cnc_auth_users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 20").all();
    return Response.json({
      counts:{...counts,pendingApplications:0,openVideoReports:0},
      auditLogs:events.results,
      capabilities:{sellerApplications:false,videoReports:false},
      warnings:['Seller applications and video reports are not configured in this staging schema.'],
    },{headers:{'cache-control':'no-store'}});
  }
  if (url.pathname === '/api/admin/seller-applications') {
    if (request.method !== 'GET') return new Response(null,{status:405,headers:{allow:'GET'}});
    return Response.json({applications:[],available:false,
      warning:'Seller applications are not configured in this staging schema.'},
      {headers:{'cache-control':'no-store'}});
  }
  if (url.pathname === '/api/admin/seller-applications/review') {
    return Response.json({error:'Seller application review is not configured in this staging database.'},
      {status:501,headers:{'cache-control':'no-store'}});
  }

  if (request.method === 'GET') {
    const {results} = await db.prepare(`SELECT p.id,p.name,p.category,p.price_minor,p.stock,p.revision,p.publication,s.email AS seller_email,COALESCE(st.name,'') AS store_name FROM cnc_seller_products p JOIN cnc_auth_users s ON s.id=p.owner LEFT JOIN cnc_seller_stores st ON st.owner=p.owner
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
