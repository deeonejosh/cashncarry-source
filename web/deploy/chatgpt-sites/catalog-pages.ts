import { readActiveCategories, readProduct, readProducts, readStorefront, type CatalogDatabase } from './catalog';

type Product = { id: string; name: string; description: string; store: string; price: number; stock: number; image: string };
type Storefront = { id: string; name: string; description: string; location: string; verified: number };

const encode = encodeURIComponent;
export const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const price = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });
const shop = (params: URLSearchParams) => '/shop?' + params.toString();

export function page(title: string, content: string, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | Cash N Carry</title>
<link rel="icon" href="/brand/icon.png"><link rel="apple-touch-icon" href="/brand/icon.png"><link rel="manifest" href="/manifest.webmanifest">
<style>
*{box-sizing:border-box}body{margin:0;font:16px system-ui;color:#17251e;background:white}header,footer,main{max-width:1200px;margin:auto;padding:1rem}header,footer,nav,form{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}header{justify-content:space-between;border-bottom:1px solid #e6ede8}header nav a{font-weight:700;text-decoration:none}header img,footer img{width:144px;height:auto}.catalog-search{margin:1.25rem 0}.catalog-search input{flex:1;min-width:min(100%,220px)}.card a{text-decoration:none}.card a:hover{text-decoration:underline}.card{box-shadow:0 4px 16px #1235240a}.hero a.button{text-decoration:none}@media(max-width:480px){header nav{gap:.65rem;font-size:.9rem}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}.card{padding:.7rem}.card h2{font-size:1rem}}a{color:#065f46}a:focus-visible,input:focus-visible,button:focus-visible{outline:3px solid #e68110;outline-offset:3px}.hero{background:linear-gradient(110deg,#047857,#064e3b);color:white;border-radius:28px;padding:clamp(1.25rem,5vw,3rem)}h1{font-size:clamp(1.8rem,5vw,3rem);margin:.25rem 0}section{margin:1.5rem 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:1rem}.card{border:1px solid #e2e8e5;border-radius:22px;padding:1rem;min-width:0;overflow-wrap:anywhere}.card img{width:100%;max-height:340px;aspect-ratio:4/3;object-fit:contain;border-radius:12px;background:#f7faf8}.button,button{display:inline-block;border:0;border-radius:999px;padding:.65rem 1rem;background:#f59e0b;color:#202016;font:inherit;font-weight:700}form.account-form{display:grid;max-width:420px;align-items:stretch}input,select{padding:.65rem;border:1px solid #a2afa7;border-radius:12px;max-width:100%}nav.categories a{padding:.65rem 1rem;border-radius:12px;background:#e9f7ef}nav.categories a:nth-child(3n){background:#fff0d6}nav.categories a:nth-child(3n+1){background:#fce7f3}footer{border-top:1px solid #e2e8e5}
</style></head><body><header><a href="/"><img width="2172" height="724" src="/brand/logo.png" alt="Cash N Carry"></a><nav aria-label="Main"><a href="/shop">Shop</a><a href="/account">My account</a><a href="/cart">Cart</a><a href="/orders">Orders</a></nav></header>
<main id="main">${content}</main><footer><img width="2172" height="724" src="/brand/logo.png" alt="Cash N Carry"></footer></body></html>`, {
    status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

function card(product: Product, detail = false) {
  const image = /^(?:https:\/\/|\/(?!\/))/i.test(product.image ?? '') && !product.image.includes('\\')
    ? `<img src="${escape(product.image)}" alt="${escape(product.name)}" loading="lazy">` : '';
  return `<article class="card">${image}<${detail ? "h1" : "h2"}>${detail ? escape(product.name) : `<a href="/products/${encode(product.id)}">${escape(product.name)}</a>`}</${detail ? "h1" : "h2"}>
<p><strong>${escape(price.format(product.price))}</strong> · ${product.stock > 0 ? 'In stock' : 'Out of stock'}</p>
${detail ? `<p>${escape(product.description)}</p><a href="/sellers/${encode(product.store)}">Visit storefront</a><form method="post" action="/cart"><input type="hidden" name="id" value="${escape(product.id)}"><label>Quantity <input type="number" name="quantity" min="1" max="99" value="1" required></label><button>Set cart quantity</button></form>` : ''}</article>`;
}

export function protectedPageUnavailable(path: string) {
  const seller = path === '/seller' || path.startsWith('/seller/');
  const admin = path === '/admin' || path.startsWith('/admin/');
  const title = admin ? 'Admin Console' : path === '/seller/products' ? 'Manage products'
    : path === '/seller/register' ? 'Seller registration' : seller ? 'Seller Centre'
    : path === '/register' ? 'Create an account' : ['/sign-in', '/login'].includes(path) ? 'Sign in' : 'My account';
  const message = admin ? 'Administrator access is unavailable in this build.'
    : seller ? 'Seller account access and product management are unavailable in this build.'
    : 'Sign-in and account management are unavailable in this build.';
  return page(title, `<section class="hero"><h1>${title}</h1></section><section class="card">
<p role="status">${message}</p><a href="/shop">Browse the Shop</a></section>`, 503);
}

export async function homePage(db?: CatalogDatabase) {
  const hero = '<section class="hero"><h1>Watch live.<br>Discover. Shop.</h1><p>Discover independent Nigerian sellers and shop local.</p><a class="button" href="/shop">Start shopping</a></section>';
  if (!db) return page('Cash N Carry Nigeria', hero + '<p>Catalog temporarily unavailable.</p>', 503);
  try {
    const [categories, products] = await Promise.all([
      readActiveCategories(db),
      readProducts(db, '', '', '', 0) as Promise<Product[]>,
    ]);
    return page('Cash N Carry Nigeria', hero +
      `<form action="/shop" method="get" class="catalog-search"><label for="home-search">Search products</label>
      <input id="home-search" name="q" maxlength="100" placeholder="Search the marketplace"><button>Search</button></form>
      <section><h2>Shop by category</h2>${categories.length ? `<nav class="categories" aria-label="Categories">${categories.map(category =>
        `<a href="${escape(shop(new URLSearchParams({ category: category.id })))}">${escape(category.name)}</a>`,
      ).join('')}</nav>` : '<p>No active categories yet.</p>'}</section>
<section><h2>Discover products</h2><div class="grid">${products.length ? products.slice(0, 8).map(product => card(product)).join('') : '<p>No products available yet.</p>'}</div></section>`);
  } catch {
    return page('Cash N Carry Nigeria', hero + '<p>Catalog temporarily unavailable.</p>', 503);
  }
}

export async function catalogPage(url: URL, db?: CatalogDatabase) {
  if (!db) return page('Catalog unavailable', '<h1>Catalog temporarily unavailable</h1>', 503);
  try {
    const match = /^\/(products|sellers)\/([^/]+)$/.exec(url.pathname);
    const id = match ? decodeURIComponent(match[2]) : '';
    if (id.length > 100) return page('Invalid identifier', '<h1>Invalid identifier</h1>', 400);
    if (match?.[1] === 'products') {
      const item = await readProduct(db, id) as Product | null;
      return item ? page(item.name, card(item, true)) : page('Product not found', '<h1>Product not found</h1>', 404);
    }

    const storefront = match ? await readStorefront(db, id) as Storefront | null : null;
    if (match && !storefront) return page('Storefront not found', '<h1>Storefront not found</h1>', 404);
    const q = (url.searchParams.get('q') ?? '').slice(0, 100);
    const category = (url.searchParams.get('category') ?? '').slice(0, 100);
    const store = storefront?.id ?? (url.searchParams.get('store') ?? '').slice(0, 100);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 10000) return page('Invalid page', '<h1>Invalid page</h1>', 400);
    const [products, categories] = await Promise.all([
      readProducts(db, q, store, category, offset) as Promise<Product[]>,
      storefront ? [] : readActiveCategories(db),
    ]);
    const title = storefront?.name ?? 'Discover all the best deals';
    const search = new URLSearchParams({ q, category, store });
    const navigation = (label: string, next: number) => {
      search.set('offset', String(next));
      const href = (storefront ? '/sellers/' + encode(storefront.id) + '?' + search : shop(search));
      return `<a class="button" href="${escape(href)}">${label}</a>`;
    };
    return page(title, `<section class="hero"><h1>${escape(title)}</h1>${storefront ? `<p>Verified seller · ${escape(storefront.location)}</p><p>${escape(storefront.description)}</p>` : ''}</section>
<form><label for="q">Search products</label><input id="q" name="q" maxlength="100" value="${escape(q)}"><input type="hidden" name="store" value="${escape(store)}"><input type="hidden" name="category" value="${escape(category)}"><button>Search</button></form>
${categories.length ? `<section><h2>Categories</h2><nav aria-label="Categories"><a href="${escape(shop(new URLSearchParams({ q, store })))}">All categories</a>${categories.map(item => `<a href="${escape(shop(new URLSearchParams({ q, store, category: item.id })))}">${escape(item.name)}</a>`).join('')}</nav></section>` : ''}
<section class="grid" aria-label="Products">${products.length ? products.map(product => card(product)).join('') : '<p>No matching products.</p>'}</section>
<nav aria-label="Product pages">${offset ? navigation('Previous', Math.max(0, offset - 25)) : ''}${products.length === 25 && offset + 25 <= 10000 ? navigation('Next', offset + 25) : ''}</nav>`);
  } catch (error) {
    if (error instanceof URIError) return page('Invalid identifier', '<h1>Invalid identifier</h1>', 400);
    return page('Catalog unavailable', '<h1>Catalog temporarily unavailable</h1>', 503);
  }
}
