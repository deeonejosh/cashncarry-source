# STAGING-WORKFLOW-AUDIT — Cash N Carry Nigeria

**Date:** 17 November 2026 UTC  
**Scope:** Private Cloudflare staging ONLY. Production, production DNS, production databases and live payments unchanged.  
**Branch:** fix/staging-workflow-audit (based on feature/openai-chat-staging)  
**Staging URL:** https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/  
**Audited baseline:** The 16 November 2026 extracted source from CashNCarry-Actual-Staging-Fix-Deployed-2026-11-16.zip, with the newer approved 17 November footer patch. The prior void(1).zip was used for cross-checking Android source.

## Executive status

**SOURCE REPAIR COMMITTED; FULL BUILD / NEW DEPLOYMENT NOT PERFORMED.** The newest reviewed extracted web/ and app/ source tree and assets have now been committed to the isolated branch in commit 3a7b4bc2414b694f32085c1482edec273f3f6ae7. The fixes have been applied and regression-tested against the extracted local copy. The previously deployed Cloudflare Worker remains in place. A new build must pass lint, tests and authenticated browser checks before replacing it. Never claim that a local patch is already deployed.

## Architecture

- Web: React 19, Vite 8, TypeScript and Tailwind 4. Source: web/src.
- Backend: Cloudflare Workers, D1 and the current staging KV-backed static frontend. Source: web/deploy/chatgpt-sites.
- Authentication: Resend email verification, scrypt password credentials, HttpOnly sessions, mobile Bearer support, server-side seller and admin role checks.
- Android: Kotlin/Jetpack Compose, Retrofit/OkHttp, a separate staging API Worker URL and Android camera/stream screens.
- Payments: Flutterwave sandbox-only source, HMAC verification, authoritative D1 order records; **PAYMENTS_ENABLED=false** on deployed staging.
- Media: WHIP/WHEP routes, but real provider configuration/broadcasting has not been verified.
- Supplier adapters: No verified Banggood or Nigerian supplier API connector or credentials found.

## Discovered web UI routes — 26

home, shop, for-you, product-detail, checkout, checkout-complete, orders, profile, live, auctions, coins, flash-deals, wishlist, shipments, messages, notifications, returns, seller-dashboard, seller-products, seller-orders, seller-kyc, seller-settlements, admin-dashboard, email-marketing, storefront, policies.

## Discovered Android navigation routes — 14

home, discover, live, reels, orders/{tab}, product/{productId}, live_player/{streamId}, broadcast_studio, storefront/{sellerId}, seller_centre, seller_onboarding, admin_console, profile, auth.

## Backend API route families discovered

