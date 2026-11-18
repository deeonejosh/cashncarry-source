import { currentAccount, hasValidMutationOrigin, type AuthEnvironment } from './new-auth';

const uploadPath = '/api/seller/product-photo';
const pathPattern = /^\/media\/product-photos\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/;
const maxBytes = 512 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const reply = (status: number, error: string) =>
  Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });

export function managedPhotoId(imageUrl: string, origin: string) {
  if (!imageUrl) return undefined;
  try {
    const url = new URL(imageUrl);
    return url.origin === origin ? pathPattern.exec(url.pathname)?.[1] : undefined;
  } catch { return undefined; }
}

function fileType(bytes: Uint8Array) {
  const prefix = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  if (prefix([255, 216, 255])) return 'image/jpeg';
  if (prefix([137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png';
  if (prefix([82, 73, 70, 70]) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
    return 'image/webp';
  }
}

export async function productPhotoRoute(request: Request, env: AuthEnvironment) {
  const url = new URL(request.url);
  const match = pathPattern.exec(url.pathname);
  if (url.pathname !== uploadPath && !match) return null;
  const db = env.AUTH_DB;
  if (!db || url.origin !== env.AUTH_ORIGIN || url.protocol !== 'https:') return reply(503, 'Photo service unavailable');

  if (match) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return reply(405, 'Method not allowed');
    const id = match[1];
    const account = await currentAccount(request, env);
    const row = await db.prepare(`
      SELECT photo, content_type FROM cnc_seller_product_photos AS m
      WHERE id=? AND (owner=? OR ?='admin' OR EXISTS (
        SELECT 1 FROM cnc_seller_products AS p JOIN cnc_auth_users AS u ON u.id=p.owner
        WHERE p.image=? AND p.owner=m.owner AND p.publication='published' AND p.archived=0
          AND u.role='seller' AND u.verified=1 AND u.suspended=0
      ))
    `).bind(id, account?.id ?? '', account?.role ?? '', url.origin + url.pathname)
      .first<{ photo: number[]; content_type: string }>();
    if (!row) return reply(404, 'Photo not found');
    return new Response(request.method === 'HEAD' ? null : new Uint8Array(row.photo), {
      headers: { 'content-type': row.content_type, 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store' },
    });
  }

  if (request.method !== 'POST') return reply(405, 'Method not allowed');
  if (!hasValidMutationOrigin(request, env)) return reply(403, 'Invalid request origin');
  const account = await currentAccount(request, env);
  if (!account) return reply(401, 'Sign-in required');
  if (account.role !== 'seller' || !await db.prepare(
    "SELECT 1 FROM cnc_seller_applications WHERE user_id=? AND status='approved'"
  ).bind(account.id).first()) return reply(403, 'Approved seller access required');

  const contentType = request.headers.get('content-type')?.split(';')[0] || '';
  if (!allowedTypes.has(contentType)) return reply(415, 'Select a JPEG, PNG or WebP photo.');
  if (Number(request.headers.get('content-length')) > maxBytes) return reply(413, 'Photo exceeds 512 KB.');
  const reader = request.body?.getReader();
  if (!reader) return reply(400, 'Select a product photo.');
  const bytes = new Uint8Array(maxBytes);
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (length + value.length > maxBytes) {
      await reader.cancel();
      return reply(413, 'Photo exceeds 512 KB.');
    }
    bytes.set(value, length);
    length += value.length;
  }
  const photo = bytes.slice(0, length);
  if (fileType(photo) !== contentType) return reply(415, 'The file is not a valid photo of the selected type.');

  const id = crypto.randomUUID();
  const saved = await db.prepare(`
    INSERT INTO cnc_seller_product_photos (id,owner,content_type,photo)
    SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM cnc_seller_product_photos
      WHERE owner=? AND created>=unixepoch()-86400)<100
    RETURNING id
  `).bind(id, account.id, contentType, photo.buffer, account.id).first();
  if (!saved) return reply(429, 'Today’s product photo limit has been reached. Try again tomorrow.');
  return Response.json({ imageUrl: url.origin + '/media/product-photos/' + id }, {
    status: 201, headers: { 'cache-control': 'no-store' },
  });
}
