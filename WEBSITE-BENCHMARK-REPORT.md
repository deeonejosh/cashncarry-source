# Cash N Carry Nigeria — Website AI Benchmark Report

**Date:** 17 November 2026
**Status:** **TARGETED VERIFIED FIXES DEPLOYED TO PRIVATE STAGING**; full source replacement and authenticated end-to-end acceptance remain outstanding.
**Repository:** https://github.com/deeonejosh/cashncarry-source
**Benchmark branch:** `fix/staging-ai-benchmark-20261117`
**Latest tested source commit:** `0d28b46c8310cc80c8fe5878fd45fa237483e43a`
**Staging URL:** https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/
**Current staging Worker version:** `aabc32b0-fa02-4b4c-951d-7cfa000fe364` (deployed 17 November; previous `f5675b32-e4c2-4c49-ba5a-a3398761e626`)
**Production changed:** NO.

## Executive summary

- Before fixes: **25/52** desktop/mobile local presentation views passed.
- After fixes: **52/52** desktop/mobile local presentation views passed, 0 failed, 0 blocked.
- D1 + Miniflare regression suite: **18/18 passed**, after repairing the Admin moderation clean-schema query.
- TypeScript, Vite build, Playwright, Axe and Lighthouse CI jobs completed.
- Cloudflare Access returned its private sign-in page during real staging browser attempts; authenticated production-like E2E was **not performed**.
- Android Gradle root configuration is missing/empty and remains an independent build blocker.
- Real payments, coin purchases and KYC uploads remain disabled in staging.

These are local UI/API tests, **not verification that all buyer, seller, admin, supplier or payment buttons work against deployed staging**.

## 1. Full route inventory and individual local checks

The 26 route names below are the existing React `switch(currentTab)` states, not an assertion that all routes were loaded after authenticated Cloudflare Access. The local score is based solely on HTTP 200, nonempty content, no horizontal overflow/uncaught page JS errors, and zero automated Axe WCAG A/AA findings, split across desktop and mobile. **A 100-point local presentation smoke score does not mean the full user workflow was tested.**

| Page state (`?tab=`) | Local desktop + mobile | Local presentation smoke score | Authenticated staging E2E |
|---|---|---:|---|
| `home` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `for-you` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `shop` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `product-detail` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `checkout` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `checkout-complete` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `orders` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `profile` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `live` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `auctions` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `coins` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `flash-deals` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `wishlist` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `shipments` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `messages` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `notifications` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `returns` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `seller-dashboard` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `seller-products` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `seller-orders` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `seller-kyc` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `seller-settlements` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `admin-dashboard` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `email-marketing` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `storefront` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |
| `policies` | 2/2 PASS | 100/100 | BLOCKED / NOT TESTED |

All 52 Playwright screenshots, individual target selectors and detailed scan data are included in `CashNCarry-Final-Website-Benchmark-Evidence.zip`.

## 2. Backend and security evidence