- Auth: /api/auth/register, verify, login, me, logout, request-reset, reset, admin-login.
- Health: /api/health and /api/staging-config.
- Catalog: /api/categories, /api/products, /api/storefronts and detail routes.
- Buyer/seller: /api/cart, /api/seller/store, /api/seller/products, /api/checkout, /api/orders, /api/orders/cancel, /api/sellers/kyc.
- Payment: /api/payments/initialize, /api/payments/status, /api/payments/webhooks/flutterwave.
- Social: /api/auctions, /api/coins, /api/live/cloudflare/publish, /api/live/cloudflare/play, /api/v1/* synchronisation.
- Admin: /api/admin/moderation and related server-managed admin endpoints.

This is a code-derived inventory, not a claim that all routes have passed live browser requests.

## Verified defects and local source repairs

1. **Mobile/desktop breakpoint mismatch:** In web/src/components/ui/Navbar.tsx, desktop controls began at sm/md while MobileNav.tsx hid the five-button bar at md. Standardised nav/search/menu to lg; hid redundant Shop and For You links in the mobile drawer.
2. **Footer drift:** Integrated latest owner-approved footer into web/src/components/ui/Footer.tsx; explicit mobile/desktop display classes, removed visible Accessibility/Sitemap controls and an unimplemented newsletter form, and hid the Seller Centre link unless the viewer is an approved seller. Backend remains authoritative.
3. **Policy links opening the wrong section:** web/src/App.tsx now tracks a typed policy section and passes it to PolicyPage; footer uses an explicit callback rather than a mutable global. Terms, Privacy, Returns, Escrow and Seller Code have individual destinations.
4. **Unquoted shipping falsely shown as free:** web/src/components/pages/CheckoutPage.tsx no longer presents unverified shipping as a zero-cost final total. It discloses that shipping/total need an authoritative quote. This UI repair does NOT provide a shipping service or enable paid checkout.
5. **Unsupported legal compliance claim:** web/src/components/pages/PolicyPage.tsx now identifies the policy as awaiting legal review rather than declaring regulatory compliance certified.
6. **Brittle tests:** scripts/test_customer_surface_and_workflows.py no longer relies on an obsolete exact button count; new scripts/test_workflow_release_regressions.py adds eight source regression checks.

**Location of repaired full-source files:** a companion cleaned ZIP artifact prepared in this audit. These source files are now committed to the isolated GitHub branch; the staged website has not been rebuilt from this commit.

## Workflow validation matrix

| Workflow | Source inspected | Live status |
|---|---|---|
| Buyer register/verify/login/password reset | Auth implementation present; scrypt, sessions and Resend binding | BLOCKED: test account, Access auth and email receipt unverified |
| Product discovery/details/cart | UI/API routes present, catalog intentionally empty | BLOCKED: no approved test catalog |
| Checkout/payment/orders/tracking | Server order reservations and Flutterwave guards | BLOCKED: payments disabled and shipping quote missing |
| Returns/refunds/disputes | Returns UI and server route families | PARTIAL: full fulfilment/dispute scenario not verified |
| Seller verification/store/products/orders | Role/ownership checks and product revisions | PARTIAL: KYC upload disabled and no seller store |
| Admin console/MFA/moderation | Admin-only session and MFA code exists | BLOCKED: deployed staging has no ADMIN_ACCOUNT_ID or ADMIN_TOTP_SECRET_HEX bindings |
| Suppliers/import/sync/fulfilment | No working adapter found | NOT IMPLEMENTED; credentials, provider docs and authorisation required |
| Livestream/auctions/gifts | UI and server route modules exist | BLOCKED: media service and coin payment test flows unavailable |
| Android auth/device integration | Kotlin project and separate mobile staging API confirmed | BLOCKED: Android Gradle build/device test not completed |

## Test evidence — 17 November 2026

- PASS: 49 existing offline Python tests (10 + 15 + 6 + 9 + 9).
- PASS: 8 additional offline workflow-release regression tests.
- PASS: source UI audit finds 26 tabs, 26 navigation targets, 298 JSX buttons, 25 forms, **zero inert buttons detected**. This is a static check, not a click-through of every button.
- PASS: node --check on the browser-smoke script.
- BLOCKED: npm ci --offline returned ENOTCACHED (missing esbuild), so TypeScript lint, production Vite build, Miniflare backend suite and full browser tests did not run.
- BLOCKED: Android Gradle wrapper executable/JAR and SDK/build environment missing; no APK/emulator test.
- BLOCKED: Cloudflare Access sign-in browser capture, Resend delivery receipt, real camera/media, third-party supplier integrations, and sandbox payments were not verified.

## Actual private staging inventory / preservation

- Worker: cashncarry-d1-staging-worker (latest inspected version 4771ec1f-247d-42ab-8811-6acbf2949ddb, deployed 17 Nov 2026 04:17 UTC).
- Staging D1: 9a2cdbee-e030-4b10-908b-b10b8142d2aa. Auth and marketplace bindings point there.
- Android API Worker: cashncarry-mobile-staging-api; uses same staging D1 but different authenticated origin.
- Resend secret binding: present; its value was neither exposed nor copied.
- Flags: PAYMENTS_ENABLED=false; COINS_PURCHASES_ENABLED=false; KYC_UPLOADS_ENABLED=false; FLW_MODE=disabled.
- Read-only D1 counts: **1 verified seller user and 1 session**, 0 seller stores/products/orders/videos/livestreams/auctions/messages. No deletion, reset, migrations or data mutation. Preserve this account.
- No admin owner ID or TOTP binding confirmed; do not bypass owner-only MFA.

## Supplier and international shipping readiness

No supplier has granted verified API access. Import deduplication, admin approval, stock sync, price margin, supplier order mapping and return integration must be implemented and tested before use. International products must show verified origin, delivery estimate, shipping/customs charges, international return costs and applicable statutory rights before paid checkout. Do not automatically pay suppliers or implement blanket no-refund rules. Legal wording needs owner/counsel approval.

## Deployment and remaining blockers

1. DONE: The extracted web/, app/, gradle/ and scripts/ source plus reviewed fixes are committed to fix/staging-workflow-audit at 3a7b4bc2414b694f32085c1482edec273f3f6ae7.
2. Run CI with functioning npm/Gradle dependencies: lint, test, build, Miniflare D1 migration/API smoke, Android tests, responsive/browser tests, security/role tests.
3. Back up staging before any database migration; do not modify the existing verified seller or session.
4. Obtain an authenticated Cloudflare Access browser session and secure owner admin/MFA configuration; use disposable test users.
5. Preserve the already-approved staging UI/footer; never overwrite it with an older ZIP bundle.
6. Deploy only after gates pass, then verify route loads, workflow clicks, identity/role boundaries, runtime logs and the exact commit/version.

**Deployment status for this NEW audited source: NOT DEPLOYED (blocked by build and end-to-end verification).** The existing private staging deployment remains unchanged. **Production was untouched.**
