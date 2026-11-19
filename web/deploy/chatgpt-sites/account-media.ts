import { currentAccount, hasValidMutationOrigin, readBody, type AuthEnvironment } from './new-auth';

type StoredVideo = { body: ReadableStream; size: number; httpMetadata?: { contentType?: string } };
type VideoBucket = {
  put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
  head(key: string): Promise<{ size: number; httpMetadata?: { contentType?: string } } | null>;
  get(key: string, options?: { range: { offset: number; length: number } }): Promise<StoredVideo | null>;
  delete(key: string): Promise<void>;
};
export type AccountMediaEnvironment = AuthEnvironment & { SELLER_VIDEO?: VideoBucket };

const maxPhoto = 512 * 1024;
const maxVideo = 25 * 1024 * 1024;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
const error = (message: string, status: number) => json({ error: message }, status);
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

function starts(bytes: Uint8Array, magic: number[], offset = 0) {
  return magic.every((value, index) => bytes[offset + index] === value);
}

async function readLimited(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function accountMediaRoute(request: Request, env: AccountMediaEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1\//, '/api/');
  const videoMatch = /^\/media\/seller-videos\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.exec(path);
  if (!videoMatch && !['/api/profile', '/api/profile/photo', '/api/videos/upload'].includes(path)) return null;
  const db = env.AUTH_DB;
  if (!db || url.origin !== env.AUTH_ORIGIN || url.protocol !== 'https:') return error('Account media unavailable', 503);

  if (videoMatch) {
    if (!['GET', 'HEAD'].includes(request.method)) return error('Method not allowed', 405);
    const bucket = env.SELLER_VIDEO;
    if (!bucket) return error('Video storage unavailable', 503);
    const id = videoMatch[1];
    const available = await db.prepare(`SELECT 1 FROM cnc_short_videos v
      JOIN cnc_auth_users u ON u.id=v.seller_id JOIN cnc_seller_applications a ON a.user_id=u.id
      JOIN cnc_seller_products p ON p.id=v.product_id AND p.owner=u.id
      WHERE v.id=? AND v.video_url=? AND u.role='seller' AND u.verified=1 AND u.suspended=0
      AND a.status='approved' AND p.publication='published' AND p.archived=0`).bind(id, path).first();
    if (!available) return error('Video not found', 404);
    const meta = await bucket.head(id);
    if (!meta) return error('Video not found', 404);
    const headers = new Headers({
      'content-type': meta.httpMetadata?.contentType || 'video/mp4', 'content-length': String(meta.size),
      'accept-ranges': 'bytes', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff',
    });
    if (request.method === 'HEAD') return new Response(null, { headers });
    const range = request.headers.get('range');
    if (!range) {
      const object = await bucket.get(id);
      return object ? new Response(object.body, { headers }) : error('Video not found', 404);
    }
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match?.[1] ? Number(match[1]) : Math.max(0, meta.size - Number(match?.[2]));
    const end = match?.[1] && match[2] ? Math.min(meta.size - 1, Number(match[2])) : meta.size - 1;
    if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
      return new Response(null, { status: 416, headers: { 'content-range': 'bytes */' + meta.size } });
    }
    const length = end - start + 1;
    const object = await bucket.get(id, { range: { offset: start, length } });
    if (!object) return error('Video not found', 404);
    headers.set('content-range', `bytes ${start}-${end}/${meta.size}`);
    headers.set('content-length', String(length));
    return new Response(object.body, { status: 206, headers });
  }

  const account = await currentAccount(request, env);
  if (!account) return error('Sign-in required', 401);
  if (!['GET', 'HEAD'].includes(request.method) && !hasValidMutationOrigin(request, env)) return error('Invalid request origin', 403);

  if (path === '/api/profile/photo') {
    if (request.method === 'GET') {
      const row = await db.prepare('SELECT photo,photo_type FROM cnc_profile_identity WHERE user_id=?')
        .bind(account.id).first<{ photo: number[] | null; photo_type: string | null }>();
      if (!row?.photo || !row.photo_type) return error('Profile photo not found', 404);
      return new Response(new Uint8Array(row.photo), {
        headers: { 'content-type': row.photo_type, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' },
      });
    }
    return error('Method not allowed', 405);
  }

  const digest = async (userId: string) => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
    return Array.from(new Uint8Array(hash).slice(0, 9), byte => byte.toString(16).padStart(2, '0')).join('');
  };

  if (path === '/api/profile') {
    const defaultUsername = 'cnc_' + await digest(account.id);
    const profile = async () => {
      const row = await db.prepare(`SELECT u.id AS user_id, COALESCE(NULLIF(p.display_name,''),u.email) AS display_name,
      p.bio,p.avatar_url,COALESCE(NULLIF(p.selected_state,''),'Lagos') AS selected_state,u.email,u.role,p.updated_at,i.username
      FROM cnc_auth_users u LEFT JOIN cnc_user_profiles p ON p.user_id=u.id
      LEFT JOIN cnc_profile_identity i ON i.user_id=u.id WHERE u.id=?`).bind(account.id).first();
      return row && { ...row, username: row.username ?? defaultUsername };
    };
    if (request.method === 'GET') return json({ profile: await profile() });
    if (!['PUT','POST'].includes(request.method)) return error('Method not allowed',405);
    let body: Record<string, unknown>;
    let photo: ArrayBuffer | null = null;
    let photoType: string | null = null;
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.startsWith('multipart/form-data;')) {
        const bytes = await readLimited(request, maxPhoto + 8192);
        if (!bytes) return error('Profile photo exceeds 512 KB.',413);
        const form = await new Response(bytes, { headers: { 'content-type': contentType } }).formData();
        body = Object.fromEntries(form);
        const file = form.get('photo');
        if (!(file instanceof File) || !file.size || file.size > maxPhoto) return error('Choose a valid profile photo under 512 KB.',400);
        photo = await file.arrayBuffer();
        photoType = file.type;
        const image = new Uint8Array(photo);
        const valid = photoType === 'image/jpeg' ? starts(image,[255,216,255])
          : photoType === 'image/png' ? starts(image,[137,80,78,71,13,10,26,10])
          : photoType === 'image/webp' && starts(image,[82,73,70,70]) && starts(image,[87,69,66,80],8);
        if (!valid) return error('Choose a valid JPEG, PNG or WebP image.',415);
      } else {
        body = await readBody(request);
      }
    } catch { return error('Invalid profile information.',400); }
    const displayName = text(body.displayName ?? body.display_name,80);
    if (!displayName) return error('Display name is required.',400);
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    if (body.username !== undefined && !/^[a-z0-9_]{3,24}$/.test(username)) return error('Use 3–24 letters, numbers or underscores for your username.',400);
    if (username.startsWith('cnc_') && username !== defaultUsername) return error('Choose a username that does not start with cnc_.',400);
    const avatar = photo ? '/api/profile/photo?v=' + crypto.randomUUID() : text(body.avatarUrl ?? body.avatar_url,400);
    const statements = [db.prepare(`INSERT INTO cnc_user_profiles(user_id,display_name,bio,avatar_url,selected_state,updated_at)
      VALUES(?,?,?,?,?,unixepoch()) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,
      bio=excluded.bio,avatar_url=excluded.avatar_url,selected_state=excluded.selected_state,updated_at=excluded.updated_at`)
      .bind(account.id,displayName,text(body.bio,240),avatar,text(body.selectedState ?? body.selected_state,60)||'Lagos')];
    if (photo) statements.push(db.prepare(`INSERT INTO cnc_profile_identity(user_id,photo,photo_type) VALUES(?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET photo=excluded.photo,photo_type=excluded.photo_type`).bind(account.id,photo,photoType));
    else if (!avatar) statements.push(db.prepare('UPDATE cnc_profile_identity SET photo=NULL,photo_type=NULL WHERE user_id=?').bind(account.id));
    if (username && username !== defaultUsername) statements.unshift(db.prepare(`INSERT INTO cnc_profile_identity(user_id,username) VALUES(?,?)
      ON CONFLICT(user_id) DO UPDATE SET username=excluded.username`).bind(account.id,username));
    else if (username === defaultUsername) statements.unshift(db.prepare('UPDATE cnc_profile_identity SET username=NULL WHERE user_id=?').bind(account.id));
    try { await db.batch(statements); }
    catch (failure) {
      if (String(failure).includes('UNIQUE constraint failed: cnc_profile_identity.username')) return error('That username is already taken.',409);
      throw failure;
    }
    return json({ updated:true, profile:await profile() });
  }

  if (request.method !== 'POST') return error('Method not allowed',405);
  const bucket = env.SELLER_VIDEO;
  if (!bucket) return error('Video storage unavailable',503);
  if (account.role !== 'seller' || !await db.prepare(
    "SELECT 1 FROM cnc_seller_applications WHERE user_id=? AND status='approved'"
  ).bind(account.id).first()) return error('Approved seller access required',403);
  const bytes = await readLimited(request,maxVideo + 64 * 1024);
  if (!bytes) return error('Video exceeds 25 MB.',413);
  let form: FormData;
  try { form = await new Response(bytes,{ headers:{'content-type':request.headers.get('content-type') || ''} }).formData(); }
  catch { return error('Choose an MP4 or WebM video.',400); }
  const file = form.get('video');
  if (!(file instanceof File) || !file.size || file.size > maxVideo) return error('Choose a video up to 25 MB.',400);
  const signature = new Uint8Array(await file.slice(0,16).arrayBuffer());
  const contentType = starts(signature,[102,116,121,112],4) && !starts(signature,[113,116,32,32],8) ? 'video/mp4'
    : starts(signature,[26,69,223,163]) && file.type==='video/webm' ? 'video/webm' : '';
  if (!contentType) return error('Use a valid MP4 or WebM video.',415);
  const productId = text(form.get('productId'),128), title = text(form.get('title'),160), caption = text(form.get('caption'),280);
  if (!productId || !title || !caption) return error('Title, caption and product are required.',400);
  const product = await db.prepare("SELECT 1 FROM cnc_seller_products WHERE id=? AND owner=? AND publication='published' AND archived=0")
    .bind(productId,account.id).first();
  if (!product) return error('Select one of your published products.',403);
  const id = crypto.randomUUID();
  const videoUrl = '/media/seller-videos/' + id;
  await bucket.put(id,await file.arrayBuffer(),{httpMetadata:{contentType}});
  try {
    const inserted = await db.prepare(`INSERT INTO cnc_short_videos(id,seller_id,seller_name,product_id,title,caption,video_url)
      SELECT ?,u.id,s.name,p.id,?,?,? FROM cnc_auth_users u JOIN cnc_seller_applications a ON a.user_id=u.id
      JOIN cnc_seller_stores s ON s.owner=u.id JOIN cnc_seller_products p ON p.owner=u.id
      WHERE u.id=? AND u.role='seller' AND u.verified=1 AND u.suspended=0 AND a.status='approved'
      AND p.id=? AND p.publication='published' AND p.archived=0
      AND (SELECT COUNT(*) FROM cnc_short_videos WHERE seller_id=u.id AND created>=unixepoch()-86400)<10 RETURNING id`)
      .bind(id,title,caption,videoUrl,account.id,productId).first();
    if (!inserted) {
      await bucket.delete(id);
      return error('Upload could not be published. Check product availability or try tomorrow if you reached 10 uploads today.',409);
    }
  } catch (failure) { await bucket.delete(id); throw failure; }
  return json({success:true,id,videoUrl,processingStatus:'ready'},201);
}
