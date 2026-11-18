import { expireUnpaidReservations } from './reservation-expiry';
import { checkoutPage } from './checkout-pages';
import { flutterwaveRoute, type PaymentEnvironment } from './flutterwave';
import { streamRoute, type StreamEnvironment } from './stream';
import { areKycUploadsConfigured, kycRoute, type KycEnvironment } from './kyc';
import { newsletterRoute } from './newsletter';
import { sellerApplicationRoute } from './seller-application';
import { adminRoute } from './admin';
import { ownerSetupRoute } from './owner-setup';
import { ordersRoute } from './orders';
import { marketplaceRoute } from './marketplace';
import { productPhotoRoute } from './product-photos';
import { accountPage } from './account-pages';
import { authRoute, currentAccount, type AuthEnvironment } from './new-auth';
import { auctionsRoute } from './auctions';
import { coinsRoute } from './coins';
import { catalogPage, homePage, protectedPageUnavailable } from './catalog-pages';
import { readActiveCategories, readProduct, readProducts, readStorefront, readStorefronts, type CatalogDatabase } from './catalog';
import { resolveEdgeSEO, injectEdgeSEOMeta } from './edge-seo';
import { unifiedSyncRoute } from './unified-sync';
import { supportRoute } from './support';

interface Environment extends AuthEnvironment, KycEnvironment, StreamEnvironment, PaymentEnvironment {
  DB?: CatalogDatabase & { prepare(sql: string): { first<T = unknown>(): Promise<T | null> } };
  ORDER_RESERVATIONS?: string;
  PAYMENTS_ENABLED?: string;
  COINS_PURCHASES_ENABLED?: string;
  KYC_UPLOADS_ENABLED?: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(originalRequest: Request, env: Environment): Promise<Response> {
    const rawUrl = new URL(originalRequest.url);
    const normalizedPath = rawUrl.pathname.startsWith('/api/v1/') && !rawUrl.pathname.startsWith('/api/v1/admin')
      ? '/api/' + rawUrl.pathname.slice('/api/v1/'.length)
      : rawUrl.pathname;
    const request = normalizedPath === rawUrl.pathname
      ? originalRequest
      : new Request(new URL(normalizedPath + rawUrl.search, rawUrl.origin).toString(), originalRequest);
    const url = new URL(request.url);
    const isPrivateStaging = /staging/i.test(env.AUTH_ORIGIN || url.hostname);
    if (isPrivateStaging && url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex, nofollow, noarchive', 'cache-control': 'no-store' },
      });
    }
    const reply = (data: unknown, status = 200, extraHeaders = {}) =>
      Response.json(data, { status, headers: { 'cache-control': 'no-store', ...extraHeaders } });

    try {
      const photo = await productPhotoRoute(request, env);
      if (photo) return photo;
    } catch { return reply({ error: 'Product photos temporarily unavailable' }, 503); }

    if (url.pathname === '/api/health' || url.pathname === '/api/staging-config') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return reply({ error: 'Method not allowed' }, 405, { allow: 'GET, HEAD' });
      }
      let dbConnected = false;
      let authDbConnected = false;
      if (env.DB) {
        try {
          await env.DB.prepare('SELECT 1 AS ok').first();
          dbConnected = true;
        } catch {
          dbConnected = false;
        }
      }
      if (env.AUTH_DB) {
        try {
          await env.AUTH_DB.prepare('SELECT 1 AS ok').first();
          authDbConnected = true;
        } catch {
          authDbConnected = false;
        }
      }
      const paymentsEnabled =
        env.PAYMENTS_ENABLED === 'true' &&
        env.FLW_MODE === 'sandbox' &&
        Boolean(env.FLW_SECRET_KEY?.startsWith('FLWSECK_TEST-'));
      const coinsPurchasesEnabled =
        env.PAYMENTS_ENABLED === 'true' && env.COINS_PURCHASES_ENABLED === 'true';
      const kycUploadsEnabled = areKycUploadsConfigured(env);

      let user: { id: string; email: string; role: string } | null = null;
      if (env.AUTH_DB) {
        try {
          user = await currentAccount(request, env);
        } catch {
          user = null;
        }
      }

      return reply({
        ok: true,
        status: 'ok',
        service: 'cashncarry-d1-staging-worker',
        environment: 'staging',
        dbConnected,
        authDbConnected,
        authenticated: Boolean(user),
        user,
        staging: {
          paymentsEnabled,
          coinsPurchasesEnabled,
          kycUploadsEnabled,
          orderReservationsEnabled: env.ORDER_RESERVATIONS === 'enabled',
          streamConfigured: Boolean(env.STREAM_WHIP_URL && env.STREAM_WHEP_URL),
          r2Configured: Boolean(env.KYC_PRIVATE),
        },
      });
    }

    // Private staging, consent-based newsletter routes.
    try { const newsletter = await newsletterRoute(request, env); if (newsletter) return newsletter; }
    catch { return reply({error:'Newsletter temporarily unavailable'},503); }

    if (env.AUTH_DB && env.ORDER_RESERVATIONS === 'enabled'
        && ['/checkout','/orders','/api/checkout','/api/orders'].includes(url.pathname)) {
      try { await expireUnpaidReservations(env.AUTH_DB); }
      catch { return reply({error:'Order maintenance unavailable'},503); }
    }
    try {
      const synced = await unifiedSyncRoute(originalRequest, env);
      if (synced) return synced;
    } catch { return reply({ error: 'Sync service temporarily unavailable' }, 503); }
    try {
      const support = await supportRoute(request, env);
      if (support) return support;
    } catch { return reply({ error: 'Support inbox temporarily unavailable' }, 503); }
    // Seller applications are separate from protected Seller Centre operations.
    // Normalise /api/v1/seller/application to /api/seller/application above.
    try {
      const application = await sellerApplicationRoute(request, env);
      if (application) return application;
    } catch { return reply({ error: 'Seller applications temporarily unavailable' }, 503); }
    try {
      const checkout = await checkoutPage(request,env);
      if (checkout) return checkout;
    } catch { return reply({error:'Checkout temporarily unavailable'},503); }
    try {
      const payment = await flutterwaveRoute(request,env);
      if (payment) return payment;
    } catch { return reply({error:'Payment service unavailable'},503); }
    try {
      const stream = await streamRoute(request,env);
      if (stream) return stream;
    } catch { return reply({error:'Cloudflare Stream unavailable'},503); }
    try {
      const kyc = await kycRoute(request,env);
      if (kyc) return kyc;
    } catch { return reply({error:'Private verification unavailable'},503); }
    try {
      const order = await ordersRoute(request, env);
      if (order) return order;
    } catch { return reply({ error: 'Order service temporarily unavailable' }, 503); }
    try {
      const admin = await adminRoute(request,env);
      if (admin) return admin;
    } catch { return reply({error:'Moderation temporarily unavailable'},503); }
    try {
      const auction = await auctionsRoute(request, env);
      if (auction) return auction;
    } catch (error) {
      // Isolated CI diagnostics only. Never expose database details in API replies.
      if ((env as Environment & { BENCH_DIAGNOSTICS?: string }).BENCH_DIAGNOSTICS === 'enabled') {
        console.error('Auction benchmark diagnostic:', error instanceof Error
          ? (error.name + ': ' + error.message.replace(/(?:password|secret|token|cookie|credential)/gi, '[redacted]').slice(0, 350))
          : 'UnknownError');
      }
      return reply({ error: 'Auctions temporarily unavailable' }, 503);
    }
    try {
      const coin = await coinsRoute(request, env);
      if (coin) return coin;
    } catch { return reply({ error: 'Coin service temporarily unavailable' }, 503); }
    if (env.AUTH_DB && url.pathname === '/api/auth/owner-setup') {
      try { return await ownerSetupRoute(request, env); }
      catch (error) {
        // Opt-in local benchmark diagnostics; do not log credentials, cookies, tokens or request bodies.
        if (env.BENCH_DIAGNOSTICS === 'enabled') console.error('Owner setup diagnostic:', error instanceof Error ? (error.name + ': ' + error.message.replace(/(?:password|secret|token|cookie|credential)/gi, '[redacted]').slice(0, 350)) : 'UnknownError');
        return reply({ error: 'Owner setup temporarily unavailable' },503);
      }
    }
    if (env.AUTH_DB && url.pathname.startsWith('/api/auth/')) {
      try { return await authRoute(request, env); }
      catch { return reply({ error: 'Authentication temporarily unavailable' }, 503); }
    }
    if (env.AUTH_DB) {
      try {
        const marketplace = await marketplaceRoute(request, env);
        if (marketplace) return marketplace;
      } catch { return reply({ error: 'Marketplace temporarily unavailable' }, 503); }
    }
    if (env.AUTH_DB && !url.pathname.startsWith('/api/')) {
      try {
        const account = await accountPage(request, env);
        if (account) return account;
      } catch { return reply({ error: 'Account temporarily unavailable' }, 503); }
    }
    if (/^\/api\/(?:auth|account|profile|seller|admin)(?:\/|$)/.test(url.pathname)) {
      return reply({ error: 'Account and management services unavailable' }, 503);
    }
    if (env.ASSETS && !url.pathname.startsWith('/api/')) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) {
        const contentType = assetRes.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          const rawHtml = await assetRes.text();
          const seo = await resolveEdgeSEO({ url, db: env.DB });
          const modified = injectEdgeSEOMeta(rawHtml, seo);
          const headers = new Headers(assetRes.headers);
          headers.set('content-type', 'text/html; charset=utf-8');
          headers.set('x-rendered-by', 'cnc-edge-seo');
          if (isPrivateStaging) headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
          return new Response(modified, {
            status: assetRes.status,
            headers,
          });
        }
        return assetRes;
      }
    }
    if (request.method === 'GET') {
      if (url.pathname === '/') return homePage(env.DB);
      if (/^\/(?:profile|account|sign-in|login|register|seller|admin)(?:\/|$)/.test(url.pathname)) return protectedPageUnavailable(url.pathname.replace(/\/$/, ""));
      if (url.pathname === '/shop' || /^\/(products|sellers)\/[^/]+$/.test(url.pathname)) return catalogPage(url, env.DB);
      if (env.ASSETS && /^\/(?:brand\/(?:logo|icon)\.png|manifest\.webmanifest|sitemap\.xml|robots\.txt|feed\/google-shopping\.xml)$/.test(url.pathname)) return env.ASSETS.fetch(request);
    }
    const route = /^\/api\/(categories|products|storefronts)(?:\/([^/]+))?$/.exec(url.pathname);
    if (!route || (route[1] === 'categories' && route[2])) return reply({ error: 'Route unavailable in candidate' }, 404);
    if (request.method !== 'GET') return reply({ error: 'Method not allowed' }, 405, { allow: 'GET' });

    const query = url.searchParams.get('q') ?? '';
    const store = url.searchParams.get('store') ?? '';
    const category = url.searchParams.get('category') ?? '';
    const offset = Number(url.searchParams.get('offset') ?? 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 10000) return reply({ error: 'Invalid offset' }, 400);
    let id: string;
    try { id = decodeURIComponent(route[2] ?? ''); }
    catch { return reply({ error: 'Invalid identifier' }, 400); }
    if ([query, id, store, category].some(value => value.length > 100)) return reply({ error: 'Search term is too long' }, 400);
    if (!env.DB) return reply({ error: 'Catalog unavailable' }, 503);
    try {
      if (route[1] === 'categories') return reply({ categories: await readActiveCategories(env.DB, query) });
      if (route[1] === 'storefronts' && !id) return reply({ storefronts: await readStorefronts(env.DB, offset) });
      if (route[1] === 'storefronts') {
        const storefront = await readStorefront(env.DB, id);
        return storefront ? reply({ storefront }) : reply({ error: 'Storefront not found' }, 404);
      }
      if (!id) return reply({ products: await readProducts(env.DB, query, store, category, offset) });
      const product = await readProduct(env.DB, id);
      return product ? reply({ product }) : reply({ error: 'Product not found' }, 404);
    } catch {
      return reply({ error: 'Catalog unavailable' }, 503);
    }
  },
};
