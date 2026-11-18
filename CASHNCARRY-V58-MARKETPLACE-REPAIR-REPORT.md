# Cash N Carry Nigeria — v58 marketplace repair and private-staging release report
**Date:** 18 November 2026 UTC  
**Scope:** existing **private Cloudflare staging** only. No production work, no paid services, no real customer data changed.  
**Final marketplace readiness:** **NOT PRODUCTION READY**. Internal isolated marketplace tests pass, but actual authorised buyer/seller/owner E2E, Flutterwave test-provider settlement, R2 upload, real livestream, Android-device acceptance remain unverified or blocked.

## 1. Starting staging version, deployment, Git commit and architecture

| Record | Directly verified |
|---|---|
| Starting version | **v58** Worker `6cf16c68-6515-4163-9ce2-dc146238d0b7`, 100% at 08:46:14 UTC, deployment `60f4f54c-99ce-43dc-914e-80c66605af81` |
| Deployed v58 wrapper commit annotation | `e7da750157ec15ac9bca0a5fdd15d2644ccb86a3` |
| Baseline repository report commit | `d7328633d96e865d185e9aed56e08f58c5aa9eaa` |
| Actual deploy target | `cashncarry-d1-staging-worker` on `cashncarry-workforce-2026.workers.dev`, Cloudflare Access protected |
| Repair branch | `fix/v58-marketplace-e2e` |
| Baseline benchmark | [V58-BASELINE-BENCHMARK.md](./V58-BASELINE-BENCHMARK.md) |
| Frontend | v58 unchanged React/Vite SPA, supplied by 3 allowlisted keys in staging KV, no fake catalogs |
| Backend | Cloudflare Worker `entry.mjs` (v58 KV bridge) importing bundled verified Worker API (`backend-v57.mjs`) |
| Database | Staging D1 `cashncarry-d1-staging` UUID `9a2cdbee-e030-4b10-908b-b10b8142d2aa`; both `AUTH_DB` and `DB` bindings point to it |
| Other infrastructure | Separate mobile staging Worker + same staging D1; Resend sending domain verified; no R2 buckets; no WHIP/WHEP provider |
| Private site | https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/ |

The tested Worker routes cover authentication, MFA owner administration, seller applications/reviews, seller storefront and product moderation, public products/categories, carts, addresses, buyer checkout/orders, payments, auction bid/close/checkout guards, wallet/coins, livestream API, messages, video feed and protected seller fulfilment. The React build has 26 page routes/tabs. Backend roles are owner admin, approved seller, buyer; approval requires administrator review. This audit did not run every distinct button end-to-end on live staging.

## 2. Direct live-staging baseline — authentication and database
- **PASSED:** Verified active v58, exact target account and private URL, Cloudflare Access application, 14 Worker binding names/types; did not read Admin MFA, password, Resend or other secret values.
- **PASSED:** Cloudflare Access one owner-only `allow` policy, 24-hour Access app session; policy was **not modified**. Owners keep MFA and existing identity restrictions. Account registration is not possible remotely for non-allowlisted testers without owner-authorised Access membership; **BLOCKED** real buyer/seller browser E2E.
- **PASSED:** Staging D1 `PRAGMA quick_check=ok`, `PRAGMA foreign_key_check` zero rows, migrations ledger **25** including 0022, 0023, 0024, 0025. Existing one verified owner admin, zero other users, products, orders, auctions, lives or payments. No staging database schema/data modification by this release.
- **BLOCKED:** Creation of temporary staging buyer/seller accounts through genuine verified email and Cloudflare Access; no Access bypass/test credentials ever inserted into staging. Browser registration/MFA/password reset on **actual protected site** were **NOT TESTED**.
- **NOT TESTED:** Social Google sign-in on real Android/web app. No evidence establishing a configured Google identity provider.
- **NOT TESTED:** Actual Worker tail request logs from authenticated users. The Cloudflare observability issues summary reported 0 active issues only, not proof of error-free traffic.

