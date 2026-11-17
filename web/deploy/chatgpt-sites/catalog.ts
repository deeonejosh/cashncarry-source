// Read-only adapter. The Sites DB binding exposes the live D1 categories table.
export interface CatalogDatabase {
  prepare(sql: string): {
    bind(...values: (string | number)[]): { all<T>(): Promise<{ results: T[] }> };
  };
}

export interface Category {
  id: string;
  name: string;
}

export async function readActiveCategories(db: CatalogDatabase, search = ''): Promise<Category[]> {
  const term = search.trim().replace(/[\\%_]/g, '\\$&');
  const { results } = await db.prepare(
    "SELECT id, name FROM categories WHERE active = 1 AND name LIKE ? ESCAPE '\\' ORDER BY name, id LIMIT 100",
  ).bind(`%${term}%`).all<Category>();
  return results;
}

const productFields = 'p.id, p.store, p.name, p.description, p.category, p.price, p.stock, p.image, p.featured';
const publicProducts = 'FROM products p JOIN stores s ON s.id = p.store WHERE p.active = 1 AND s.verified = 1 AND s.suspended = 0';

export async function readProducts(db: CatalogDatabase, term: string, store: string, category: string, offset: number) {
  const pattern = `%${term.trim().replace(/[\\%_]/g, '\\$&')}%`;
  const { results } = await db.prepare(
    `SELECT ${productFields} ${publicProducts}
    AND p.name LIKE ? ESCAPE '\\' AND (? = '' OR p.store = ?)
    AND (? = '' OR p.category = ?) ORDER BY p.featured DESC, p.id LIMIT 25 OFFSET ?`,
  ).bind(pattern, store, store, category, category, offset).all();
  return results;
}

export async function readProduct(db: CatalogDatabase, id: string) {
  const { results } = await db.prepare(
    `SELECT ${productFields} ${publicProducts} AND p.id = ? LIMIT 1`,
  ).bind(id).all();
  return results[0] ?? null;
}

export async function readStorefront(db: CatalogDatabase, id: string) {
  const { results } = await db.prepare(
    'SELECT id, name, description, category, location, verified FROM stores WHERE id = ? AND verified = 1 AND suspended = 0 LIMIT 1',
  ).bind(id).all();
  return results[0] ?? null;
}

// Verified, non-suspended storefront discovery for native and web clients.
export async function readStorefronts(db: CatalogDatabase, offset: number) {
  const { results } = await db.prepare(
    `SELECT id, name, description, category, location, verified FROM stores
     WHERE verified = 1 AND suspended = 0 ORDER BY name, id LIMIT 25 OFFSET ?`,
  ).bind(offset).all();
  return results;
}
