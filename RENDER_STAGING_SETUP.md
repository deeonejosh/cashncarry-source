# Cash N Carry — Node staging hosting (Render)
Only use branch `feature/node-platform-phase1`; **never deploy to cashncarryng.com from here**.

## Current status
This branch has a Render Blueprint (`render.yaml`) but **the full revised Node web/Android source ZIP is not yet committed to this branch**. Deploying from the current branch would fail or use outdated source. Upload the extracted source tree first.

## Safe setup
1. Extract `CashNCarry-Render-Staging-Ready-Source-2026-11-16.zip` locally. Commit its source directories to `feature/node-platform-phase1` (not `main`), preserving `render.yaml`. Exclude `.env`, `*.sqlite`, `node_modules`, build outputs, keys and keystores.
2. Install/connect the Render app in ChatGPT or open [Render](https://dashboard.render.com) and connect this GitHub repo.
3. Import `render.yaml` as a Render Blueprint. Inspect the costs before approval: a **paid Starter** service with 1 GB persistent disk in Frankfurt.
4. Keep manual deployments and one instance. The service builds `web/` and runs `node server/src/server.mjs`, with `/api/health` as its health endpoint.
5. Keep `NODE_ENV=staging`, `CNC_PRIVATE_STAGING=true`, `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `KYC_UPLOADS_ENABLED=false`, `FLW_MODE=disabled`. The SQLite and video storage paths live on the persistent `/var/data` volume.
6. Add `CLOUDFLARE_STREAM_ACCOUNT_ID` and `CLOUDFLARE_STREAM_API_TOKEN` **only to Render Environment**, and only when staging streaming is being tested. Use a separate limited Stream token. To enable registration emails, configure Resend credentials in Render only. Never paste secrets into GitHub or Android source.
7. Manually deploy after CI passes. Inspect `https://YOUR-RENDER-HOST/api/health`; require database-connected, staging mode and disabled payment flags.
8. Run `node scripts/smoke-staging-node-api.mjs https://YOUR-RENDER-HOST`. Then set GitHub Actions variable `CNC_STAGING_NODE_API_URL` to the new HTTPS origin and run `verify-node-platform.yml` on the staging branch to build web and APK artifacts.
9. Test web login, Android login, seller permissions, product feeds, and actual Cloudflare Stream playback with test accounts. Native Android Go Live remains unimplemented.

## Warnings
- The generated Render URL is **internet-reachable** by default. Noindex is not access protection. Never use real production user data for testing until a private access gate is configured.
- SQLite + local video storage on a single disk is a **staging** solution, not a production scale-out architecture. Make tested backups.
- Render and Cloudflare Stream may incur charges. Do not approve service creation without reviewing the pricing.
- Do not modify the live domain, production DNS, production database, current Stream inputs, or live payment provider configuration.

Full step-by-step guidance is also in `RENDER_STAGING_SETUP.md` in the updated source ZIP.
