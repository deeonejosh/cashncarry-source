import { countPublicProducts, readPublicProductImages, sitemapPageSize, type CatalogDatabase } from './catalog';
import { injectEdgeSEOMeta, resolveEdgeSEO } from './edge-seo';
import { publicImageUrl } from './seo-image-url';

const origin = 'https://www.cashncarryng.com';
const declaration = '<?xml version="1.0" encoding="UTF-8"?>';
const sitemapNs = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const xml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[char] || char);

export const homeSocialImage = `${origin}/brand/logo.png`;

export async function publicSitemap(request: Request, db: CatalogDatabase | undefined): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.origin !== origin || !['GET', 'HEAD'].includes(request.method)) return null;
  const part = /^\/sitemaps\/products-([1-9]\d{0,4})\.xml$/.exec(url.pathname);
  if (url.pathname === '/sitemaps/core.xml') return sitemapResponse(request, sitemapContent(['/', '/shop'], []));
  if (url.pathname !== '/sitemap.xml' && !part) return null;
  try {
    if (!db) throw new Error('Catalog database unavailable');
    const count = await countPublicProducts(db);
    const pages = Math.ceil(count / sitemapPageSize);
    const page = part ? Number(part[1]) : 0;
    if (page > pages) return new Response(null, { status: 404 });
    if (!page && pages > 1) {
      const locations = ['/sitemaps/core.xml', ...Array.from({ length: pages }, (_, i) => `/sitemaps/products-${i + 1}.xml`)];
      return sitemapResponse(request, `<sitemapindex xmlns="${sitemapNs}">${locations.map((path) => `<sitemap><loc>${origin}${path}</loc></sitemap>`).join('')}</sitemapindex>`);
    }
    const products = pages ? await readPublicProductImages(db, page ? (page - 1) * sitemapPageSize : 0) : [];
    return sitemapResponse(request, sitemapContent(page ? [] : ['/', '/shop'], products));
  } catch {
    return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}

function sitemapContent(paths: string[], products: { id: string; image: string | null }[]) {
  const entries = paths.map((path) => `<url><loc>${origin}${path}</loc></url>`);
  for (const product of products) {
    const image = publicImageUrl(product.image ?? '', origin);
    entries.push(`<url><loc>${xml(`${origin}/products/${encodeURIComponent(product.id)}`)}</loc>${image ? `<image:image><image:loc>${xml(image)}</image:loc></image:image>` : ''}</url>`);
  }
  return `<urlset xmlns="${sitemapNs}" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries.join('')}</urlset>`;
}

function sitemapResponse(request: Request, body: string) {
  return new Response(request.method === 'HEAD' ? null : declaration + body, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}

export async function decoratePublicCatalog(request: Request, response: Response, db?: CatalogDatabase) {
  const url = new URL(request.url);
  if (url.origin !== origin || request.method !== 'GET' || !response.ok ||
      !/^\/(shop\/?|products\/[^/]+\/?)$/.test(url.pathname) ||
      !response.headers.get('content-type')?.includes('text/html')) return response;
  const seo = await resolveEdgeSEO({ url, db });
  if (url.pathname.startsWith('/products/') && seo.ogType !== 'product') return response;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(injectEdgeSEOMeta(await response.text(), seo), { status: response.status, headers });
}
