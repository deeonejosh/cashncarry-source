import { scanDocumentOverHttps } from '../../src/lib/kyc-https-scanner';
import { currentAccount, type AuthEnvironment } from './new-auth';

export interface KycEnvironment extends AuthEnvironment {
  KYC_UPLOADS_ENABLED?: string;
  KYC_PRIVATE?: { put(key: string, data: ArrayBuffer): Promise<unknown>; delete(key: string): Promise<void> };
  KYC_SCANNER_HTTPS_URL?: string;
  KYC_SCANNER_BEARER_TOKEN?: string;
  KYC_DOCUMENT_KEY?: string;
}

const maxBytes = 5 * 1024 * 1024;
const json = (data: unknown, status: number) => Response.json(data,{status,headers:{'cache-control':'no-store'}});

export function areKycUploadsConfigured(env: KycEnvironment) {
  return env.KYC_UPLOADS_ENABLED === 'true' && Boolean(env.AUTH_DB && env.KYC_PRIVATE
    && env.KYC_SCANNER_HTTPS_URL && env.KYC_SCANNER_BEARER_TOKEN
    && /^[a-f0-9]{64}$/i.test(env.KYC_DOCUMENT_KEY || ''));
}

export async function kycRoute(request: Request, env: KycEnvironment): Promise<Response | null> {
  if (new URL(request.url).pathname !== '/api/sellers/kyc') return null;
  const uploadsEnabled = areKycUploadsConfigured(env);
  if (request.method === 'GET') {
    return json({
      uploadsEnabled,
      r2Configured: Boolean(env.KYC_PRIVATE),
      reason: uploadsEnabled
        ? null
        : 'Document uploads require private storage, document scanning and encryption.',
    }, 200);
  }
  if (request.method !== 'POST') return json({error:'Method not allowed'},405);
  if (env.KYC_UPLOADS_ENABLED !== 'true') {
    return json({
      error: 'KYC document uploads are temporarily unavailable until private R2 storage is configured.',
      code: 'KYC_UPLOADS_DISABLED',
      uploadsEnabled: false,
    }, 503);
  }
  const {AUTH_DB, KYC_PRIVATE, KYC_SCANNER_HTTPS_URL, KYC_SCANNER_BEARER_TOKEN, KYC_DOCUMENT_KEY} = env;
  if (!AUTH_DB || !KYC_PRIVATE || !KYC_SCANNER_HTTPS_URL || !KYC_SCANNER_BEARER_TOKEN
      || !KYC_DOCUMENT_KEY || !/^[a-f0-9]{64}$/i.test(KYC_DOCUMENT_KEY)) return json({error:'Private verification unavailable'},503);
  if (!env.AUTH_ORIGIN || request.headers.get('origin') !== env.AUTH_ORIGIN) return json({error:'Invalid request origin'},403);
  const seller = await currentAccount(request,env);
  if (!seller) return json({error:'Sign-in required'},401);
  if (seller.role !== 'seller') return json({error:'Seller access required'},403);
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/pdf') return json({error:'Submit a PDF'},415);
  if (Number(request.headers.get('content-length')) > maxBytes) return json({error:'File too large'},413);
  const reader = request.body?.getReader();
  if (!reader) return json({error:'Document required'},400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) { await reader.cancel(); return json({error:'File too large'},413); }
    chunks.push(value);
  }
  const pdf = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { pdf.set(chunk,offset); offset += chunk.length; }
  if (new TextDecoder().decode(pdf.subarray(0,5)) !== '%PDF-') return json({error:'Invalid PDF'},415);
  const audit = async (outcome: string) => AUTH_DB.prepare('INSERT INTO cnc_kyc_audit (seller,outcome) VALUES (?,?)').bind(seller.id,outcome).run();
  let verdict: 'clean' | 'infected';
  try { verdict = await scanDocumentOverHttps(pdf,KYC_SCANNER_HTTPS_URL,KYC_SCANNER_BEARER_TOKEN); }
  catch { await audit('scanner_unavailable'); return json({error:'Scanner unavailable'},503); }
  if (verdict !== 'clean') { await audit('rejected'); return json({error:'Document rejected'},422); }
  const id = crypto.randomUUID();
  const bytes = Uint8Array.from(KYC_DOCUMENT_KEY.match(/../g)!, item => Number.parseInt(item,16));
  const key = await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const additionalData = new TextEncoder().encode(JSON.stringify([seller.id,id]));
  const sealed = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData},key,pdf);
  const envelope = new Uint8Array(iv.length + sealed.byteLength);
  envelope.set(iv);
  envelope.set(new Uint8Array(sealed),iv.length);
  const objectKey = 'kyc/' + id;
  await KYC_PRIVATE.put(objectKey,envelope.buffer);
  try {
    await AUTH_DB.batch([
      AUTH_DB.prepare('INSERT INTO cnc_kyc_submissions (id,seller,object_key) VALUES (?,?,?)').bind(id,seller.id,objectKey),
      AUTH_DB.prepare("INSERT INTO cnc_kyc_audit (seller,outcome) VALUES (?,'stored')").bind(seller.id),
    ]);
  } catch (error) { await KYC_PRIVATE.delete(objectKey); throw error; }
  return json({id,status:'pending_review'},201);
}
