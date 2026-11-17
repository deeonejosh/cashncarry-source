import { currentAccount, readBody, type AuthEnvironment } from './new-auth';
import { escape, page } from './catalog-pages';

export async function adminRoute(request: Request, env: AuthEnvironment & { KYC_UPLOADS_ENABLED?: string }): Promise<Response | null> {
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
      "(SELECT COUNT(*) FROM cnc_seller_applications WHERE status='pending') AS pendingApplications,"+
      "(SELECT COUNT(*) FROM cnc_seller_products WHERE publication='pending' AND archived=0) AS pendingProducts,"+
      "(SELECT COUNT(*) FROM cnc_seller_products WHERE publication='published' AND archived=0) AS publishedProducts,"+
      "(SELECT COUNT(*) FROM cnc_orders) AS totalOrders,"+
      "(SELECT COUNT(*) FROM cnc_short_videos) AS totalVideos").first();
    const events=await db.prepare(
      "SELECT a.id,a.user_id AS actor_id,u.role AS actor_role,a.event AS action,'account' AS target_type,"+
      "a.user_id AS target_id,'' AS detail,datetime(a.created,'unixepoch') AS created "+
      "FROM cnc_auth_audit a JOIN cnc_auth_users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 20").all();
    return Response.json({
      counts:{...counts,openVideoReports:0},
      auditLogs:events.results,
      capabilities:{sellerApplications:true,videoReports:false},
      warnings:[env.KYC_UPLOADS_ENABLED === 'true' ? 'Seller document review requires manual administrator verification.' : 'KYC document uploads are disabled. Verify applicant documents outside this staging environment before approving.'],
    },{headers:{'cache-control':'no-store'}});
  }
  if (url.pathname === '/api/admin/seller-applications') {
    if (request.method !== 'GET') return new Response(null,{status:405,headers:{allow:'GET'}});
    const applications = await db.prepare(
      "SELECT a.id,a.user_id,a.business_name,a.cac_number,a.business_type,a.state_location,"+
      "a.phone,a.description,a.status,a.reviewer_notes,a.reviewed_at,a.created,a.updated,"+
      "u.email,u.role,u.suspended,a.status AS user_seller_status "+
      "FROM cnc_seller_applications a JOIN cnc_auth_users u ON u.id=a.user_id "+
      "ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END,a.updated DESC LIMIT 100"
    ).all();
    return Response.json({
      applications:applications.results,
      available:true,
      warning:env.KYC_UPLOADS_ENABLED === 'true'
        ? null : 'Uploaded KYC documents are unavailable. Independently verify business details before approval.'
    },{headers:{'cache-control':'no-store'}});
  }
  if (url.pathname === '/api/admin/seller-applications/review') {
    if (request.method !== 'POST') return new Response(null,{status:405,headers:{allow:'POST'}});
    if (request.headers.get('origin') !== env.AUTH_ORIGIN) return Response.json({error:'Invalid request origin'},{status:403});
    let body: Record<string, unknown>;
    try { body=await readBody(request); }
    catch { return Response.json({error:'Invalid review request'},{status:400}); }
    const id=typeof body.applicationId==='string' ? body.applicationId.trim() : '';
    const userId=typeof body.userId==='string' ? body.userId.trim() : '';
    const action=body.decision;
    const notes=typeof body.notes==='string' ? body.notes.trim() : '';
    if (!/^[0-9a-f-]{36}$/i.test(id) || !userId || userId.length>128 ||
        !['approve','reject','suspend'].includes(String(action)) || notes.length>1000) {
      return Response.json({error:'Invalid application review'},{status:400});
    }
    const status=action==='approve' ? 'approved' : action==='reject' ? 'rejected' : 'suspended';
    const from=action==='approve' ? "('pending','suspended')" :
               action==='reject' ? "('pending')" : "('approved')";
    const changed=await db.prepare(
      "UPDATE cnc_seller_applications SET status=?,reviewer_id=?,reviewer_notes=?,"+
      "reviewed_at=unixepoch(),updated=unixepoch() "+
      "WHERE id=? AND user_id=? AND status IN "+from+" "+
      "AND EXISTS (SELECT 1 FROM cnc_auth_users u WHERE u.id=? AND u.verified=1 AND "+
      "u.role IN ('buyer','seller')) "+
      "RETURNING id,user_id,status"
    ).bind(status,account.id,notes,id,userId,userId).first<{id:string;user_id:string;status:string}>();
    if (!changed) return Response.json({error:'Application changed or is ineligible'},{status:409});
    return Response.json({updated:true,sellerStatus:status,applicationId:changed.id,
      signInRequired:status!=='rejected'},{headers:{'cache-control':'no-store'}});
  }

  if (request.method === 'GET') {
    // The baseline schema has no category column; newer isolated staging data may have one.
    // Select a compatible field without altering data or weakening Admin MFA.
    const columns = await db.prepare('PRAGMA table_info(cnc_seller_products)').all<{name: string}>();
    const categoryField = columns.results.some((column) => column.name === 'category') ? 'p.category' : "'' AS category";
    const {results} = await db.prepare(`SELECT p.id,p.name,${categoryField},p.price_minor,p.stock,p.revision,p.publication,s.email AS seller_email,COALESCE(st.name,'') AS store_name FROM cnc_seller_products p JOIN cnc_auth_users s ON s.id=p.owner LEFT JOIN cnc_seller_stores st ON st.owner=p.owner
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