- Staging D1 database has **43** non-internal tables. At inspection there was **one admin account**, **zero seller products**, **zero orders**, **zero short videos**, **zero newsletter subscribers**.
- `DB` and `AUTH_DB` both point to staging D1 `9a2cdbee-e030-4b10-908b-b10b8142d2aa`; no production database touched.
- `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `KYC_UPLOADS_ENABLED=false`, `FLW_MODE=disabled`.
- Local routes and endpoint families inspected include authentication and MFA, `/api/health`, `/api/v1/*`, catalog, `/api/seller/*`, `/api/admin/*`, `/api/checkout`, `/api/orders`, `/api/payments/*`, `/api/auctions`, `/api/coins`, streaming, newsletter and KYC.
- The 18 tests cover real isolated D1 migrations and Miniflare HTTP requests, but do not imply the real checkout, supplier purchase or Cloudflare Stream video API works.

## 3. Verified defects and source repairs

| Priority | Defect | Source repair | Evidence |
|---|---|---|---|
| P0 | Admin moderation query selected missing `p.category` in clean D1 schema, returning 503 in owner flow | `web/deploy/chatgpt-sites/admin.ts`: conditional category projection without discarding existing staging column | 17/18 before; **18/18 after** |
| P2 | Desktop orange create/seller CTA label contrast was below WCAG AA | `web/src/components/ui/Navbar.tsx`: darker orange and active Deals tab | Axe before/after |
| P2 | Home Shop/Start Selling CTA and six category tiles had insufficient contrast | `web/src/components/pages/HomePage.tsx`, `web/src/lib/data.ts`: accessible colours | Axe before/after |
| P2 | Tracking CTA and tracking badge contrast failed on mobile and desktop | `web/src/components/pages/ShipmentsPage.tsx` | Axe before/after |
| P2 | Flash Deals hover label contrast below WCAG AA | `web/src/components/pages/FlashDealsPage.tsx` | Axe before/after |
| P2 | Baseline screenshot CI never executed after failing tests; no Axe/Lighthouse artifacts existed | `.github/workflows/benchmark-private-staging.yml`, `web/scripts/website-benchmark.mjs`, `web/lighthouserc.json` | GitHub Actions screenshot/Lighthouse artifact |

Benchmark diagnostic instrumentation is also present in `web/deploy/chatgpt-sites/worker.ts` and `web/scripts/run-automated-tests.ts`; review/remove that before release.

## 4. Before and after

| Check | Baseline | After fixes |
|---|---:|---:|
| Playwright+Axe local views passing | 25/52 | 52/52 |
| Local JS page errors | 0 | 0 |
| Horizontal overflow in tested viewports | 0 | 0 |
| Remaining Axe colour-contrast failures | 27 views | 0 views |

Actual screenshot comparisons (not synthetic renders):
- `CashNCarry-BeforeAfter-desktop-home.png` and `CashNCarry-BeforeAfter-mobile-home.png`
- `CashNCarry-BeforeAfter-desktop-shop.png` and `CashNCarry-BeforeAfter-mobile-shop.png`
- `CashNCarry-BeforeAfter-desktop-shipments.png` and `CashNCarry-BeforeAfter-mobile-shipments.png`

## 5. Lighthouse CI lab metrics

Lighthouse ran on **local Vite preview**, not behind Cloudflare Access. Scores do not directly measure the live private staging deployment.

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---|---|---|---|
| Homepage | 99 | 100 | 96 | 66 | 0.8 s | 0.8 s | 100 ms | 0 |
| Shop | 100 | 98 | 96 | 66 | 0.8 s | 0.8 s | 10 ms | 0.045 |

SEO **66** is observed in private-staging lab checks, where `robots.txt` deliberately disallows crawling; do not remove privacy protections to increase this score. Lab scores fluctuated between runs, so they are not evidence of a causal performance gain from colour-only CSS changes.

## 6. Weighted rubric — evidence coverage, not site-quality percentage

The user-requested seven weights are retained. Because most real authenticated E2E journeys cannot be executed through Cloudflare Access, the following is a **conservative assurance/evidence coverage** score, not a certified overall website-quality score. Unexecuted checks receive **0** points. Points are capped where evidence is only local, not deployed.

| Category | Maximum | Points evidenced | Audited evidence / zero-point gap |
|---|---:|---:|---|
| UI/UX design | 20 | 10 | All 26 local page states render without JS errors or horizontal overflow; action-click audit and manual design quality review untested. |
| Workflow functionality | 20 | 4 | Isolated registration/auth+owner and live/video subsets; complete buyer/seller/admin/checkout flows blocked by private Access and no test products. |
| Mobile responsiveness | 15 | 10 | 26 Android-sized Playwright viewport renders with no horizontal overflow and no Axe findings; native APK and keyboard interactions untested. |
| Backend/API reliability | 15 | 10 | 18 isolated Miniflare+D1 tests passed, including schema changes and moderation; authenticated staging APIs not end-to-end tested. |
| Security | 10 | 7 | MFA/role/cross-origin/fail-closed checks passed and staging isolated; external penetration and full live-session review untested. |
| Performance | 10 | 5 | Two local Lighthouse URLs measured, no authenticated staging Lighthouse run or full-route profiling. |
| Accessibility | 10 | 5 | 52 WCAG A/AA Axe scans passed; keyboard/screen-reader/manual checks not performed. |
| **Total** | **100** | **51** | **Partial audit coverage; not a product-quality grade.** |

The local automated presentation gate independently passed **52/52**. E2E workflow scores are not certified until an authorised staging account/session and meaningful seeded isolated test data allow real journeys.

## 7. Explicit test status matrix

| Scope | Status | Explanation |
|---|---|---|
| Source inspection and 26 state inventory | PASSED | Existing code inspected |
| TypeScript | PASSED | latest CI |
| Production-style frontend build | PASSED | latest CI |
| Isolated D1/MFA/Admin regressions | PASSED | 18/18 |
| Local page loads, responsive overflow, JS errors, Axe | PASSED | 52/52 |
| Local Lighthouse Home and Shop | PASSED | metrics above |
| Owner sign-in and Admin moderation in isolated Miniflare | PASSED | real D1 migrations; no staging login used |
| Protected staging website login via Cloudflare Access | BLOCKED | Browser receives Access sign-in page |
| Complete Buyer / Seller / Admin actions in deployed staging | NOT TESTED | No authorised test session |
| Real sandbox payment checkout and order fulfilment | BLOCKED | Payment disabled; no products/orders |
| Real video streaming, gift and auction purchases | BLOCKED | Missing real room/order fixtures and disabled coin purchases |
| Banggood/Nigerian supplier live API import | NOT TESTED | No authorised API credentials or supplier approvals verified |
| Native Android APK build and emulator | FAILED | Missing root Gradle configuration |
| Targeted benchmark fixes to existing private staging Worker | DEPLOYED | Accessible colour fixes, category tiles and compatible Admin moderation query; verified active asset hashes |\n| Full rebuild/replacement from latest benchmark commit | NOT PERFORMED | Existing worker includes independent staging authentication, newsletter and asset integrations |

## 8. Deployment decision and next verifiable gates

**Targeted patch status: DEPLOYED TO PRIVATE STAGING.** Cloudflare Worker `aabc32b0-fa02-4b4c-951d-7cfa000fe364` now serves tested contrast improvements in the original React bundle and CSS plus the Admin moderation clean-schema compatibility fix. Uploaded JS KV SHA-256 prefix `376ecd2aea550f45c593499521b38b72` (601599 bytes); CSS `6df890964d57267da3b3fb20f4e92d0d` (79096 bytes). Both assets were read back and independently checksum-verified. Cloudflare readback confirms the Worker is active, retains both staging D1 bindings `9a2cdbee-e030-4b10-908b-b10b8142d2aa`, Admin MFA and newsletter routes, and keeps payments, coin purchases and KYC uploads disabled. The previous Worker version and KV assets remain available for rollback. **The entire GitHub branch was not deployed as a wholesale replacement**, because doing so could remove staging-specific integrations.

The next release requires authenticated staging test access (without disabling Access), reconciliation of the existing hand-patched staging Worker/assets with repository source, removal of benchmark-only diagnostics, isolation/backup confirmation, and a repeat of post-deployment smoke checks. No production DNS, Cloudflare production Worker, production D1 records or live payment keys were modified.

## 9. Evidence and source links

- [Benchmark branch](https://github.com/deeonejosh/cashncarry-source/tree/fix/staging-ai-benchmark-20261117)
- [Latest validated benchmark run](https://github.com/deeonejosh/cashncarry-source/actions/runs/44136866015)
- [Baseline owner/Admin regression, 17/18](https://github.com/deeonejosh/cashncarry-source/actions/runs/44112516309)
- [Successful owner/Admin regression, 18/18](https://github.com/deeonejosh/cashncarry-source/actions/runs/44123264147)
- Final raw zipped Playwright screenshots, Axe violation evidence and Lighthouse HTML/JSON are attached to this answer.

## 10. Post-deployment verification (17 November 2026)

- **PASSED:** Updated staging Worker version verified through Cloudflare deployment API.
- **PASSED:** Active asset manifest references the patched JavaScript and CSS KV hashes; both assets are checksum-verified after upload.
- **PASSED:** Staging D1 query for Admin moderation is syntactically valid; schema-compatibility fallback preserves the existing `category` field when present.
- **PASSED:** MFA, newsletter and management-shell code retained; isolated staging D1 and disabled real-transaction flags reconfirmed.
- **BLOCKED:** Authenticated browser smoke tests on the deployed Worker, owing to the private Cloudflare Access gate and absent authorized test session.
- **NOT TESTED:** Native APK and real transaction/livestream/dropshipping workflows on deployed staging.
- **PRODUCTION:** Untouched. No DNS, payments, production Workers or production databases modified.
