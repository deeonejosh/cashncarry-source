# Private Cloudflare staging — verified resources and next gate

## Live resources inspected on 16 November 2026

- **Website**: https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev — Cloudflare Worker `cashncarry-d1-staging-worker`; Cloudflare Access protects this hostname through the `Cash N Carry Private Staging` self-hosted application and an owner allow policy.
- **Android staging API**: https://cashncarry-mobile-staging-api.cashncarry-workforce-2026.workers.dev — Worker `cashncarry-mobile-staging-api`; it is intentionally not under the web Access application because a native app cannot handle an HTML Access login redirect as an API response. It relies on API authentication.
- **Shared D1**: `cashncarry-d1-staging`, UUID `9a2cdbee-e030-4b10-908b-b10b8142d2aa`. 41 tables are present, `d1_migrations` reports 0001–0017 applied, and existing records are present. **No schema writes or account/data resets** were carried out.
- **Web email delivery blocker**: Website Worker lacks `AUTH_RESEND_API_KEY` and `AUTH_EMAIL` service binding, so registration and resets that require email may return 503. Mobile Worker has `AUTH_RESEND_API_KEY` secret already; do **not** copy or print its value. Resend sending domain is verified.
- Payments / coin purchases / KYC uploads are disabled. `ORDER_RESERVATIONS` is enabled as it is on the existing Worker.

## Local source repairs

1. Re-pointed `web/wrangler.jsonc` to the **existing** website Worker and D1 (no routes or custom domains).
2. Re-pointed Android debug builds to the separate mobile staging API; release remains configured for the canonical domain after a separate cutover.
3. Fixed Orders navigation badge (order count, not cart count).
4. Explained explicitly that creating a shopping room does not broadcast the camera feed.
5. Prevented private build SEO generators from outputting an indexable sitemap or product feed; added `robots.txt` deny-all as a defence-in-depth measure.
6. Updated manual GitHub build-only verification workflow and staging contract test. No deployment step.

## Required before deployment

- Commit **extracted source files** (not just a ZIP) to a separate staging Git branch. Run the build-only workflow after verifying `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run bundle:worker`, and Android Gradle test/build.
- **Important:** Local source has migrations 0001–0010 and 0017, but the deployed D1 has also applied 0011–0016. Recover the missing historical SQL migrations before trusting a fresh DB recreation or changing schema. Do **not** run `wrangler d1 migrations apply` against this populated DB blindly.
- To enable website verification email, create a **Resend sending-only domain-scoped** API key and add it privately to the website Worker secret named `AUTH_RESEND_API_KEY`. Never commit the key. Test registration with a disposable account. A secret on the *mobile* Worker does not automatically apply to the website Worker.
- Confirm Cloudflare Access owner login and web/API smoke tests in a browser. Use the Android API for native registration and login tests.
- Verify password hashing fits the Workers Free CPU limit; `new-auth.ts` currently performs expensive `scryptAsync` calls and has not been stress/performance validated on Cloudflare Free.
- **No automatic deploy to the existing Worker:** it is an in-use staging resource with existing data and has not been compared byte-for-byte against this user-supplied source. Preserve bindings and Access policies during a reviewed deployment.

## Safety

No migration, new Worker, new billing, production deployment, domain/DNS edit, payment activation, or cloud video charges are requested by this repair package.
