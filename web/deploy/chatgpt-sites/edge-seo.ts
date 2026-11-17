import { readProduct, type CatalogDatabase } from './catalog';

interface EdgeSEOContext {
  url: URL;
  db?: CatalogDatabase;
  baseUrl?: string;
}

interface EdgeSEOResult {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'product';
  image: string;
  jsonLd: Record<string, any>;
}

const CATEGORY_MAP: Record<string, { label: string; desc: string }> = {
  tech: {
    label: 'Tech & Electronics Deals',
    desc: 'Shop authentic gadgets, smartphones, audio gear, and accessories at wholesale prices in Nigeria. Fast dispatch with verified escrow warranty protection.',
  },
  fashion: {
    label: 'Fashion & Ankara Collections',
    desc: 'Discover trending Nigerian fashion, Ankara prints, and ready-to-wear apparel from verified Lagos designers with fast nationwide delivery and escrow.',
  },
  beauty: {
    label: 'Beauty & Skincare Essentials',
    desc: 'Shop genuine skincare, cosmetics, and beauty sets from verified Nigerian sellers. Guaranteed authentic formulas with secure escrow checkout and delivery.',
  },
  food: {
    label: 'Food & Groceries Fresh Market',
    desc: 'Order pantry staples, fresh food, and wholesale groceries in Nigeria. Direct from market vendors with refrigerated handling and express doorstep delivery.',
  },
  home: {
    label: 'Home & Kitchen Appliances',
    desc: 'Shop quality home essentials, cookware, and reliable kitchen appliances with manufacturer warranty, secure payment escrow, and fast delivery in Nigeria.',
  },
  services: {
    label: 'Verified Services & Logistics',
    desc: 'Book verified commercial services, logistics dispatch, and artisan assistance across Lagos and Nigeria with escrow protection and money-back guarantee.',
  },
};

