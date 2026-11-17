# Cash N Carry — existing Cloudflare private staging (customer UI rebuild)

This guide is for the **new website source only**, staging Worker
`cashncarry-d1-staging-worker` and existing D1 `cashncarry-d1-staging`.
The same D1 serves the separate Android staging API.

## Safety boundaries

- Keep Cloudflare Access **Cash N Carry Private Staging** enabled.
- Preserve `AUTH_RESEND_API_KEY` as a Worker secret; never put it in GitHub, logs, frontend or ZIP.
- Do not change DNS, route `cashncarryng.com`, or deploy to any production Worker.
- Never delete/reseed the existing D1 database: its schema has migrations 0001–0017 and demo data was explicitly cleared.
- Payments, coin purchases and KYC uploads must remain disabled.
- No automatic deploy is configured; approval and a green build are required for staging deploy.

## Existing resources

- Worker: `cashncarry-d1-staging-worker`
- D1: `cashncarry-d1-staging`
- Bindings: `AUTH_DB` and `DB` both point to D1 UUID `9a2cdbee-e030-4b10-908b-b10b8142d2aa`
- Browser (Access protected): `https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev`
- Android API (separate Worker): `https://cashncarry-mobile-staging-api.cashncarry-workforce-2026.workers.dev`
- `web/wrangler.jsonc` has **top-level** fields, NOT `[env.staging]`.

## Build / QA checks

From the `web/` directory of this source:

```bash
npm ci --legacy-peer-deps --no-audit --no-fund
npm run audit:customer-ui
npm run lint
npm test
npm run build  # includes built-dist audit; aborts if any QA/ZIP/export UI remains
npm run bundle:worker  # offline backend smoke only; never deploy this file as a static asset
node deploy/chatgpt-sites/worker-smoke.mjs
node deploy/chatgpt-sites/new-auth-smoke.mjs
npx playwright-core install --with-deps chromium
node scripts/verify-staging-browser.mjs  # 26 routes x desktop/mobile, local Miniflare
rm -f dist/_worker.js
python3 scripts/audit_customer_ui.py --dist
```

The GitHub Actions workflow `.github/workflows/verify-existing-private-staging.yml`
performs the website checks, creates an Android debug APK, and uploads build artifacts.
It is **manual and build-only** — it does not deploy automatically.

## Stage after successful tests

Run these commands **only** with the verified, extracted new source and staging credentials:

```bash
cd web
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
npx wrangler deploy  # no --env staging: top-level wrangler.jsonc is already staging
```

Check the currently active Worker name and D1 binding before deploying. Keep the
existing Access application and authorized email policy unchanged. The original
website or custom domain must not be modified.

## Database precautions

Do **not** execute `catalog-init.sql` or `staging-init-complete.sql` against the
existing D1 instance as a deployment step. Both files now contain schema and
category definitions only; running them is unnecessary. Add migrations only
when new schema changes require them, test locally, and review the remote diff.

A fresh test database is expected to contain **zero shops and zero products**.
The existing staging D1 was verified as empty of all accounts and marketplace data.

## Real browser testing and access

Cloudflare Access can block anonymous curl or browser automation with a login
screen. Test with an authorised staging identity; do not bypass Access. Execute
registration + Resend verification, sign in/logout, seller approval, product
moderation, cart, orders, messages, and Android API independently. Never test
charges while the relevant feature flags are disabled.

Note: a live *room* is not necessarily a video broadcast. The UI must explain
that camera preview does not transmit unless media publishing is configured.
