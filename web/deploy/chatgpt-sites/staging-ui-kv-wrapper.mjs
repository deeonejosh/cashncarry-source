// PRIVATE staging-only static assets bridge.
// Imports the exact immutable v57 Worker backend, preserving all API business logic.
// Cloudflare Access, Admin MFA, D1 and payments settings are not changed.
import backend from './backend-v57.mjs';
import { accountMediaRoute } from './account-media.mjs';

const STAGING_ORIGIN = 'https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev';
const WORKSPACE_TABS = new Map([
  ['/admin', 'admin-dashboard'],
  ['/seller-centre', 'seller-dashboard'],
]);

const UI_FILES = Object.freeze({
  '/': {
    key: 'cnc:v58:ui:index.html',
    type: 'text/html; charset=utf-8',
    cache: 'no-store',
  },
  '/assets/index-DjAQX0oY.js': {
    key: 'cnc:v58:ui:assets:index-DjAQX0oY.js',
    type: 'application/javascript; charset=utf-8',
    cache: 'public, max-age=31536000, immutable',
  },
  '/assets/index-uvdl1fkh.css': {
    key: 'cnc:v58:ui:assets:index-uvdl1fkh.css',
    type: 'text/css; charset=utf-8',
    cache: 'public, max-age=31536000, immutable',
  },
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const permitted = url.origin === STAGING_ORIGIN
      && env.AUTH_ORIGIN === STAGING_ORIGIN;
    if (permitted && (request.method === 'GET' || request.method === 'HEAD')) {
      // Restore old workspace links and tabs left on a failed sign-in redirect.
      const workspaceTab = WORKSPACE_TABS.get(url.pathname.replace(/\/$/, ''));
      if (workspaceTab) {
        return new Response(null, {
          status: 302,
          headers: { location: '/?tab=' + workspaceTab, 'cache-control': 'no-store' },
        });
      }
      const file = UI_FILES[url.pathname];
      if (file) {
        // A missing binding or partial asset upload must never show an
        // HTML entrypoint referencing JS or CSS that is not available.
        if (!env.CNC_STAGING_ASSETS) {
          return Response.json({error:'Staging frontend unavailable',code:'STAGING_UI_STORAGE_MISSING'}, {
            status:503,headers:{'cache-control':'no-store'},
          });
        }
        let content;
        try {
          content = await env.CNC_STAGING_ASSETS.get(file.key, 'text');
        } catch {
          return Response.json({error:'Staging frontend temporarily unavailable',code:'STAGING_UI_READ_FAILED'}, {
            status:503,headers:{'cache-control':'no-store'},
          });
        }
        if (content == null) {
          return Response.json({error:'Staging frontend file unavailable',code:'STAGING_UI_FILE_MISSING'}, {
            status:503,headers:{'cache-control':'no-store'},
          });
        }
        const headers = new Headers({
          'content-type': file.type,
          'cache-control': file.cache,
          'x-content-type-options': 'nosniff',
        });
        if (url.pathname === '/') {
          headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
        }
        return new Response(request.method === 'HEAD' ? null : content, {status:200,headers});
      }
    }
    if (permitted) {
      try {
        const media = await accountMediaRoute(request, env);
        if (media) return media;
      } catch {
        return Response.json({ error: 'Media temporarily unavailable' }, {
          status: 503, headers: { 'cache-control': 'no-store' },
        });
      }
    }
    return backend.fetch(request, env, ctx);
  },
};
