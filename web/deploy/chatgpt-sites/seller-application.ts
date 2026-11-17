import { currentAccount, hasValidMutationOrigin, readBody, type AuthEnvironment } from './new-auth';

const route = '/api/seller/application';
const reply = (payload: unknown, status = 200) =>
  Response.json(payload, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const text = (value: unknown, limit: number) =>
  typeof value === 'string' ? value.trim().slice(0, limit + 1) : '';

export async function sellerApplicationRoute(request: Request, env: AuthEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== route) return null;
  if (!env.AUTH_DB || env.AUTH_ORIGIN !== url.origin || url.protocol !== 'https:') {
    return reply({ error: 'Seller applications unavailable' }, 503);
  }
  const account = await currentAccount(request, env);
  if (!account) return reply({ error: 'Sign-in required' }, 401);
  if (account.role === 'admin') return reply({ error: 'Use the administrator console' }, 403);

  const db = env.AUTH_DB;
  const accountApplication = () => db.prepare(
    "SELECT a.id,a.user_id,a.business_name,a.cac_number,a.business_type,"+
    "a.state_location,a.phone,a.description,a.status,a.reviewer_notes,"+
    "a.reviewed_at,a.created,a.updated,u.role,u.email,u.suspended,"+
    "CASE WHEN a.status='approved' AND u.role='seller' AND u.suspended=0 THEN 'approved' ELSE a.status END AS user_seller_status "+
    "FROM cnc_seller_applications a JOIN cnc_auth_users u ON u.id=a.user_id WHERE a.user_id=?"
  ).bind(account.id).first<Record<string, unknown>>();

  if (request.method === 'GET') {
    const application = await accountApplication();
    return reply({ sellerStatus: application?.user_seller_status || 'none', application: application || null });
  }
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (!hasValidMutationOrigin(request, env)) return reply({ error: 'Invalid request origin' }, 403);
  if (account.role !== 'buyer') return reply({ error: 'This account is not eligible to apply' }, 403);
  let body: Record<string, unknown>;
  try { body = await readBody(request); }
  catch { return reply({ error: 'Invalid application form' }, 400); }

  const businessName = text(body.businessName, 100);
  const cacNumber = text(body.cacNumber, 60);
  const businessType = text(body.businessType, 80);
  const stateLocation = text(body.stateLocation, 80);
  const phone = text(body.phone, 30);
  const description = text(body.description, 500);
  if (businessName.length < 2 || businessName.length > 100 ||
      cacNumber.length > 60 || businessType.length > 80 ||
      stateLocation.length < 2 || stateLocation.length > 80 ||
      !/^[+()\-\d\s]{6,30}$/.test(phone) ||
      description.length < 5 || description.length > 500) {
    return reply({ error: 'Enter valid business details, phone and description' }, 400);
  }

  const id = crypto.randomUUID();
  const submitted = await db.prepare(
    "INSERT INTO cnc_seller_applications "+
    "(id,user_id,business_name,cac_number,business_type,state_location,phone,description) "+
    "SELECT ?,u.id,?,?,?,?,?,? FROM cnc_auth_users u "+
    "WHERE u.id=? AND u.verified=1 AND u.suspended=0 AND u.role='buyer' "+
    "ON CONFLICT(user_id) DO UPDATE SET business_name=excluded.business_name,"+
    "cac_number=excluded.cac_number,business_type=excluded.business_type,"+
    "state_location=excluded.state_location,phone=excluded.phone,description=excluded.description,"+
    "status='pending',reviewer_id=NULL,reviewer_notes='',reviewed_at=NULL,updated=unixepoch() "+
    "WHERE cnc_seller_applications.status='rejected' RETURNING id"
  ).bind(id, businessName, cacNumber, businessType, stateLocation, phone, description, account.id)
    .first<{ id: string }>();

  if (!submitted) {
    const existing = await accountApplication();
    return reply({
      error: existing?.status === 'pending'
        ? 'Application already submitted and awaiting review'
        : 'Application cannot be submitted for this account',
      sellerStatus: existing?.status || 'none',
      application: existing || null,
    }, 409);
  }
  const application = await accountApplication();
  return reply({
    submitted: true,
    sellerStatus: 'pending',
    application,
    verificationNote: 'Business details are self-declared. Document review requires an authorised administrator.',
  }, 201);
}
