import { authRoute, currentAccount, readBody, type AuthEnvironment } from './new-auth';
import { escape, page } from './catalog-pages';

const fields = {
  email: '<label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" required>',
  password: '<label for="password">Password</label><input id="password" name="password" type="password" minlength="12" maxlength="128" required>',
  token: '<label for="token">Email verification or reset code</label><input id="token" name="token" minlength="64" maxlength="64" required>',
};
const flows = {
  '/admin/sign-in': { title: 'Administrator sign in', action: 'admin-login', fields: fields.email + fields.password +
    '<label for="code">Authenticator code</label><input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required>' },
  '/sign-in': { title: 'Sign in', action: 'login', fields: fields.email + fields.password.replace('required','autocomplete="current-password" required') },
  '/register': { title: 'Create an account', action: 'register', fields: fields.email },
  '/verify-account': { title: 'Verify your account', action: 'verify', fields: fields.token + fields.password.replace('required','autocomplete="new-password" required') +
    '<label for="role">Account type</label><select id="role" name="role"><option value="buyer">Buyer</option><option value="seller">Seller</option></select>' },
  '/forgot-password': { title: 'Reset your password', action: 'request-reset', fields: fields.email },
  '/reset-password': { title: 'Choose a new password', action: 'reset', fields: fields.token + fields.password.replace('required','autocomplete="new-password" required') },
} as const;

const links = '<nav aria-label="Account links"><a href="/sign-in">Sign in</a><a href="/register">Register</a><a href="/verify-account">Verify account</a><a href="/forgot-password">Forgot password</a><a href="/reset-password">Enter reset code</a></nav>';
const redirect = (path: string, cookie?: string | null) => new Response(null, {
  status: 303, headers: { location: path, 'cache-control': 'no-store', ...(cookie ? {'set-cookie':cookie} : {}) },
});

function form(title: string, inputs: string, action: string, message = '', status = 200) {
  return page(title, `<section class="hero"><h1>${title}</h1></section><section class="card">
${message ? `<p role="status">${escape(message)}</p>` : ''}
<form class="account-form" method="post" action="${action}">${inputs}<button>${title}</button></form></section>${links}`, status);
}

export async function accountPage(request: Request, env: AuthEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname === '/login' ? '/sign-in' : url.pathname;
  if (!env.AUTH_DB || env.AUTH_ORIGIN !== url.origin || url.protocol !== 'https:') return null;
  const flow = flows[path as keyof typeof flows];
  if (flow || path === '/sign-out') {
    if (request.method === 'GET' && flow) return form(flow.title, flow.fields, path);
    if (request.method !== 'POST') return new Response(null, {status:405,headers:{allow:'POST'}});
    const apiUrl = new URL('/api/auth/' + (flow?.action ?? 'logout'), url);
    const result = await authRoute(new Request(apiUrl, request), env);
    if (!flow) return result.ok ? redirect('/sign-in',result.headers.get('set-cookie')) : result;
    if (!result.ok) {
      const data = await result.json() as { error?: string };
      return form(flow.title, flow.fields, path, data.error ?? 'Account service unavailable.', result.status);
    }
    if (flow.action === 'admin-login') return redirect('/admin',result.headers.get('set-cookie'));
    if (flow.action === 'login') return redirect('/account',result.headers.get('set-cookie'));
    if (flow.action === 'register' || flow.action === 'request-reset') {
      const next = flow.action === 'register' ? '/verify-account' : '/reset-password';
      return page(flow.title, `<h1>${flow.title}</h1><p>If the address is eligible, a code will be sent.</p><a href="${next}">Enter your code</a>`, 202);
    }
    return redirect('/sign-in');
  }

  if (!['/account','/profile','/addresses','/seller/dashboard'].includes(path)) return null;
  const account = await currentAccount(request, env);
  if (!account) return redirect('/sign-in');
  if (path === '/seller/dashboard' && account.role !== 'seller') return page('Access denied','<h1>Seller access required</h1>',403);
  if (path === '/addresses') return addresses(request, env, account.id);
  if (request.method !== 'GET') return new Response(null,{status:405,headers:{allow:'GET'}});
  const seller = path === '/seller/dashboard';
  const title = seller ? 'Seller Centre' : 'My account';
  return page(title, `<section class="hero"><h1>${title}</h1></section><section class="card">
<p>${escape(account.email)}</p><p>Account type: ${escape(account.role)}</p>
<a href="/addresses">Manage delivery addresses</a>${account.role === 'buyer' ? ' · <a href="/cart">Cart</a>' : ''}${account.role === 'seller' && !seller ? ' · <a href="/seller/dashboard">Seller Centre</a>' : ''}
${seller ? '<nav aria-label="Seller management"><a href="/seller/store">Store profile</a><a href="/seller/products">Product drafts</a></nav>' : ''}
<form method="post" action="/sign-out"><button>Sign out</button></form></section>`);
}

async function addresses(request: Request, env: AuthEnvironment, userId: string) {
  const db = env.AUTH_DB!;
  if (request.method === 'POST') {
    if (request.headers.get('origin') !== env.AUTH_ORIGIN) return page('Addresses','<h1>Invalid request origin</h1>',403);
    let body: Record<string,unknown>;
    try { body = await readBody(request); } catch { return page('Addresses','<h1>Invalid request</h1>',400); }
    if (body.action === 'delete' && typeof body.id === 'string' && /^[a-f\d-]{36}$/.test(body.id)) {
      await db.prepare('DELETE FROM cnc_buyer_addresses WHERE id=? AND user_id=?').bind(body.id,userId).run();
      return redirect('/addresses');
    }
    const parts = ['recipient','line','city','state'].map(key => typeof body[key] === 'string' ? (body[key] as string).trim() : '');
    if (body.action !== 'add' || parts.some((value,index) => !value || value.length > (index === 1 ? 240 : 100))) {
      return page('Addresses','<h1>Invalid address</h1><p>Complete all address fields.</p><a href="/addresses">Try again</a>',400);
    }
    const results = await db.prepare(`INSERT INTO cnc_buyer_addresses (id,user_id,recipient,line,city,state)
      SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM cnc_buyer_addresses WHERE user_id=?)<20 RETURNING id`)
      .bind(crypto.randomUUID(),userId,...parts,userId).first();
    return results ? redirect('/addresses') : page('Addresses','<h1>Address limit reached</h1>',409);
  }
  if (request.method !== 'GET') return new Response(null,{status:405,headers:{allow:'GET, POST'}});
  const { results } = await db.prepare('SELECT id,recipient,line,city,state FROM cnc_buyer_addresses WHERE user_id=? ORDER BY rowid DESC LIMIT 20')
    .bind(userId).all<{id:string;recipient:string;line:string;city:string;state:string}>();
  return page('Addresses', `<section class="hero"><h1>Delivery addresses</h1></section>
<section class="grid">${results.map(row => `<article class="card"><h2>${escape(row.recipient)}</h2><p>${escape(row.line)}, ${escape(row.city)}, ${escape(row.state)}</p>
<form method="post"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${escape(row.id)}"><button>Remove address</button></form></article>`).join('') || '<p>No saved addresses.</p>'}</section>
<form class="account-form" method="post"><input type="hidden" name="action" value="add">
<label for="recipient">Recipient</label><input id="recipient" name="recipient" maxlength="100" required>
<label for="line">Street address</label><input id="line" name="line" maxlength="240" required>
<label for="city">City</label><input id="city" name="city" maxlength="100" required>
<label for="state">State</label><input id="state" name="state" maxlength="100" required><button>Add address</button></form>`);
}