## 3. Defect reproduced, root cause, fix and regression
**P0: Seller could create buyer orders from a direct API call.**
- **Reproduced FAILED** on the baseline source using actual **isolated** Cloudflare Worker/D1: approved seller with its own cart/address sent `POST /api/checkout` and received **HTTP 200**, creating an order and reserving stock. The UI buyer-only page check was insufficient.
- Evidence: [expected-failing run 44292909223](https://github.com/deeonejosh/cashncarry-source/actions/runs/44292909223); audit script `web/scripts/v58-marketplace-e2e.mjs`.
- Root cause: `web/deploy/chatgpt-sites/orders.ts` allowed both `buyer` and `seller` roles for `/api/checkout`, `/api/orders` and cancellation. Seller-owned order views use the separately protected `/api/seller/orders` path.
- **Fixed:** Enforce `account.role === 'buyer'` server-side before buyer-order API handlers. No database migration, frontend change or API credential change.
- Source commit: [`59f9b3969d157e6ea7a8f6fa0d247eb06d52e0e7`](https://github.com/deeonejosh/cashncarry-source/commit/59f9b3969d157e6ea7a8f6fa0d247eb06d52e0e7). Denied seller checkout now **HTTP 403**, with **zero** seller orders created.
- **PASSED in isolated E2E:** [run 44293126337](https://github.com/deeonejosh/cashncarry-source/actions/runs/44293126337) and [run 44293408904](https://github.com/deeonejosh/cashncarry-source/actions/runs/44293408904). 38 named connected checks; baseline 25 standard Miniflare/SQLite/Worker unit/integration tests **25 PASSED, 0 FAILED**. Evidence ZIP [Actions artifact 14421603701](https://github.com/deeonejosh/cashncarry-source/actions/runs/44293408904/artifacts/14421603701).
- No fake accounts/products were made or left in staging. `example.invalid` fixtures existed only inside disposable local D1 and were disposed.

## 4. Connected seller → admin → buyer workflow verification

| Workflow | Status | Actual evidence or limitation |
|---|---|---|
| Seller applicant (buyer role) submits application | **PASSED (isolated)** | D1 persisted application; pending seller denied Seller Centre |
| Admin reviews and approves seller | **PASSED (isolated)** | Owner MFA session; buyer approval denied 403; role updates to seller; previous session revoked |
| Approved seller creates storefront | **PASSED (isolated)** | Private store syncs to approved public `stores` record |
| Seller creates draft, submits for moderation | **PASSED (isolated)** | Product private until reviewed; revisions tracked |
| Owner moderates product, buyer views catalog | **PASSED (isolated)** | Public product appears after review, matching source product |
| Buyer and seller address persistence | **PASSED (isolated)** | Test D1 addresses persisted across API reads; no real delivery provider contacted |
| Buyer cart, quantity, checkout request | **PASSED (isolated)** | Buyer creates unpaid order; seller denied 403 after fix |
| Idempotent reservation and stock update | **PASSED (isolated)** | Same request ID returns same order; 1 row and 1 stock deduction |
| Cross-buyer cancel protection | **PASSED (isolated)** | Second buyer gets 409; owner may cancel; stock restored exactly once |
| Seller paid order notification / tracking | **PASSED for isolated fixture-based pre-existing tests only** | Real paid provider and new remote order NOT TESTED |
| Shipping fee/estimated delivery | **NOT TESTED** | No authenticated remote delivery quote provider verification |
| Real Flutterwave TEST charge and HMAC webhook | **BLOCKED** | `PAYMENTS_ENABLED=false`, `FLW_MODE=disabled`, no authorised/test-provider completion. Synthetic HMAC checks are NOT external payment proof |
| Real seller-to-buyer purchase with receipt | **BLOCKED** | Cloudflare Access restricts non-owner users; external payment switch off |

## 5. Auctions and winner-payment settlement
- **PASSED (isolated):** Approved seller creates a published-product auction; D1 reserves exactly one unit. Buyer A bids, buyer B outbids, stale losing bid returns 409, owner closes auction, D1 confirms buyer B as winner.
- **BLOCKED:** Winning buyer `Pay Now` intentionally returns 503 `PAYMENTS_DISABLED` or `AUCTION_SETTLEMENT_NOT_CONFIGURED`. Dedicated auction order/verified shipping/payment-deadline lifecycle is not implemented end-to-end. No winner payment, seller fulfilment, payout or timeout settlement claimed.
- No real provider charge, no real auction fixtures on remote D1.

## 6. Livestream and wallet/gifting
- **BLOCKED genuine broadcast:** Cloudflare `STREAM_WHIP_URL`/`STREAM_WHEP_URL` absent; no end-to-end camera/WHIP/WHEP ingest or viewer playback verified. Existing API intentionally fails closed.
- **BLOCKED paid coins/gifts:** `COINS_PURCHASES_ENABLED=false`. Existing isolated D1 ledger, balance, replay and authorisation tests passed but are not evidence of real wallet/gift provider integration or on-screen paid animations.
- **BLOCKED R2 uploads:** Direct Cloudflare R2 buckets listing is empty. `KYC_UPLOADS_ENABLED=false`; no real image/KYC storage verification. No new paid R2 bucket provisioned.

## 7. Admin Console, Seller Centre, browser QA
- **PASSED (isolated):** owner-only admin endpoints, seller approval/moderation, buyer cannot approve or see admin, unapproved seller denied, seller role activated only after approval.
- **PASSED (prior isolated browser run):** 26 React routes on desktop/mobile = 52 guest views, 0 Axe findings in the tested WCAG subset; these **do not count as authenticated remote page/transaction checks**.
- **NOT TESTED remotely:** all owner dashboard buttons and seller dashboard controls as authenticated Cloudflare Access users. Any claim that every page/button works would be unfounded.
- Deployed HTML/JS/CSS in existing v58 KV remain byte-for-byte identical to source-approved files. No UI redesign or extra pages added.
- Synthetic local Lighthouse does not replace real staging performance; private `noindex` preserved.

## 8. Android and transactional email
- Android debug source targets separate `cashncarry-mobile-staging-api` Worker (present and bound to the **same staging D1**). Direct script inspection found its own `ordersRoute` already applies buyer-only permission checks, so no unsafe mobile-worker change was made.
- Android Kotlin/Compose source and JVM unit tests exist. Added `.github/workflows/v58-android-qa.yml` to compile/test a disposable **debug-only** APK and upload evidence; **physical Samsung device NOT TESTED**.
- Two CI infrastructure blockers were found and addressed in workflow only: obsolete `android-actions/setup-android` tried to install nonexistent package `tools`; root Gradle `settings.gradle.kts`, `build.gradle.kts`, and `gradle/libs.versions.toml` are empty in the repository. Follow-on workflow attempts to recover existing integrated-source config **in disposable CI only**, avoiding modifications to live Android or production configuration.
- **Android build/test status**: see [Android QA runs on repair branch](https://github.com/deeonejosh/cashncarry-source/actions/workflows/v58-android-qa.yml). Do not mark PASS unless actual Gradle tests and APK both complete successfully. Historical APK does not establish this source is functional.
- Resend domain `cashncarryng.com` is **verified**, and historical account verification/password-reset emails were delivered according to Resend metadata. No fresh authorised staging recipient tests were sent; transactional notifications for new buyer/seller orders/refunds **NOT TESTED**.
- Google sign-in, Play Console signing, Android emulator and physical Samsung testing **NOT TESTED**.

## 9. Source changes and CI evidence
| Path or resource | Change |
|---|---|
| `V58-BASELINE-BENCHMARK.md` | New direct Cloudflare/source baseline |
| `web/scripts/v58-marketplace-e2e.mjs` | Isolated multi-identity, combined D1 business-flow regression and JSON evidence |
| `.github/workflows/v58-connected-marketplace-e2e.yml` | Repeatable test-only CI, no remote staging API writes |
| `web/deploy/chatgpt-sites/orders.ts` | Actual P0 buyer-only order API permission repair |
| `.github/workflows/v58-build-verified-backend.yml` | Immutable compiled backend package; verifies unchanged v58 UI hashes; never deploys by itself |
| `.github/workflows/v58-android-qa.yml` | Staging debug Android testing and CI SDK/Gradle metadata diagnosis |
| Existing private Worker `cashncarry-d1-staging-worker` | **Backend-only release**, inherited 14 existing bindings; no UI/D1/Access/flag changes |

**Green core CI:** [connected E2E 44293408904](https://github.com/deeonejosh/cashncarry-source/actions/runs/44293408904); [immutable backend build 44293409032](https://github.com/deeonejosh/cashncarry-source/actions/runs/44293409032); [retested E2E 44294658865](https://github.com/deeonejosh/cashncarry-source/actions/runs/44294658865).  
**Original expected failing test:** [44292909223](https://github.com/deeonejosh/cashncarry-source/actions/runs/44292909223) proves the actual security defect.  
**CI evidence:** JSON artifact includes all 38 isolated flow assertions and explicit flags `remoteStagingWrites=0`, `providerPaymentsTested=false`, `realStreamingTested=false`, `authenticatedAccessTests=false`.

## 10. Deployment verification and rollback

| Verification | Cloudflare readback |
|---|---|
| Actual deployed patched Worker version | `e049a51a-21fb-4f43-93a4-17446d68229f`, 100% staging |
| Deployment ID | `da785c1d-1305-4372-a11f-1a72b6d8d520` |
| Deployment time | **2026-11-18 11:21:44 UTC** |
| Deployed source commit annotation | `1bdb4d6c3837c56ef698a4f9777660d3d29434c9` |
| Backend binary SHA-256 | `62a1a91a44fce61c34b54485dde1c97425520cfeab859b81f0513f5d8cb64de3` |
| Immutable backend artifact branch | `artifact/v58-marketplace-buyer-guard-20261118` |
| Bindings | Exactly 14 matching staging names/types, strict inheritance |
| Financial/upload flags | `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `KYC_UPLOADS_ENABLED=false`, `FLW_MODE=disabled` |
| Post-deploy D1 | `quick_check=ok`, FK violations 0, 25 migrations, existing one owner, 0 orders/products |
| Frontend | Existing v58 HTML/JS/CSS KV hashes unchanged |
| Access | One original owner-only allow policy unchanged |
| Production | **UNCHANGED** |

**Rollback:** If the patched backend misbehaves, change the existing **private staging Worker deployment only** back to known-good Worker version `6cf16c68-6515-4163-9ce2-dc146238d0b7` at 100%. Do not delete/rollback D1, KV or Access policy. Previous v58 serves the same UI/D1; it **does reintroduce the buyer-API permission issue**, so restrict testing/traffic appropriately while preparing a corrected rollback variant if rollback becomes necessary. Keep financial flags disabled. Private encrypted SQL recovery snapshot remains retained in Library; no new D1 migrations were needed for this patch.

## 11. Weighted evidence-coverage benchmark (not a provider readiness certificate)

Weights follow the requested 100-point allocation. These are **explicit conservative evidence-assessment points**, not measured transaction success percentages or Lighthouse scores. Only existing repeatable local integration evidence and direct Cloudflare readbacks earn partial credit; a provider-end-to-end claim earns zero until performed. The delta reflects the one demonstrated security repair plus stronger connected isolated business-flow evidence. Owner-only Cloudflare Access and missing R2/payment/stream providers are hard launch blockers regardless of score.

| Category | Max | Baseline v58 | Repaired staging | Evidence and unresolved gap |
|---|---:|---:|---:|---|
| Account auth and permissions | 15 | 4 | 4 | Existing isolated login/RBAC; remote multiuser auth BLOCKED |
| Seller approval and storefront | 15 | 5 | 6 | 38-step connected test confirms application→approval→publish in local D1; remote/R2 BLOCKED |
| Buyer checkout and orders | 20 | 5 | 8 | **Reproduced and fixed seller-API permission bug**; idempotent unpaid order; real payment BLOCKED |
| Auction winner payment | 15 | 3 | 4 | Two-buyer winner persisted locally; winner payment BLOCKED |
| Livestreaming | 15 | 0 | 0 | No working media transport; real streaming BLOCKED |
| Admin and Seller integration | 10 | 4 | 5 | Role approval and moderation connected locally; remote sessions BLOCKED |
| Android and notifications | 5 | 1 | 1 | Historical Resend delivery only; Android build outcome and real receipts NOT VERIFIED |
| Security, performance, operations | 5 | 3 | 4 | Source-built CI, backup, Cloudflare deploy/readback; remote performance NOT TESTED |
| **Evidence-weighted total** | **100** | **25** | **32** | **NOT PRODUCTION READY** |

These ratings are **judgemental coverage allocations under the stated caps**, not an automated test tool's scores; do not market them as percentages of working features.

## 12. Outstanding P0 gates and decisions
1. **Remote authenticated Access test users:** obtain explicitly authorised temporary buyer/seller email identities, approve only their staging Access membership via normal policy controls; preserve owner MFA; then run real browser registration/login and role workflows (no permanent fake accounts).
2. **Full real sandbox payment:** verify actual Flutterwave TEST credentials, fee/shipping quote and webhook signatures; do not enable real payments or paid gifts. Only after connected access and checkout proof can winner checkout lifecycle be implemented and provider-tested.
3. **Auction payout/deadline:** add a dedicated reservation/order for winner, exactly-once inventory and refund/expiry states; 503 fail-closed remains appropriate until real provider verification.
4. **Real livestream transport:** configure an approved/no-unapproved-cost WHIP/WHEP provider and verify actual camera ingest, playback, viewer chat and cleanup; no simulated success.
5. **Private R2 uploads:** missing R2 provider/bucket, no business-verification image evidence; do not provision paid storage or accept fake KYC.
6. **Android:** repair/build Gradle configuration, test authentication and camera on emulator then physical Samsung where authorised; no untested APK acceptance.
7. **Resend:** authorised receipt email test and delivery logs, plus notification and order flows.
8. **Authenticated cross-system reconciliation:** actual owner→seller→buyer checkout with payment, inventory, shipping, notifications and commission, followed by tagged, safe cleanup preserving audit/payment records.

**Decision:** the independent verified P0 buyer role fix is deployed safely to private staging. Wider marketplace acceptance remains **BLOCKED/NOT TESTED**. No basis to release to production, relax Access or activate financial/media services.
