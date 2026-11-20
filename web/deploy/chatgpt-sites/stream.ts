import { currentAccount, type AuthEnvironment } from './new-auth';

export interface StreamEnvironment extends AuthEnvironment {
  STREAM_SELLER_ID?: string;
  STREAM_WHIP_URL?: string;
  STREAM_WHEP_URL?: string;
  STREAM_STATUS_TOKEN?: string;
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

const DISCONNECT_GRACE_SECONDS = 45;

export async function broadcastStatus(env: StreamEnvironment): Promise<boolean | null> {
  const playback = validEndpoint(env.STREAM_WHEP_URL, 'play');
  if (!playback || !env.STREAM_STATUS_TOKEN) return null;
  const url = new URL(playback);
  if (!/^\/[a-f0-9]{32}\/webRTC\/play$/.test(url.pathname) || url.search) return null;
  url.pathname = url.pathname.replace('/webRTC/play', '/lifecycle');
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.STREAM_STATUS_TOKEN}` },
      redirect: 'manual',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = await response.json<{ isInput?: boolean; live?: boolean }>();
    return data?.isInput === true && typeof data.live === 'boolean' ? data.live : null;
  } catch {
    return null;
  }
}

export async function reconcileBroadcast(db: NonNullable<AuthEnvironment['AUTH_DB']>, env: StreamEnvironment) {
  if (!env.STREAM_SELLER_ID || !env.STREAM_WHEP_URL || !env.STREAM_STATUS_TOKEN) return;
  const room = await db.prepare(
    "SELECT room_id, stream_offline_since FROM cnc_live_room_state WHERE seller_id=? AND stream_url=? AND status='live' ORDER BY created DESC LIMIT 1"
  ).bind(env.STREAM_SELLER_ID, env.STREAM_WHEP_URL).first<{ room_id: string; stream_offline_since: number | null }>();
  if (!room) return;
  const active = await broadcastStatus(env);
  if (active === null || (active && room.stream_offline_since === null)) return;
  const now = Math.floor(Date.now() / 1000);
  const graceElapsed = room.stream_offline_since !== null && now - room.stream_offline_since >= DISCONNECT_GRACE_SECONDS;
  if (!active && room.stream_offline_since !== null && !graceElapsed) return;
  await db.prepare(
    "UPDATE cnc_live_room_state SET status=?, ended_at=?, stream_offline_since=? WHERE room_id=? AND status='live' AND stream_offline_since IS ?"
  ).bind(!active && graceElapsed ? 'ended' : 'live', !active && graceElapsed ? now : null,
    active ? null : room.stream_offline_since ?? now, room.room_id, room.stream_offline_since).run();
}
