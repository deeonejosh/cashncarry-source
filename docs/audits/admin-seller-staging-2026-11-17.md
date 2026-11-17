# Cash N Carry — Admin Console & Seller Centre staging verification (17 Nov 2026)

Scope: **existing private Cloudflare staging only**. Never use production domain, production DNS, production databases, real payments or production Flutterwave keys for these checks.

## Source & CI

- Repo: `deeonejosh/cashncarry-source`
- Isolated branch: `fix/staging-admin-seller-benchmark-20261117`
- Verified CI run 44145253090 at commit `bfa5f2564b4ad5e1fc60b2871a07d101e6e1061e`: **20 isolated Miniflare/D1 tests passed**, TypeScript check and Vite production build passed.
- The suite verifies browser/native auth boundaries, owner MFA, seller application submission/approval, catalog publishing/suspension and no seeded fake store/products in a clean D1.
- Further integration assertions for Admin reinstatement, public catalog visibility and Seller unpublishing with revision conflicts were committed at `b9eaf4911a225b33da0d32830ac8bbfb99765614`. **Verified:** the complete suite passed on the follow-up commit in [CI run 44159155398](https://github.com/deeonejosh/cashncarry-source/actions/runs/44159155398): 20 passed, 0 failed, plus TypeScript and Vite build.

## Cloudflare deployment evidence

- Existing private Worker: `cashncarry-d1-staging-worker`.
- Exact staging URL: https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/
- Active deployment ID: `217e0eab-a7f9-49d9-9a9d-ee0aac3e555d`; version `b3f642f1-a10c-449c-b9ec-b5607ca25d9c` (number 52, created 18:30:18 UTC 17 Nov).
- The active Worker script includes code markers for Seller application review, Seller approval guard, product metadata fields, update conflict handling, MFA and Resend. This does **not** prove authenticated deployed workflows are functional.
- Active HTML loads `/assets/index-VSkg-hX1.js` and `/assets/index-DSoMFQ2J.css` from the existing staging asset KV.
- The active JS bundle did **not** contain the latest Seller Centre source error message `Product changed. Reload listings and try again.`. Treat source/frontend synchronization as an **outstanding deployment gap**, rather than claiming the 18:12 frontend patch was deployed.
- Active JS bundle was also checked for the old `QA Suite`, `V17 Staging ZIP`, and `Chidi Okafor` text: not found. This is a string check only, not authenticated visual verification.
- `ADMIN_ACCOUNT_ID`, `ADMIN_TOTP_SECRET_HEX`, `AUTH_RESEND_API_KEY` are present as secret bindings; the secret values were not accessed.
- `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `KYC_UPLOADS_ENABLED=false`, `FLW_MODE=disabled`.

## Read-only D1 schema and empty-state verification

The existing staging D1 contains the `cnc_seller_applications`, `cnc_seller_application_events`, `cnc_seller_products` and `cnc_seller_stores` tables. The `cnc_seller_application_changes`, `cnc_public_seller_auth_status` and `cnc_public_seller_product_updated` triggers exist. Required Seller product metadata columns exist. Aggregate counts for seller applications, storefronts, seller products, public catalog products, orders and short videos were **all zero**, with no writes performed. The `d1_migrations` tracking table lists through 0017; schema corresponding to 0019/0020 is present, so reconcile migration history before future schema changes.

## Acceptance gap and release gate

Current CI is an **isolated backend contract suite**, not a full manual/button-by-button Admin/Seller browser audit. Cloudflare Access still requires an authorised owner test session for a true deployed E2E. No deployed E2E proof of create/update/delete products, Seller orders, Admin moderation, notification delivery, Android sign-in, livestreaming, third-party suppliers or email inbox receipt is available.

Before deploying the remaining UI: obtain authenticated Access session, reconcile the current Worker/backend and GitHub branch, preserve existing assets/secrets/MFA/Resend/Access policies and D1 data, confirm D1 migration compatibility and backup, prepare the built frontend from the tested commit, use staged asset revision+rollback plan, and run protected staging browser/API smoke tests. Never replace this hand-patched Worker blindly with an older ZIP.

**Verification action here:** read-only Cloudflare checks + GitHub benchmark branch test-only commit; **no Cloudflare mutation, no D1 writes, no production changes**.

## Seller UI follow-up — verified on 17 November

- Source commit `15f802b8b230aee49f8e7e3140ec7c92837f4455` fixes a verified UI weakness in `web/src/components/pages/seller/SellerProductsPage.tsx`: failed submit/unpublish/archive actions previously returned without visible error feedback. The component now shows backend errors, prevents repeated concurrent product actions, and removes a reminder checkbox that never scheduled a reminder (as well as a duplicated success notification).
- [GitHub Actions run 44168492058](https://github.com/deeonejosh/cashncarry-source/actions/runs/44168492058) **PASSED**: dependency installation, TypeScript, database-backed integration/security regressions, and Vite frontend build.
- New build artefact JS: `/assets/index-CFB2SPus.js`, SHA-256 `f61532c37e9e089a9b81ae153bb0cedccecb3bb93e0118a7931c23679b0fb4fe`. CSS: `/assets/index-DFKFiQbB.css`, SHA-256 `d2a09b304cbeadca26fee3b6f3618fd027d3784a587003eb19a164f88f8e3653`.
- Read-only staging D1 checks reconfirmed **zero** seller applications, seller storefronts, seller products, public products, orders and short videos.
- A separate local Playwright attempt could not execute because Chromium refused the loopback HTTP server with `ERR_BLOCKED_BY_ADMINISTRATOR`. **No local browser pass should be claimed for this exact build.** GitHub CI did not run authenticated hosted-staging E2E either.
- **Release remains blocked:** Active staging Cloudflare Worker deployment was independently reconfirmed as version `b3f642f1-a10c-449c-b9ec-b5607ca25d9c`, not the frontend candidate. A staged, rollback-ready KV asset and Worker manifest update plus authorised Access browser checks are required before claiming deployment. Keep private Access and all real transaction safeguards in place.
