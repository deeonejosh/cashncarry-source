# CASH N CARRY NIGERIA — WEBSITE BENCHMARK REPORT

**Date:** 17 November 2026  
**Status:** PRELIMINARY / RELEASE NOT APPROVED  
**Repository:** https://github.com/deeonejosh/cashncarry-source  
**Benchmark branch:** `fix/staging-ai-benchmark-20261117`  
**Source basis:** `fix/staging-workflow-audit` at `d571c5e80d80fd3b547c5e820d9469b09d2db16b`  
**Private staging:** https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/  
**Verified existing staging Worker:** `f5675b32-e4c2-4c49-ba5a-a3398761e626`  
**Staging deployment from this benchmark:** **NOT PERFORMED** — full browser/release verification is incomplete; current staging remains unchanged.

## Executive summary

This is an evidence-based interim report, not a claim that the entire marketplace is tested. The actual repository was inspected and a separate automated benchmark branch created. Its GitHub Actions setup runs source checks, Playwright desktop and mobile screenshots, Axe accessibility scans, and Lighthouse CI, storing report artifacts. The baseline source-branch CI failed 1 of 18 backend/security tests. This was traced to Admin moderation selecting a `category` column missing from the clean migration schema. After a compatibility fix, the isolated rerun **passed all 18 tests**. An Android build configuration check still fails.

Cloudflare Browser Rendering was directed at the real private staging URL but returned **Cloudflare Access sign-in**, not the marketplace. This correctly protects the private staging site; it also blocks uncredentialed end-to-end verification of Buyer, Seller and Admin actions. No unauthorised login bypass has been attempted.

## 1. Discovered React application routes

Read directly from the `switch (currentTab)` entries in `web/src/App.tsx`. These are **26 existing frontend page states**, not 26 independently verified live pages.

| Route/tab | Domain | Live authenticated test | Per-page benchmark score |
|---|---|---|---|
| home | Buyer | BLOCKED by Access | NOT SCORED |
| for-you | Video/social | BLOCKED by Access | NOT SCORED |
| shop | Buyer | BLOCKED by Access | NOT SCORED |
| product-detail | Buyer | BLOCKED by Access | NOT SCORED |
| checkout | Buyer/payment | BLOCKED; payments disabled | NOT SCORED |
| checkout-complete | Buyer | BLOCKED | NOT SCORED |
| orders | Buyer | BLOCKED | NOT SCORED |
| profile | Identity | BLOCKED | NOT SCORED |
| live | Livestream | BLOCKED; no live rooms | NOT SCORED |
| auctions | Auctions | BLOCKED | NOT SCORED |
| coins | Gifting/wallet | BLOCKED; purchases disabled | NOT SCORED |
| flash-deals | Buyer | BLOCKED; no products | NOT SCORED |
| wishlist | Buyer | BLOCKED | NOT SCORED |
| shipments | Fulfilment | BLOCKED | NOT SCORED |
| messages | Messaging | BLOCKED | NOT SCORED |
| notifications | Messaging | BLOCKED | NOT SCORED |
| returns | Post-purchase | BLOCKED | NOT SCORED |
| seller-dashboard | Seller Centre | BLOCKED; requires seller session | NOT SCORED |
| seller-products | Seller Centre | BLOCKED; requires seller session | NOT SCORED |
| seller-orders | Seller Centre | BLOCKED; requires seller session | NOT SCORED |
| seller-kyc | Seller Centre | BLOCKED; uploads disabled | NOT SCORED |
| seller-settlements | Seller Centre | BLOCKED | NOT SCORED |
| admin-dashboard | Admin Console | BLOCKED; Admin MFA required | NOT SCORED |
| email-marketing | Admin Console | BLOCKED; Admin MFA required | NOT SCORED |
| storefront | Seller storefront | BLOCKED; no sellers | NOT SCORED |
| policies | Legal/help | BLOCKED by Access | NOT SCORED |

The Worker also maps descriptive URL aliases to these page states. An alias is not counted as a new application page.

## 2. Backend and storage inventory

Inspected: `worker.ts`, `new-auth.ts`, `unified-sync.ts`, `orders.ts`, `marketplace.ts`, `auctions.ts`, `coins.ts`, `stream.ts`, `kyc.ts`, `admin.ts`, `newsletter.ts`, and `flutterwave.ts`.

Implemented endpoint families include `/api/health`, `/api/auth/*`, `/api/v1/*`, `/api/orders`, `/api/checkout`, `/api/payments/*`, `/api/seller/*`, `/api/admin/*`, `/api/auctions`, `/api/coins`, `/api/live/cloudflare/*`, `/api/sellers/kyc`, and `/api/newsletter/*`. Individual API behaviours need authenticated and integration tests before certification.