export async function resolveEdgeSEO({ url, db, baseUrl }: EdgeSEOContext): Promise<EdgeSEOResult> {
  const origin = (baseUrl || url.origin || 'https://www.cashncarryng.com').replace(/\/+$/, '');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const defaultImage = `${origin}/brand/logo.png`;

  // 1. Product Detail Page: /product/:slug or /products/:slug
  const productMatch = /^\/(?:product|products)\/([^/]+)$/.exec(pathname);
  if (productMatch) {
    const rawId = decodeURIComponent(productMatch[1]);
    // Resolve public metadata through the same authorised catalog query as the API.
    // No static/demo products, fuzzy matches, unpublished items or unverified stores.
    let product: {
      id: string;
      slug: string;
      title: string;
      brand: string;
      price: number;
      description: string;
      image: string;
      category: string;
    } | null = null;

    if (db) {
      try {
        const record = await readProduct(db, rawId);
        if (record) {
          const item = record as Record<string, unknown>;
          const price = Number(item.price);
          if (Number.isFinite(price) && price > 0) {
            product = {
              id: String(item.id),
              slug: String(item.id),
              title: String(item.name || ''),
              brand: 'Verified seller',
              price,
              description: String(item.description || ''),
              image: String(item.image || ''),
              category: String(item.category || ''),
            };
          }
        }
      } catch {
        // Catalog unavailable: return generic metadata without revealing products.
      }
    }

    if (product) {
      const formattedPrice = `₦${product.price.toLocaleString()}`;
      const title = `${product.title} - ${formattedPrice} | Cash N Carry`.slice(0, 60);
      const rawDesc = `${product.title} by ${product.brand}. Buy for ${formattedPrice} on Cash N Carry Nigeria with fast delivery, warranty, and secure escrow.`;
      const description = rawDesc.length > 160 ? `${rawDesc.slice(0, 157)}...` : rawDesc;
      const canonicalUrl = `${origin}/product/${encodeURIComponent(product.slug || product.id)}`;

      const breadcrumbs = {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: `${origin}/shop` },
          {
            '@type': 'ListItem',
            position: 3,
            name: CATEGORY_MAP[product.category]?.label || product.category || 'Catalog',
            item: `${origin}/shop?category=${encodeURIComponent(product.category || 'all')}`,
          },
          { '@type': 'ListItem', position: 4, name: product.title, item: canonicalUrl },
        ],
      };

      const productSchema = {
        '@type': 'Product',
        name: product.title,
        image: [product.image || defaultImage],
        description: product.description,
        sku: product.id,
        brand: { '@type': 'Brand', name: product.brand || 'Cash N Carry Nigeria' },
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'NGN',
          price: product.price,
          itemCondition: 'https://schema.org/NewCondition',
          availability: 'https://schema.org/InStock',
        },
      };

      return {
        title,
        description,
        canonicalUrl,
        ogType: 'product',
        image: product.image || defaultImage,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [productSchema, breadcrumbs],
        },
      };
    }
  }

  // 2. Shop & Category Catalog
  if (pathname === '/shop') {
    const categoryQuery = url.searchParams.get('category')?.toLowerCase();
    const catData = categoryQuery ? CATEGORY_MAP[categoryQuery] : null;

    const title = catData
      ? `${catData.label} | Cash N Carry Nigeria`
      : 'Shop Marketplace Wholesale & Retail | Cash N Carry';

    const description = catData
      ? catData.desc
      : 'Browse verified Nigerian wholesale and retail products with genuine CAC-verified seller protection, instant delivery, and Flutterwave escrow payments.';

    const canonicalUrl = categoryQuery && categoryQuery !== 'all'
      ? `${origin}/shop?category=${encodeURIComponent(categoryQuery)}`
      : `${origin}/shop`;

    const breadcrumbItems = [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${origin}/shop` },
    ];

    if (catData) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: catData.label,
        item: canonicalUrl,
      });
    }

    return {
      title,
      description,
      canonicalUrl,
      ogType: 'website',
      image: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: catData ? catData.label : 'Cash N Carry Marketplace Catalog',
            description,
            url: canonicalUrl,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems,
          },
        ],
      },
    };
  }

  // 3. Section Pages
  const sectionMap: Record<string, { title: string; desc: string }> = {
    '/auctions': {
      title: 'Live Penny Auctions & Bidding | Cash N Carry Nigeria',
      desc: 'Bid in real-time verified auctions starting at ₦100. Win premium electronics, phones, and appliances with fast delivery and transparent escrow tracking.',
    },
    '/live': {
      title: 'Interactive Live Shopping Stream | Cash N Carry',
      desc: 'Watch interactive live shopping streams from verified Nigerian vendors, claim exclusive flash vouchers, and buy featured products with 1-click checkout.',
    },
    '/flash-deals': {
      title: 'Flash Deals & Limited Discounts | Cash N Carry',
      desc: 'Grab limited-time flash sales with up to 60% off top electronics, fashion, and daily essentials across Nigeria. Secure escrow protection on every order.',
    },
    '/coins': {
      title: 'CNC Coins, Gifting & Rewards | Cash N Carry Nigeria',
      desc: 'Claim daily CNC reward coins, send stream gifts to verified sellers, and unlock loyalty discounts on your Cash N Carry purchases across Nigeria.',
    },
    '/returns': {
      title: 'Returns & Escrow Protection | Cash N Carry Nigeria',
      desc: 'Cash N Carry 7-day buyer protection: easy returns, dispute resolution, and instant escrow refund protection for all verified marketplace purchases.',
    },
  };

  if (sectionMap[pathname]) {
    const info = sectionMap[pathname];
    const canonicalUrl = `${origin}${pathname}`;
    return {
      title: info.title,
      description: info.desc,
      canonicalUrl,
      ogType: 'website',
      image: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            name: info.title,
            description: info.desc,
            url: canonicalUrl,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: info.title, item: canonicalUrl },
            ],
          },
        ],
      },
    };
  }

  // Default: Homepage
  const canonicalUrl = `${origin}/`;
  return {
    title: 'Cash N Carry Nigeria | Online Shopping & Live Deals',
    description:
      "Shop Nigeria's premier live commerce marketplace for authentic fashion, tech, groceries, and appliances with fast nationwide delivery and escrow protection.",
    canonicalUrl,
    ogType: 'website',
    image: defaultImage,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          name: 'Cash N Carry Nigeria',
          url: canonicalUrl,
          description:
            "Nigeria's premier live commerce marketplace for authentic fashion, tech, groceries, and appliances with fast nationwide delivery and escrow protection.",
        },
      ],
    },
  };
}

/**
 * Injects pre-rendered SEO metadata directly into the raw HTML string
 * for crawlers (Googlebot, Bingbot, Twitterbot, etc.) that do not execute client JS.
 */
// Untrusted seller-supplied titles/descriptions must never become HTML or script markup.
function escapeSEOText(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeSEOAttribute(value: string): string {
  return escapeSEOText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function safeStructuredData(value: Record<string, unknown>): string {
  // JSON-LD inside HTML is still a script tag; encode closing-tag characters.
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function injectEdgeSEOMeta(html: string, seo: EdgeSEOResult): string {
  let modified = html;
  const titleText = escapeSEOText(seo.title);
  const titleAttr = escapeSEOAttribute(seo.title);
  const descAttr = escapeSEOAttribute(seo.description);
  const canonicalAttr = escapeSEOAttribute(seo.canonicalUrl);
  const imageAttr = escapeSEOAttribute(seo.image);

  if (/<title>[\s\S]*?<\/title>/i.test(modified)) {
    modified = modified.replace(/<title>[\s\S]*?<\/title>/i, () => '<title>' + titleText + '</title>');
  } else {
    modified = modified.replace(/<head>/i, () => '<head>\n    <title>' + titleText + '</title>');
  }

  const descriptionTag = '<meta name="description" content="' + descAttr + '" />';
  if (/<meta\s+name=["']description["'][^>]*>/i.test(modified)) {
    modified = modified.replace(/<meta\s+name=["']description["'][^>]*>/i, () => descriptionTag);
  } else {
    modified = modified.replace(/<\/title>/i, () => '</title>\n    ' + descriptionTag);
  }

  const canonicalTag = '<link rel="canonical" href="' + canonicalAttr + '" />';
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(modified)) {
    modified = modified.replace(/<link\s+rel=["']canonical["'][^>]*>/i, () => canonicalTag);
  } else {
    modified = modified.replace(/<\/title>/i, () => '</title>\n    ' + canonicalTag);
  }

  const socialTags = [
    '<meta property="og:title" content="' + titleAttr + '" />',
    '<meta property="og:description" content="' + descAttr + '" />',
    '<meta property="og:url" content="' + canonicalAttr + '" />',
    '<meta property="og:type" content="' + seo.ogType + '" />',
    '<meta property="og:image" content="' + imageAttr + '" />',
    '<meta property="og:site_name" content="Cash N Carry Nigeria" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + titleAttr + '" />',
    '<meta name="twitter:description" content="' + descAttr + '" />',
    '<meta name="twitter:image" content="' + imageAttr + '" />',
    '<meta name="twitter:url" content="' + canonicalAttr + '" />',
    '<script id="cnc-seo-structured-data" type="application/ld+json">' +
      safeStructuredData(seo.jsonLd) + '</script>',
  ].join('\n    ');

  // Deduplicate only SEO-owned tags, not unrelated site metadata.
  modified = modified.replace(/<meta\s+property=["']og:(?:title|description|url|type|image|site_name)["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+name=["']twitter:(?:card|title|description|image|url)["'][^>]*>/gi, '');
  modified = modified.replace(/<script id=["']cnc-seo-structured-data["'][^>]*>[\s\S]*?<\/script>/gi, '');

  return modified.replace(/<\/head>/i, () => '\n    ' + socialTags + '\n  </head>');
}
