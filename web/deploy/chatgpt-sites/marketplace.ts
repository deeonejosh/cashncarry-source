import {currentAccount, readBody, type AuthEnvironment, hasValidMutationOrigin } from './new-auth';

import { readProduct, type CatalogDatabase } from './catalog';
import { escape, page } from './catalog-pages';
import { managedPhotoId } from './product-photos';

interface Environment extends AuthEnvironment { DB?: CatalogDatabase; ORDER_RESERVATIONS?: string }
type Item = { id: string; name: string; price_minor: number; stock: number; revision: number; publication: string };
type Store = { name: string; description: string };
type CatalogProduct = { name: string; stock: number; price: number };
const routes = new Set(['/seller/store', '/seller/products', '/cart', '/api/seller/store', '/api/seller/products', '/api/cart']);
const redirect = (path: string) => new Response(null,{status:303,headers:{location:path,'cache-control':'no-store'}});
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
function integer(value: unknown, min: number, max: number) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

export async function marketplaceRoute(request: Request, env: Environment): Promise<Response | null> {
  const url = new URL(request.url);
  if (!routes.has(url.pathname)) return null;
  const api = url.pathname.startsWith('/api/');
  const path = api ? url.pathname.slice(4) : url.pathname;
  const respond = (status: number, message: string) => api
    ? Response.json({error:message},{status,headers:{'cache-control':'no-store'}})
    : page(message,`<h1>${escape(message)}</h1><p><a href="${path}">Return</a></p>`,status);
  const result = (value: unknown) => Response.json(value,{headers:{'cache-control':'no-store'}});
  if (!env.AUTH_DB || env.AUTH_ORIGIN !== url.origin || url.protocol !== 'https:') return respond(503,'Marketplace service unavailable');
  const account = await currentAccount(request,env);
  if (!account) return api ? respond(401,'Sign-in required') : redirect('/sign-in');
  if (path === '/cart' ? !['buyer','seller'].includes(account.role) : account.role !== 'seller') return respond(403,'Access denied');
  if (request.method !== 'GET' && request.method !== 'POST') return respond(405,'Method not allowed');
  const db = env.AUTH_DB;
  const owner = account.id;
  if (path !== '/cart') {
    const approved = await db.prepare("SELECT 1 AS ok FROM cnc_seller_applications WHERE user_id=? AND status='approved'").bind(owner).first();
    if (!approved) return respond(403, 'Seller approval required');
  }
  async function cartProduct(id: string, source: string): Promise<CatalogProduct | null> {
    if (source === 'replacement') {
      if (env.ORDER_RESERVATIONS !== 'enabled') return null;
      const product = await db!.prepare(`SELECT p.name,p.stock,p.price_minor / 100.0 AS price FROM cnc_seller_products p
        JOIN cnc_auth_users u ON u.id=p.owner WHERE p.id=? AND p.publication='published' AND p.archived=0
          AND u.role='seller' AND u.verified=1 AND u.suspended=0`).bind(id).first<CatalogProduct>();
      return product;
    }
    return env.DB ? await readProduct(env.DB,id) as CatalogProduct | null : null;
  }
  if (request.method === 'POST') {
    if (!hasValidMutationOrigin(request, env)) return respond(403,'Invalid request origin');
    let body: Record<string,unknown>;
    try { body = await readBody(request); } catch { return respond(400,'Invalid request'); }
    if (path === '/seller/store') {
      const name = text(body.name), description = text(body.description);
      const category = text(body.category) || 'fashion', location = text(body.location) || 'Lagos';
      const phone = text(body.phone);
      if (!name || name.length > 100 || description.length > 500 || category.length > 80
          || location.length > 80 || phone.length > 30) return respond(400,'Invalid store details');
      await db.prepare("INSERT INTO cnc_seller_stores (owner,name,description,category,location,phone) VALUES (?,?,?,?,?,?) "+
        "ON CONFLICT(owner) DO UPDATE SET name=excluded.name,description=excluded.description,"+
        "category=excluded.category,location=excluded.location,phone=excluded.phone"
      ).bind(owner,name,description,category,location,phone).run();
      const storefront = await db.prepare("SELECT owner AS id,owner AS owner_id,name,description,category,location,phone,1 AS verified,0 AS followers_count "+
        "FROM cnc_seller_stores WHERE owner=?").bind(owner).first();
      return api ? result({saved:true,storefront}) : redirect(path);
    } else if (path === '/seller/products') {
      const id = text(body.id);
      const revision = integer(body.revision,1,Number.MAX_SAFE_INTEGER);
      if (body.action === 'submit' || body.action === 'unpublish') {
        if (!id || revision === null) return respond(400,'Invalid product revision');
        const submit = body.action === 'submit';
        const changed = await db.prepare(`UPDATE cnc_seller_products SET publication=?,revision=revision+1
          WHERE id=? AND owner=? AND revision=? AND archived=0 AND publication=? RETURNING id`)
          .bind(submit ? 'pending' : 'draft',id,owner,revision,submit ? 'draft' : 'published').first();
        if (!changed) return respond(409,'Product unavailable or changed');
      } else if (body.action === 'archive') {
        if (!id || revision === null) return respond(400,'Invalid product revision');
        const changed = await db.prepare(`UPDATE cnc_seller_products SET archived=1,revision=revision+1
          WHERE id=? AND owner=? AND revision=? AND archived=0 RETURNING id`).bind(id,owner,revision).first();
        if (!changed) return respond(409,'Product unavailable or changed');
      } else {
        const name = text(body.name);
        const price = integer(body.priceMinor ?? body.price_minor,1,1000000000);
        const stock = integer(body.stock,0,1000000);
        const categoryInput = typeof body.category === 'string' ? text(body.category) : null;
        const descriptionInput = typeof body.description === 'string' ? text(body.description) : null;
        const imageInput = typeof body.imageUrl === 'string' ? text(body.imageUrl) :
          typeof body.image === 'string' ? text(body.image) : null;
        const photoId = managedPhotoId(imageInput || '', url.origin);
        const validImage = photoId
          ? imageInput === url.origin + '/media/product-photos/' + photoId
          : !imageInput || /^https:\/\/[a-z\d.-]+(?:\/|$)/i.test(imageInput);
        const brandInput = typeof body.brand === 'string' ? text(body.brand) : null;
        const compareInput = body.compareAtMinor ?? body.compare_at_minor;
        const compare = compareInput === undefined || compareInput === null ? null :
          integer(compareInput,0,1000000000);
        if (!name || name.length > 160 || price === null || stock === null ||
            (categoryInput !== null && categoryInput.length > 80) ||
            (descriptionInput !== null && descriptionInput.length > 2000) ||
            (brandInput !== null && brandInput.length > 100) ||
            !validImage || (imageInput !== null && imageInput.length > 1000) ||
            (compareInput !== undefined && compareInput !== null && compare === null)) {
          return respond(400,'Invalid product details');
        }
        if (photoId && !await db.prepare('SELECT 1 FROM cnc_seller_product_photos WHERE id=? AND owner=?')
          .bind(photoId, owner).first()) return respond(400, 'Select a photo uploaded by this seller.');
        if (body.action === 'create') {
          if (!/^[a-f0-9-]{36}$/i.test(id)) return respond(400,'Invalid product request ID');
          const created = await db.prepare(
            "INSERT INTO cnc_seller_products "+
            "(id,owner,name,price_minor,stock,category,description,image,brand,compare_at_minor,featured,created) "+
            "SELECT ?,owner,?,?,?,?,?,?,?,?,0,unixepoch() FROM cnc_seller_stores WHERE owner=? "+
            "ON CONFLICT(id) DO NOTHING RETURNING id"
          ).bind(id,name,price,stock,categoryInput || 'uncategorized',descriptionInput || '',
            imageInput || '',brandInput || '',compare ?? price,owner).first();
          if (!created) return respond(409,'Create a store first or reload before retrying');
        } else {
          if (body.action !== 'update' || !id || revision === null) return respond(400,'Invalid product revision');
          const changed = await db.prepare(
            "UPDATE cnc_seller_products SET name=?,price_minor=?,stock=?,"+
            "category=COALESCE(?,category),description=COALESCE(?,description),"+
            "image=COALESCE(?,image),brand=COALESCE(?,brand),"+
            "compare_at_minor=COALESCE(?,compare_at_minor),"+
            // Evaluate against the pre-update values in the same atomic UPDATE.
            // Stock-only changes preserve the owner's one-time product approval.
            "publication=CASE WHEN publication='published' AND name=? AND price_minor=? "+
              "AND category=COALESCE(?,category) AND description=COALESCE(?,description) "+
              "AND image=COALESCE(?,image) AND brand=COALESCE(?,brand) "+
              "AND compare_at_minor=COALESCE(?,compare_at_minor) "+
              "THEN 'published' ELSE 'draft' END,revision=revision+1 "+
            "WHERE id=? AND owner=? AND revision=? AND archived=0 AND ? + COALESCE(("+
              "SELECT SUM(i.quantity) FROM cnc_order_items i JOIN cnc_orders o ON o.id=i.order_id "+
              "WHERE i.product_id=cnc_seller_products.id AND o.status='awaiting_payment'"+
            "),0)<=1000000 RETURNING id"
          ).bind(name,price,stock,categoryInput,descriptionInput,imageInput,brandInput,
            compare,name,price,categoryInput,descriptionInput,imageInput,brandInput,
            compare,id,owner,revision,stock).first();
          if (!changed) return respond(409,'Product unavailable or changed');
        }
      }
    } else {
      const id = text(body.id), quantity = integer(body.quantity,0,99);
      const source = body.source === 'replacement' ? 'replacement' : 'legacy';
      if (!id || id.length > 100 || quantity === null) return respond(400,'Invalid cart item');
      if (quantity === 0) await db.prepare('DELETE FROM cnc_buyer_cart WHERE buyer=? AND product=?').bind(owner,id).run();
      else {
        if (!env.DB && env.ORDER_RESERVATIONS !== 'enabled') return respond(503,'Catalog unavailable');
        const product = await cartProduct(id,source);
        if (!product || product.stock < quantity) return respond(409,'Requested stock unavailable');
        const saved = await db.prepare(`INSERT INTO cnc_buyer_cart (buyer,product,quantity,source)
          SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM cnc_buyer_cart WHERE buyer=?)<40
            OR EXISTS (SELECT 1 FROM cnc_buyer_cart WHERE buyer=? AND product=?)
          ON CONFLICT(buyer,product) DO UPDATE SET quantity=excluded.quantity,source=excluded.source RETURNING product`).bind(owner,id,quantity,source,owner,owner,id).first();
        if (!saved) return respond(409,'Cart item limit reached');
      }
    }
    return api ? result({updated:true}) : redirect(path);
  }

  if (path === '/seller/store') {
    const store = await db.prepare('SELECT owner AS id,owner AS owner_id,name,description,category,location,phone,1 AS verified,0 AS followers_count FROM cnc_seller_stores WHERE owner=?').bind(owner).first<Store>();
    return api ? result({storefront:store || null}) : page('Store profile',`<h1>Store profile</h1><form method="post" class="account-form">
      <label for="name">Store name</label><input id="name" name="name" maxlength="100" required value="${escape(store?.name)}">
      <label for="description">Description</label><input id="description" name="description" maxlength="500" value="${escape(store?.description)}">
      <button>Save store profile</button></form><p><a href="/seller/products">Manage product drafts</a></p>`);
  }
  if (path === '/seller/products') {
    const {results:items} = await db.prepare(`SELECT id,owner,name,description,category,brand,price_minor,compare_at_minor,stock,image AS image_url,featured,revision,publication,created FROM cnc_seller_products
      WHERE owner=? AND archived=0 ORDER BY rowid DESC LIMIT 50`).bind(owner).all<Item>();
    if (api) return result({items});
    const fields = (item?:Item) => `<label>Product name <input name="name" maxlength="160" required value="${escape(item?.name)}"></label>
      <label>Price in kobo <input type="number" name="price_minor" min="1" max="1000000000" required value="${escape(item?.price_minor)}"></label>
      <label>Stock <input type="number" name="stock" min="0" max="1000000" required value="${escape(item?.stock)}"></label>`;
    return page('Product drafts',`<h1>Product drafts</h1><p>Drafts are visible only to your seller account.</p>
      <form method="post" class="account-form"><input type="hidden" name="id" value="${crypto.randomUUID()}">${fields()}<button name="action" value="create">Create draft</button></form>
      ${items.map(item => `<section class="card"><h2>${escape(item.name)}</h2><p>Status: ${escape(item.publication)}</p><form method="post" class="account-form">
      <input type="hidden" name="id" value="${escape(item.id)}"><input type="hidden" name="revision" value="${item.revision}">${fields(item)}
      <button name="action" value="update">Save changes</button><button name="action" value="archive">Archive</button>
      ${item.publication === 'draft' ? '<button name="action" value="submit">Submit for review</button>' : item.publication === 'published' ? '<button name="action" value="unpublish">Unpublish</button>' : ''}</form></section>`).join('')}`);
  }
  if (!env.DB && env.ORDER_RESERVATIONS !== 'enabled') return respond(503,'Catalog unavailable');
  const {results:rows} = await db.prepare('SELECT product,quantity,source FROM cnc_buyer_cart WHERE buyer=? ORDER BY rowid LIMIT 40').bind(owner).all<{product:string;quantity:number;source:string}>();
  const items = await Promise.all(rows.map(async row => ({...row, details:await cartProduct(row.product,row.source)})));
  return api ? result({items}) : page('Your cart',`<h1>Your cart</h1>
    ${items.map(row => `<article class="card"><h2>${escape(row.details?.name ?? 'Unavailable product')}</h2>
    <p>Quantity: ${row.quantity}. ${row.details && row.details.stock >= row.quantity ? 'Currently in stock' : 'Stock unavailable'}</p>
    <form method="post"><input type="hidden" name="id" value="${escape(row.product)}"><button name="quantity" value="0">Remove</button></form></article>`).join('') || '<p>Your cart is empty.</p>'}
    ${env.ORDER_RESERVATIONS === 'enabled' ? '<p><a href="/checkout">Checkout</a> · <a href="/orders">Order history</a></p>' : '<p>Checkout is unavailable.</p>'}<a href="/shop">Continue shopping</a>`);
}
