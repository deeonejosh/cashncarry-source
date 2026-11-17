import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export interface FeedProductRecord {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  category: string;
  brand?: string;
  price: number;
  image?: string;
  sellerName?: string;
  stock?: number;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const GOOGLE_CATEGORY_MAP: Record<string, string> = {
  tech: 'Electronics &gt; Audio &gt; Audio Components &gt; Headphones &amp; Headsets',
  fashion: 'Apparel &amp; Accessories &gt; Clothing &gt; Traditional &amp; Cultural Clothing',
  beauty: 'Health &amp; Beauty &gt; Personal Care &gt; Cosmetics &gt; Skin Care',
  food: 'Food, Beverages &amp; Tobacco &gt; Food Items',
  home: 'Home &amp; Garden &gt; Kitchen &amp; Dining &gt; Kitchen Appliances',
  services: 'Business &amp; Industrial &gt; Commercial Printing &amp; Logistics',
};

export function generateGoogleShoppingFeedXml(
  baseUrl: string = 'https://www.cashncarryng.com',
  products: FeedProductRecord[] = [],
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  xml += '  <channel>\n';
  xml += '    <title>Cash N Carry Nigeria - Google Shopping Product Feed</title>\n';
  xml += `    <link>${escapeXml(cleanBase)}</link>\n`;
  xml += '    <description>Authentic wholesale and retail products from verified Nigerian CAC merchants with escrow protection and nationwide dispatch.</description>\n';
  xml += '    <language>en-NG</language>\n';

  for (const prod of products) {
    if (!prod.id || !prod.title || !Number.isFinite(prod.price) || prod.price <= 0) continue;
    const slug = prod.slug || prod.id;
    const link = `${cleanBase}/?tab=product&id=${encodeURIComponent(slug)}`;
    const priceFormatted = `${prod.price.toFixed(2)} NGN`;
    const googleCategory = GOOGLE_CATEGORY_MAP[prod.category] || 'General Merchandise';

    xml += '    <item>\n';
    xml += `      <g:id>${escapeXml(prod.id)}</g:id>\n`;
    xml += `      <g:title>${escapeXml(prod.title)}</g:title>\n`;
    xml += `      <g:description>${escapeXml(prod.description || prod.title)}</g:description>\n`;
    xml += `      <g:link>${escapeXml(link)}</g:link>\n`;
    if (prod.image) {
      xml += `      <g:image_link>${escapeXml(prod.image)}</g:image_link>\n`;
    }
    xml += '      <g:condition>new</g:condition>\n';
    xml += `      <g:availability>${(prod.stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>\n`;
    xml += `      <g:price>${escapeXml(priceFormatted)}</g:price>\n`;
    xml += `      <g:brand>${escapeXml(prod.brand || 'Cash N Carry')}</g:brand>\n`;
    xml += '      <g:identifier_exists>no</g:identifier_exists>\n';
    xml += `      <g:google_product_category>${googleCategory}</g:google_product_category>\n`;
    xml += `      <g:product_type>${escapeXml(prod.category)}</g:product_type>\n`;
    xml += `      <g:custom_label_0>${escapeXml(prod.category)}</g:custom_label_0>\n`;
    xml += `      <g:custom_label_1>${escapeXml(prod.sellerName || 'Cash N Carry')}</g:custom_label_1>\n`;
    xml += '    </item>\n';
  }

  xml += '  </channel>\n';
  xml += '</rss>\n';
  return xml;
}

async function fetchLiveCatalog(apiBaseUrl?: string): Promise<FeedProductRecord[]> {
  if (!apiBaseUrl) return [];
  try {
    const res = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/api/products`);
    if (!res.ok) return [];
    const data = await res.json() as { products?: Array<Record<string, unknown>> };
    const rows = Array.isArray(data.products) ? data.products : [];
    return rows.map((row) => ({
      id: String(row.id || ''),
      slug: row.slug ? String(row.slug) : undefined,
      title: String(row.name || row.title || ''),
      description: String(row.description || ''),
      category: String(row.category || 'general'),
      brand: row.brand ? String(row.brand) : undefined,
      price: Number(row.price || row.price_naira || 0),
      image: row.image ? String(row.image) : undefined,
      sellerName: row.sellerName ? String(row.sellerName) : undefined,
      stock: Number(row.stock ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function writeGoogleShoppingFeed(baseUrl?: string, apiBaseUrl?: string) {
  const resolvedBase =
    baseUrl ||
    process.env.APP_URL ||
    process.env.SITE_URL ||
    'https://www.cashncarryng.com';

  const products = process.env.CNC_PRIVATE_STAGING === 'true' ? [] : await fetchLiveCatalog(apiBaseUrl || process.env.API_BASE_URL);
  const xmlContent = generateGoogleShoppingFeedXml(resolvedBase, products);

  const publicFeedDir = path.resolve(rootDir, 'public', 'feed');
  if (!fs.existsSync(publicFeedDir)) {
    fs.mkdirSync(publicFeedDir, { recursive: true });
  }

  const publicFeedPath = path.resolve(publicFeedDir, 'google-shopping.xml');
  fs.writeFileSync(publicFeedPath, xmlContent, 'utf-8');
  console.log(`[Google Shopping Feed] Written to public/feed/google-shopping.xml (${products.length} products)`);

  const distFeedDir = path.resolve(rootDir, 'dist', 'feed');
  if (fs.existsSync(path.resolve(rootDir, 'dist'))) {
    if (!fs.existsSync(distFeedDir)) {
      fs.mkdirSync(distFeedDir, { recursive: true });
    }
    const distFeedPath = path.resolve(distFeedDir, 'google-shopping.xml');
    fs.writeFileSync(distFeedPath, xmlContent, 'utf-8');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cliBaseArg = process.argv.find((arg) => arg.startsWith('--base-url='));
  const cliApiArg = process.argv.find((arg) => arg.startsWith('--api-url='));
  void writeGoogleShoppingFeed(
    cliBaseArg ? cliBaseArg.split('=')[1] : undefined,
    cliApiArg ? cliApiArg.split('=')[1] : undefined,
  );
}
