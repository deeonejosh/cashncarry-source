import { currentAccount, hasValidMutationOrigin, readBody, type AuthEnvironment } from './new-auth';

export interface SupportEnvironment extends AuthEnvironment {
  SUPPORT_AI_ENABLED?: string;
}
type Ticket = {
  id: string; requester_id: string; subject: string; category: string;
  order_id: string; status: string; priority: string; created: number; updated: number;
};
const categories = new Set(['general', 'order', 'delivery', 'product', 'account', 'technical']);
const statuses = new Set(['open', 'in_progress', 'waiting_for_customer', 'escalated', 'resolved']);
const priorities = new Set(['normal', 'high']);
const respond = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
});
function safeString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const valueTrimmed = value.trim();
  return valueTrimmed.length <= max ? valueTrimmed : null;
}
async function validOrderForRequester(
  db: NonNullable<AuthEnvironment['AUTH_DB']>, orderId: string,
  account: { id: string; role: string }
): Promise<boolean> {
  const record = await db.prepare(
    "SELECT o.id FROM cnc_orders o WHERE o.id=? AND " +
    "((?='buyer' AND o.buyer=?) OR (?='seller' AND EXISTS " +
    "(SELECT 1 FROM cnc_order_items i WHERE i.order_id=o.id AND i.seller=?)))"
  ).bind(orderId, account.role, account.id, account.role, account.id).first();
  return Boolean(record);
}
async function linkedOrderSummary(
  db: NonNullable<AuthEnvironment['AUTH_DB']>, orderId: string,
  account: { id: string; role: string }
) {
  if (!orderId) return null;
  if (account.role !== 'admin' && !(await validOrderForRequester(db, orderId, account))) return null;
  return db.prepare('SELECT id,status,payment_state,created FROM cnc_orders WHERE id=?')
    .bind(orderId).first();
}
const ticketPattern = /^\/api\/support\/tickets\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})(?:\/(messages|ai-draft|reply-templates))?$/i;

/**
 * Private staging customer-support API. No emails are read/sent; AI suggestions
 * cannot execute without separate approval, provider binding and configuration.
 * MFA-protected owner sees the queue; buyers/sellers see only their own tickets.
 */
