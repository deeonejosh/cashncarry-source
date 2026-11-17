import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories } from '../src/lib/data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export interface SitemapProductRecord {
  id: string;
  slug?: string;
  title: string;
  brand?: string;
  price?: number;
  image?: string;
}

export interface SitemapSellerRecord {
  id: string;
  slug?: string;
  name: string;
  location?: string;
  avatar?: string;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: Array<{ loc: string; title: string; caption?: string }>;
}

export function generateSitemapXml(
  baseUrl: string = 'https://www.cashncarryng.com',
  products: SitemapProductRecord[] = [],
  sellers: SitemapSellerRecord[] = [],
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0];

  const urls: SitemapUrl[] = [
    {
      loc: `${cleanBase}/`,
      lastmod: today,
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      loc: `${cleanBase}/?tab=shop`,
      lastmod: today,
      changefreq: 'daily',
      priority: 0.9,
    },
    {
      loc: `${cleanBase}/?tab=live`,
      lastmod: today,
      changefreq: 'daily',
      priority: 0.8,
    },
    {
      loc: `${cleanBase}/?tab=auctions`,
      lastmod: today,
      changefreq: 'hourly',
      priority: 0.8,
    },
    {
      loc: `${cleanBase}/?tab=deals`,
      lastmod: today,
      changefreq: 'hourly',
      priority: 0.8,
    },
    {
      loc: `${cleanBase}/?tab=returns`,
      lastmod: today,
      changefreq: 'monthly',
      priority: 0.5,
    },
  ];

  for (const cat of categories) {
    urls.push({
      loc: `${cleanBase}/?tab=shop&category=${encodeURIComponent(cat.id)}`,
      lastmod: today,
      changefreq: 'daily',
      priority: 0.8,
    });
  }

  for (const prod of products) {
    if (!prod.id || !prod.title) continue;
    const productSlug = prod.slug || prod.id;
    const productImages: SitemapUrl['images'] = prod.image
      ? [{
          loc: prod.image,
          title: prod.title,
          caption: prod.price ? `${prod.title} - ₦${prod.price.toLocaleString('en-NG')}` : prod.title,
        }]
      : undefined;

    urls.push({
      loc: `${cleanBase}/?tab=product&id=${encodeURIComponent(productSlug)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: 0.9,
      images: productImages,
    });
  }

  for (const seller of sellers) {
    if (!seller.id || !seller.name) continue;
    const sellerSlug = seller.slug || seller.id;
    urls.push({
      loc: `${cleanBase}/?tab=storefront&id=${encodeURIComponent(sellerSlug)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: 0.7,
      images: seller.avatar
        ? [{
            loc: seller.avatar,
            title: `${seller.name} Storefront`,
            caption: seller.location ? `Verified Merchant in ${seller.location}` : seller.name,
          }]
        : undefined,
    });
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  for (const entry of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(entry.loc)}</loc>\n`;
    if (entry.lastmod) xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    if (entry.changefreq) xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    if (entry.priority !== undefined) xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;

    if (entry.images && entry.images.length > 0) {
      for (const img of entry.images) {
        xml += '    <image:image>\n';
        xml += `      <image:loc>${escapeXml(img.loc)}</image:loc>\n`;
        if (img.title) xml += `      <image:title>${escapeXml(img.title)}</image:title>\n`;
        if (img.caption) xml += `      <image:caption>${escapeXml(img.caption)}</image:caption>\n`;
        xml += '    </image:image>\n';
      }
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';
  return xml;
}

export function generateRobotsTxt(baseUrl: string = 'https://www.cashncarryng.com'): string {
  if (process.env.CNC_PRIVATE_STAGING === 'true') return 'User-agent: *\nDisallow: /\n';
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `# Cash N Carry Nigeria - Robots Crawler Directives
User-agent: *
Allow: /
Disallow: /api/
Disallow: /*?tab=admin*
Disallow: /*?tab=seller-*
Disallow: /*?tab=checkout*
Disallow: /*?tab=profile*
Disallow: /*?tab=orders*
Disallow: /*?tab=messages*
Disallow: /*?tab=notifications*
Sitemap: ${cleanBase}/sitemap.xml
`;
}

async function fetchLiveSitemapData(apiBaseUrl?: string): Promise<{
  products: SitemapProductRecord[];
  sellers: SitemapSellerRecord[];
}> {
  if (!apiBaseUrl) return { products: [], sellers: [] };
  const clean = apiBaseUrl.replace(/\/+$/, '');
  try {
    const [prodRes, sellerRes] = await Promise.all([
      fetch(`${clean}/api/products`),
      fetch(`${clean}/api/storefronts`),
    ]);
    const prodJson = prodRes.ok ? await prodRes.json() as { products?: Array<Record<string, unknown>> } : {};
    const sellerJson = sellerRes.ok ? await sellerRes.json() as { storefronts?: Array<Record<string, unknown>> } : {};
    const products = (Array.isArray(prodJson.products) ? prodJson.products : []).map((row) => ({
      id: String(row.id || ''),
      slug: row.slug ? String(row.slug) : undefined,
      title: String(row.name || row.title || ''),
      brand: row.brand ? String(row.brand) : undefined,
      price: Number(row.price || row.price_naira || 0),
      image: row.image ? String(row.image) : undefined,
    }));
    const sellers = (Array.isArray(sellerJson.storefronts) ? sellerJson.storefronts : []).map((row) => ({
      id: String(row.id || ''),
      slug: row.slug ? String(row.slug) : undefined,
      name: String(row.name || row.businessName || ''),
      location: row.location ? String(row.location) : undefined,
      avatar: row.avatar ? String(row.avatar) : undefined,
    }));
    return { products, sellers };
  } catch {
    return { products: [], sellers: [] };
  }
}

export async function writeSitemapFiles(baseUrl?: string, apiBaseUrl?: string) {
  const resolvedBase =
    baseUrl ||
    process.env.APP_URL ||
    process.env.SITE_URL ||
    'https://www.cashncarryng.com';

  const privateStaging = process.env.CNC_PRIVATE_STAGING === 'true';
  const { products, sellers } = privateStaging ? { products: [], sellers: [] } : await fetchLiveSitemapData(apiBaseUrl || process.env.API_BASE_URL);
  const xmlContent = privateStaging ? '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n' : generateSitemapXml(resolvedBase, products, sellers);
  const robotsContent = generateRobotsTxt(resolvedBase);

  const publicDir = path.resolve(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.resolve(publicDir, 'sitemap.xml'), xmlContent, 'utf-8');
  fs.writeFileSync(path.resolve(publicDir, 'robots.txt'), robotsContent, 'utf-8');

  const distDir = path.resolve(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.resolve(distDir, 'sitemap.xml'), xmlContent, 'utf-8');
    fs.writeFileSync(path.resolve(distDir, 'robots.txt'), robotsContent, 'utf-8');
  }

  console.log(`[Sitemap] Indexed ${products.length} products, ${sellers.length} storefronts, ${categories.length} categories.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cliBaseArg = process.argv.find((arg) => arg.startsWith('--base-url='));
  const cliApiArg = process.argv.find((arg) => arg.startsWith('--api-url='));
  void writeSitemapFiles(
    cliBaseArg ? cliBaseArg.split('=')[1] : undefined,
    cliApiArg ? cliApiArg.split('=')[1] : undefined,
  );
}