Cloudflare staging bindings confirmed from the Worker settings: `AUTH_DB` and `DB` point to D1 `9a2cdbee-e030-4b10-908b-b10b8142d2aa`. `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `KYC_UPLOADS_ENABLED=false`, and `FLW_MODE=disabled`. This inspection involved no production mutation or payments.

The D1 database has **43 non-internal tables**, with one Admin user, zero seller products, zero orders, zero short videos and zero newsletter subscribers at inspection. These are actual staging records, not seeded demonstration data.

## 3. Automated regression baseline

Baseline run: https://github.com/deeonejosh/cashncarry-source/actions/runs/44112516309  
Successful backend retest: https://github.com/deeonejosh/cashncarry-source/actions/runs/44123264147

| Check | Evidence-based result |
|---|---|
| Source inventory | PASSED |
| Backend/security integration baseline | **17 PASSED, 1 FAILED** |
| Backend/security integration after Admin SQL fix | **18 PASSED, 0 FAILED** |
| Owner setup and Admin moderation regression | **PASSED on retest** after compatibility fix |
| Android source/build configuration | **FAILED**: repository-root `build.gradle.kts` missing or empty |
| Desktop/mobile screenshot artifact from the original workflow | **BLOCKED**: web job stopped at failing regression; no screenshots uploaded |
| Private deployed website UI | **BLOCKED** by Cloudflare Access without a test session |
| Live third-party payments and supplier integration | NOT TESTED; real transactions prohibited |

The initially failing `Owner setup: existing seller password and TOTP are required before privilege elevation` test actually reached Admin moderation. Stack diagnostics pinpointed `admin.ts`: the moderation SQL selected `p.category`, which is absent in the clean schema but present in the existing staging database. The branch now conditionally selects the column when it exists, and the same test passed on retest without weakening password, TOTP or role enforcement.

## 4. Weighted benchmark (100-point rubric)

| Category | Weight | Certified score | Evidence status |
|---|---:|---|---|
| UI/UX Design | 20 | Not scored | Local screenshot benchmark pending evidence review |
| Workflow Functionality | 20 | Not scored | 18/18 isolated backend checks pass; no complete authenticated E2E |
| Mobile Responsiveness | 15 | Not scored | Playwright screenshots/overflow audit configured, not certified |
| Backend and API Reliability | 15 | Not scored | 18/18 isolated integration checks passed; runtime protected APIs not E2E tested |
| Security | 10 | Not scored | Fail-closed staging flags verified; owner/MFA regression passed on retest |
| Performance | 10 | Not scored | Lighthouse CI collecting lab data |
| Accessibility | 10 | Not scored | Axe audit collecting evidence |
| **Total** | **100** | **NOT CERTIFIED / 100** | **No points awarded for tests not completed** |

A numeric product-quality score would be fabricated at this point. The benchmark CI will produce per-route evidence, which must be inspected before grading and comparing scores.

## 5. Verified defects and blockers

| Priority | Finding | Verification | Status |
|---|---|---|---|
| P0 | Owner/Admin moderation clean-schema regression initially returned HTTP 503 | Baseline `44112516309`; pass `44123264147` | **FIXED in source**; staging deployment not yet approved |
| P1 | Repository Android Gradle root configuration absent/empty | Android job log | BLOCKED |
| P1 | Local source and deployed staging Worker contain independently patched auth/UI behaviour; replacing the Worker from source risks regression | Inspected GitHub source and Cloudflare Worker | REQUIRES RECONCILIATION |
| P1 | No authenticated browser session available to test actual staging | Cloudflare Browser Rendering opened Access sign-in | BLOCKED |
| P2 | The original GitHub workflow did not upload screenshots when regression failed earlier in the job | CI action log | TEST INFRASTRUCTURE IMPROVED on isolated benchmark branch |
| P2 | Comprehensive Lighthouse and Axe evidence was not configured in baseline workflow | Repo/workflow inspection | BENCHMARK CI ADDED on isolated branch |

## 6. Changes made during this benchmark

Dedicated branch `fix/staging-ai-benchmark-20261117` was created. Changes are limited to benchmarking and diagnostics:

- `web/scripts/website-benchmark.mjs`: discovers frontend route cases; collects desktop/mobile screenshots, basic layout/HTTP/JS error checks and Axe accessibility evidence in JSON/Markdown.
- `web/lighthouserc.json`: Lighthouse CI collection for local home and Shop previews; filesystem report output.
- `.github/workflows/benchmark-private-staging.yml`: runs source build, lint, backend tests, Playwright/Axe and Lighthouse; uploads evidence.
- `.github/workflows/benchmark-auth-regression.yml`: independent fast owner regression check.
- `web/deploy/chatgpt-sites/admin.ts`: fixes the verified clean-schema P0 moderation bug using a safe conditional `category` column projection; preserves the value when the column exists. **18/18 backend tests pass after this change**.
- `web/deploy/chatgpt-sites/worker.ts` and `web/scripts/run-automated-tests.ts`: optional benchmark-only diagnostics and targeted test messages. **These diagnostic changes are not deployed** and must be removed/reviewed before a release.

No production changes were made. Existing staging was inspected read-only; the benchmark branch has **not** been deployed to the staging Worker.

## 7. Follow-up verification gates

1. Complete and review the running isolated browser/Lighthouse/Axe CI evidence and screenshots.
2. Owner/Admin moderation clean-schema 503 regression **fixed and retested: 18/18 passed**; remove diagnostic-only instrumentation before deployment.
3. Complete remaining browser, Lighthouse and Axe checks and inspect actual outputs.
4. Address missing Android Gradle configuration independently; do not claim APK tests passed.
5. Obtain authorised staging test sessions if complete Buyer/Seller/Admin journeys are required. Do not bypass Cloudflare Access.
6. Reconcile actual staging Worker changes with the approved source branch, back up isolated staging data, then deploy only a tested release candidate.
7. Perform post-deployment HTTP, mobile, desktop, security, accessibility and performance smoke checks; capture before/after evidence.

## 8. Linked evidence

- [Baseline staging backend/source CI (17/18)](https://github.com/deeonejosh/cashncarry-source/actions/runs/44112516309)
- [After-fix owner/Admin regression (18/18)](https://github.com/deeonejosh/cashncarry-source/actions/runs/44123264147)
- [Isolated Playwright/Axe/Lighthouse benchmark run](https://github.com/deeonejosh/cashncarry-source/actions/runs/44120802783)
- [Current benchmark branch](https://github.com/deeonejosh/cashncarry-source/tree/fix/staging-ai-benchmark-20261117)

**Final release decision: BLOCKED pending full release verification.** The owner/Admin regression now passes, but authenticated staging browser tests and complete design/performance evidence remain incomplete. Do not deploy the benchmark branch while deployed Worker changes remain unreconciled with source.

## 9. Completed isolated Playwright/Axe evidence (17 November 2026)

The initial CI browser benchmark **completed**. Source: [GitHub Actions run 44123884809](https://github.com/deeonejosh/cashncarry-source/actions/runs/44123884809); artifact `cashncarry-ai-benchmark-evidence` (ID `14345264866`). The output has been inspected and the screenshots are preserved in the evidence ZIP.

- **26 distinct frontend route/tab states** were tested at **1440×900 desktop and 390×844 mobile**: **52 view executions**.
- **25 PASS / 27 FAIL / 0 BLOCKED** against the browser benchmark's combined HTTP 200, rendered page, horizontal overflow, JavaScript exception, and Axe WCAG A/AA criteria. Note: this is a *local rebuilt frontend* test, not authenticated private staging.
- Desktop: **1/26 PASS**, **25/26 FAIL**. Mobile: **24/26 PASS**, **2/26 FAIL**. These outcomes are driven by the Axe **colour contrast** rule.
- **71 Axe colour-contrast failure nodes across 27 view executions** (Axe rule `color-contrast`, severity *serious*). No tested view recorded horizontal overflow or a JavaScript page exception. The browser script does not prove all forms, navigation, buttons or workflows work.
- **52 desktop/mobile screenshots** and `evidence.json` were uploaded in the artifact. Before/after screenshots were **not** produced: only a baseline local build was visually checked.
- The local Vite preview does **not** serve the Cloudflare backend APIs. Screenshots show **HTTP 502 error banners** for several data-fed areas, including home Sellers and Live shopping. These are **local test environment limitations** and must not be reported as verified production or deployed staging API failures.
- Lighthouse CI executed for locally previewed homepage and Shop in the workflow, but numeric Lighthouse category scores are **not validated in this report**. No real deployed staging Lighthouse score has been measured because Cloudflare Access requires an authorised test session.
- The GitHub workflow's overall success status does **not** mean the benchmark passed; Playwright/Axe step used `continue-on-error`, reported failed gate, and returned exit code 1. Release remains blocked.

### Evidence-based partial indicators (NOT a certified 100-point score)

| Indicator | Verified measured result |
|---|---|
| Owner/auth/backend isolated regression | **18/18 PASS** after query fix |
| Browser/axe combined route views | **25/52 PASS**, 27 FAIL |
| Desktop Axe/visual gate | **1/26 PASS** |
| Mobile Axe/visual gate | **24/26 PASS** |
| Accessibility | **71 contrast nodes** in **27 route/viewport views** |
| Horizontal overflow | **0/52** observed |
| JavaScript page exceptions | **0/52** observed |
| Real authenticated Buyer/Seller/Admin end-to-end | **BLOCKED**, Access credentials/test session not available |
| Shipping/payment provider or supplier flow | **NOT TESTED**; production/payment transactions disabled |

**No weighted website score out of 100 is certified**: the rubric encompasses workflow behaviour, security, performance and true end-to-end interactions not covered by local page rendering. Assigning the remainder based on screenshots would overstate coverage.

### Final benchmark gate status

**SOURCE REPAIR VERIFIED, RELEASE BLOCKED.** The Admin moderation clean-schema failure is fixed in the benchmark branch and independently passed the complete 18-test backend regression suite. Axe contrast findings remain unresolved, and the local-only browser environment cannot certify deployed private staging. The benchmark branch has **not** been deployed; existing staging and production remain untouched by the benchmark.