export async function supportRoute(request: Request, env: SupportEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  const listing = url.pathname === '/api/support/tickets';
  const capabilities = url.pathname === '/api/support/capabilities';
  const match = ticketPattern.exec(url.pathname);
  if (!listing && !match && !capabilities) return null;
  if (!env.AUTH_DB || env.AUTH_ORIGIN !== url.origin || url.protocol !== 'https:') {
    return respond({ error: 'Support service unavailable' }, 503);
  }
  const db = env.AUTH_DB;
  const account = await currentAccount(request, env);
  if (!account) return respond({ error: 'Sign-in required' }, 401);
  const isAdmin = account.role === 'admin';
  if (capabilities) {
    return request.method === 'GET'
      ? respond({ ticketsEnabled: true, aiDraftsEnabled: false, emailIngestionEnabled: false, automaticReplies: false })
      : respond({ error: 'Method not allowed' }, 405);
  }

  if (request.method !== 'GET' && !hasValidMutationOrigin(request, env)) {
    return respond({ error: 'Invalid request origin' }, 403);
  }

  if (listing && request.method === 'GET') {
    const filter = url.searchParams.get('status');
    if (filter && !statuses.has(filter)) return respond({ error: 'Invalid status filter' }, 400);
    const query = isAdmin
      ? "SELECT t.id,t.requester_id,t.subject,t.category,t.order_id,t.status,t.priority,t.created,t.updated,u.email AS requester_email " +
        "FROM cnc_support_tickets t JOIN cnc_auth_users u ON u.id=t.requester_id " +
        "WHERE (?='' OR t.status=?) ORDER BY t.updated DESC LIMIT 100"
      : "SELECT id,subject,category,order_id,status,priority,created,updated FROM cnc_support_tickets " +
        "WHERE requester_id=? AND (?='' OR status=?) ORDER BY updated DESC LIMIT 100";
    const { results } = await db.prepare(query).bind(
      ...(isAdmin ? [] : [account.id]), filter || '', filter || ''
    ).all();
    return respond({ tickets: results || [], role: isAdmin ? 'admin' : 'customer' });
  }

  if (listing && request.method === 'POST') {
    if (isAdmin) return respond({ error: 'Customer account required' }, 403);
    let body: Record<string, unknown>;
    try { body = await readBody(request); } catch { return respond({ error: 'Invalid request' }, 400); }
    const subject = safeString(body.subject, 160);
    const message = safeString(body.message, 1600);
    const category = safeString(body.category, 32);
    const orderId = body.orderId === undefined ? '' : safeString(body.orderId, 128);
    if (!subject || subject.length < 3 || !message || !category || !categories.has(category) || orderId === null) {
      return respond({ error: 'Valid subject, category and message required' }, 400);
    }
    if (orderId && !(await validOrderForRequester(db, orderId, account))) {
      return respond({ error: 'Order unavailable for this account' }, 404);
    }
    const ticketId = crypto.randomUUID(), messageId = crypto.randomUUID();
    const made = await db.prepare(
      "INSERT INTO cnc_support_tickets (id,requester_id,subject,category,order_id) " +
      "SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM cnc_support_tickets " +
      "WHERE requester_id=? AND created>=unixepoch()-86400)<10 RETURNING id"
    ).bind(ticketId, account.id, subject, category, orderId, account.id).first();
    if (!made) return respond({ error: 'Daily support ticket limit reached', code: 'SUPPORT_RATE_LIMIT' }, 429);
    await db.batch([
      db.prepare('INSERT INTO cnc_support_messages (id,ticket_id,author_id,body) VALUES (?,?,?,?)')
        .bind(messageId, ticketId, account.id, message),
      db.prepare("INSERT INTO cnc_support_audit (id,ticket_id,actor_id,action) VALUES (?,?,?,'created')")
        .bind(crypto.randomUUID(), ticketId, account.id),
    ]);
    return respond({ ticket: { id: ticketId, status: 'open' } }, 201);
  }

  if (!match) return respond({ error: 'Method not allowed' }, 405);
  const id = match[1], action = match[2] || '';
  const ticket = await db.prepare(
    'SELECT id,requester_id,subject,category,order_id,status,priority,created,updated FROM cnc_support_tickets WHERE id=?'
  ).bind(id).first<Ticket>();
  if (!ticket || (!isAdmin && ticket.requester_id !== account.id)) {
    return respond({ error: 'Ticket not found' }, 404);
  }

  if (action === 'ai-draft') {
    if (!isAdmin) return respond({ error: 'Administrator access required' }, 403);
    // Never auto-send, and never call an AI provider without an explicitly
    // approved binding, spend limit and a human-controlled drafting workflow.
    return respond({ error: 'AI drafting requires an approved provider and budget', code: 'AI_NOT_CONFIGURED' }, 503);
  }
  if (action === 'reply-templates') {
    if (!isAdmin) return respond({ error: 'Administrator access required' }, 403);
    if (request.method !== 'GET') return respond({ error: 'Method not allowed' }, 405);
    return respond({ source: 'human-editable-templates', aiGenerated: false, suggestions: [
      'Thank you for contacting Cash N Carry Nigeria. We are reviewing your request and will update this ticket.',
      'Could you share a little more detail so our support team can investigate? Please do not share passwords or payment card information.',
    ] });
  }
  if (action === 'messages' && request.method === 'POST') {
    let body: Record<string, unknown>;
    try { body = await readBody(request); } catch { return respond({ error: 'Invalid request' }, 400); }
    const message = safeString(body.message, 1600);
    const internal = isAdmin && body.internal === true ? 1 : 0;
    if (!message) return respond({ error: 'Message required (maximum 1600 characters)' }, 400);
    const messageId = crypto.randomUUID();
    const added = await db.prepare(
      "INSERT INTO cnc_support_messages (id,ticket_id,author_id,body,internal) " +
      "SELECT ?,?,?,?,? WHERE " +
      "(SELECT COUNT(*) FROM cnc_support_messages WHERE ticket_id=? AND author_id=? AND created>=unixepoch()-3600)<30 " +
      "AND NOT EXISTS (SELECT 1 FROM cnc_support_messages WHERE ticket_id=? AND author_id=? AND body=? " +
      "AND created>=unixepoch()-3) RETURNING id"
    ).bind(messageId, id, account.id, message, internal, id, account.id, id, account.id, message).first();
    if (!added) return respond({ error: 'Duplicate or too many messages', code: 'SUPPORT_RATE_LIMIT' }, 429);
    await db.batch([
      db.prepare("UPDATE cnc_support_tickets SET updated=unixepoch(),status=CASE WHEN ?=1 THEN status " +
        "WHEN ?='admin' AND status IN ('open','waiting_for_customer') THEN 'waiting_for_customer' " +
        "WHEN ?<>'admin' AND status IN ('resolved','waiting_for_customer') THEN 'open' ELSE status END WHERE id=?")
        .bind(internal, account.role, account.role, id),
      db.prepare('INSERT INTO cnc_support_audit (id,ticket_id,actor_id,action) VALUES (?,?,?,?)')
        .bind(crypto.randomUUID(), id, account.id, internal ? 'internal_note' : 'replied'),
    ]);
    return respond({ created: true, id: messageId }, 201);
  }
  if (action) return respond({ error: 'Method not allowed' }, 405);

  if (request.method === 'GET') {
    const rows = await db.prepare(
      'SELECT id,ticket_id,author_id,body,internal,created FROM cnc_support_messages ' +
      'WHERE ticket_id=? AND (?=1 OR internal=0) ORDER BY created,id LIMIT 200'
    ).bind(id, isAdmin ? 1 : 0).all();
    const order = ticket.order_id ? await linkedOrderSummary(db, ticket.order_id, account) : null;
    return respond({ ticket, messages: rows.results || [], linkedOrder: order });
  }
  if (request.method === 'PATCH') {
    let body: Record<string, unknown>;
    try { body = await readBody(request); } catch { return respond({ error: 'Invalid request' }, 400); }
    if (!isAdmin) {
      if (body.action !== 'escalate') return respond({ error: 'Administrator access required' }, 403);
      const changed = await db.prepare(
        "UPDATE cnc_support_tickets SET status='escalated',updated=unixepoch() " +
        "WHERE id=? AND requester_id=? AND status NOT IN ('resolved','escalated') RETURNING id"
      ).bind(id, account.id).first();
      if (!changed) return respond({ error: 'Ticket cannot be escalated' }, 409);
      await db.prepare("INSERT INTO cnc_support_audit (id,ticket_id,actor_id,action) VALUES (?,?,?,'escalated')")
        .bind(crypto.randomUUID(), id, account.id).run();
      return respond({ updated: true, status: 'escalated' });
    }
    const status = body.status === undefined ? ticket.status : safeString(body.status, 32);
    const priority = body.priority === undefined ? ticket.priority : safeString(body.priority, 16);
    if (!status || !statuses.has(status) || !priority || !priorities.has(priority)) {
      return respond({ error: 'Invalid status or priority' }, 400);
    }
    if (status === ticket.status && priority === ticket.priority) return respond({ updated: false, ticket });
    await db.batch([
      db.prepare('UPDATE cnc_support_tickets SET status=?,priority=?,updated=unixepoch() WHERE id=?')
        .bind(status, priority, id),
      db.prepare("INSERT INTO cnc_support_audit (id,ticket_id,actor_id,action,detail) VALUES (?,?,?,'status_changed',?)")
        .bind(crypto.randomUUID(), id, account.id, 'status=' + status + ';priority=' + priority),
    ]);
    return respond({ updated: true, status, priority });
  }
  return respond({ error: 'Method not allowed' }, 405);
}
