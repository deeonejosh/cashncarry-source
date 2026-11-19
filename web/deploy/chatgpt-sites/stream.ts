import { currentAccount, type AuthEnvironment } from './new-auth';

export interface StreamEnvironment extends AuthEnvironment {
  STREAM_SELLER_ID?: string;
  STREAM_WHIP_URL?: string;
  STREAM_WHEP_URL?: string;
}

function validEndpoint(raw: string | undefined, operation: 'publish' | 'play') {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.hash
      && url.hostname.endsWith('.cloudflarestream.com') && url.pathname.endsWith('/' + operation) ? url.href : null;
  } catch { return null; }
}

const reply = (value: unknown,status=200) => Response.json(value,{status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer'}});

export async function streamRoute(request: Request, env: StreamEnvironment): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path !== '/api/live/cloudflare/publish' && path !== '/api/live/cloudflare/play') return null;
  const publish = path.endsWith('/publish');
  if (request.method !== (publish ? 'POST' : 'GET')) return reply({error:'Method not allowed'},405);
  if (publish && (!env.AUTH_ORIGIN || request.headers.get('origin') !== env.AUTH_ORIGIN)) return reply({error:'Invalid request origin'},403);
  const account = await currentAccount(request,env);
  if (!account) return reply({error:'Sign-in required'},401);
  if (publish) {
    if (account.role !== 'seller' || !env.STREAM_SELLER_ID || account.id !== env.STREAM_SELLER_ID) {
      return reply({error:'Broadcast access denied'},403);
    }
    const approved = await env.AUTH_DB?.prepare(
      "SELECT id FROM cnc_seller_applications WHERE user_id=? AND status='approved'"
    ).bind(account.id).first();
    if (!approved) return reply({error:'Approved seller account required'},403);
  }
  const endpoint = publish ? validEndpoint(env.STREAM_WHIP_URL,'publish') : validEndpoint(env.STREAM_WHEP_URL,'play');
  if (!endpoint) return reply({error:'Cloudflare Stream unavailable'},503);
  return reply(publish ? {whipUrl:endpoint} : {whepUrl:endpoint});
}
