# CASHNCARRY MASTER MARKETPLACE BENCHMARK
**Audit date:** 18 November 2026 (UTC)  
**Scope:** Existing *private* Cloudflare staging only; never production  
**Repository:** https://github.com/deeonejosh/cashncarry-source  
**Repair branch:** `fix/staging-master-marketplace-20261118`  
**Architecture:** [MARKETPLACE-ARCHITECTURE-MAP.md](./MARKETPLACE-ARCHITECTURE-MAP.md)  
**Staging URL:** https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/  
**Release gate:** **CLOSED for production** — unconfigured sandbox payments/shipping and real video; no real authenticated multi-user E2E.

## 1. Baseline, real deployed state and evidence

**Baseline before repairs:** Cloudflare Deployment `869d551d-9701-4913-ad05-b90e9837071f`: Worker **v54** `a1133ace-90c5-424c-af47-f514fca72dca`, 100% traffic, created 2026-11-17 22:55 UTC, originating source commit `de2f6643593b34ed3e51d7daefa30c1a34c4d97e`. **Latest verified active release: v55** `1e6cacd4-765b-4b10-9a98-82efe80ef5de`, 100% since 2026-11-18 06:11:34 UTC, release backend source `a40ec1fc2b6f41bdd262b0e3cdb1705bca6e8568`. Production DNS/Worker/data not written to by this exercise.

Previous baseline: 24 isolated Miniflare/D1 regression tests passed, 0 failed; [CI proof](https://github.com/deeonejosh/cashncarry-source/actions/runs/44194889147). Tests do NOT exercise Cloudflare Access-authenticated real staging sessions.

**Expanded branch regression (verified, not a live end-to-end payment):** [CI run 44248947547](https://github.com/deeonejosh/cashncarry-source/actions/runs/44248947547), source commit `63ed3573b6eeb584a4aedb51c3d722a8735dc27a`: TypeScript, isolated **25 passed / 0 failed**, frontend static audit/Vite build, esbuild Cloudflare Worker bundle all passed.

## 2. Discovered architecture, routes and infrastructure

See companion architecture map for the 26 actual React SPA views, server API routes, D1 data model, host dependencies and state-machine diagrams. The UI currently exposes *two* Admin tabs and *four* Seller Centre tabs (plus seller onboarding)—other proposed console modules must be verified before marking as existing.

Cloudflare bindings observed: `DB`, `AUTH_DB` (D1), `CNC_STAGING_ASSETS` (KV), `AUTH_RESEND_API_KEY` (secret), owner MFA secrets, `ORDER_RESERVATIONS`, payment and KYC safety flags. No R2 KYC bucket binding, WHIP/WHEP configuration or Stream media credentials were observed. `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `FLW_MODE=disabled`, `KYC_UPLOADS_ENABLED=false`. This is intentional fail-closed configuration, not a successful external integration test.

Actual private D1 read-only inspection: 1 existing auth account; no seller applications, seller storefronts, public products, orders, auctions or live sessions. **No test accounts, fake products, gifts or orders have been created in remote D1.**

## 3. Verified defect and smallest root-cause repair

**P0 / payment and fulfilment integrity:** `web/deploy/chatgpt-sites/unified-sync.ts` used to return all order records to a seller with matching order items, exposing buyer delivery details before confirmed payment; the fulfilment endpoint allowed `processing`, `packed`, `shipped` or `delivered` without checking payment, owner approval or valid status progression. `cnc_order_fulfilments` has **PRIMARY KEY(order_id)**, so multivendor orders could also cause a seller to overwrite another seller's order-level fulfilment entry.

**Repair on this branch:**
1. Seller GET orders now requires approved application + server-confirmed `cnc_orders.payment_state='paid'` + a matching `cnc_flutterwave_payments.transaction_id` and `paid_at`; unpaid buyer delivery addresses are excluded.
2. POST fulfilment requires the same proof and seller ownership. No impersonation or admin bypass.
3. Reject multi-seller orders until there is a safe per-seller fulfilment data model and workflow; this is a remaining P0 functional gap, not declared completed.
4. Enforce `processing -> packed -> shipped -> delivered` without regression, require tracking ID at shipped/delivered, guard concurrent transitions with a conditional SQL UPSERT and suppress duplicate notifications for replayed identical updates.
5. Emit buyer notification only after a successful state change.

**Regression:** A new isolated Miniflare/D1 API test validates approved seller registration fixtures, cart reservation and stock decrement once, idempotent checkout request, unpaid address privacy, unpaid fulfilment rejection, DB-level payment-proof transition, seller isolation, ordered fulfilment, tracking requirements, replay-safe notifications, and explicit multivendor fail-closed. The fake provider confirmation is **fixture-only SQL**, not a real Flutterwave sandbox payment.

**Historical migration gap found by regression:** The repository omitted `0013_payment_state_new_db_only.sql` even though the Cloudflare D1 migration ledger lists its successful prior application, and the deployed DB already contains the `payment_state` column and payment proof triggers. Reconstructed and restored its applied DDL to source, strictly for clean local/isolated databases. **DO NOT apply 0013 to the existing staging D1**—its column already exists. Historical source migrations 0014–0016 remain missing and need source reconciliation.

**Initial CI failure:** 24 passed / 1 failed on run [44248778729](https://github.com/deeonejosh/cashncarry-source/actions/runs/44248778729) because clean D1 lacked `payment_state`. After restoring the missing historical migration, run 44248947547 passed all 25 tests.

## 4. Seller review, public catalog and pending D1 migration

The existing isolated regression validates: buyer application -> admin MFA approval -> forced re-login -> seller private storefront -> draft product -> moderation -> public catalog; subsequent suspension hides products and revokes seller access; reapproval and unpublication behave as expected. This is **isolated CI only**.

**Remote gap:** Existing staging schema contains `cnc_public_seller_store_created` and `cnc_public_seller_product_updated`, but not `cnc_store_after_application_approval` or `cnc_store_after_application_suspended`. Consequently a pre-existing private store may not be mirrored on seller approval. Candidate `0023_approved_seller_public_store_sync.sql` fixes that in isolated tests. Pending `0022_auction_seller_approval.sql` tightens database auction-creation authorisation.

**Backup/preflight:** Cloudflare D1 full SQL export completed successfully on 18 Nov 2026 at bookmark `000000a7-00000000-00005127-e507ad86aad22748fc1124e0f1a10533` with a temporary signed download URL. Cloudflare time-travel bookmark was retrieved. However there is **no verified durable, independent copy of the export**, so remote migrations were not executed in this benchmark. This avoids destructive or un-recoverable SQL changes.

## 5. Buyer checkout, payment and shipping

Cart creation and reserve-once order trigger are covered by isolated API regression. `cnc_orders` permits `awaiting_payment`/ `cancelled`, with separate payment state and Flutterwave records. The payment-webhook HMAC and amount/reference verification functions are covered by unit tests. No shipping-quote backend or authenticated real Flutterwave sandbox gateway acceptance was verified; payment flag is OFF. **End-to-end buyer purchase: BLOCKED.** The current app must not imply free shipping where no quote exists.

**Unresolved:** Secure per-seller shipping quotes, payment initiation and provider callback, mixed-seller allocation/fulfilment, verified buyer/seller notifications, refund and payout reconciliation. A complete live payment has NOT occurred.

## 6. Auction settlement and livestream transport

Auction reserve-once D1 triggers, concurrent bidding, seller self-bid rejection, deterministic highest-bid update, expired/unsold release, seller approval and idempotent close pass isolated tests. Auction winner checkout intentionally returns a fail-closed error because `cnc_reserve_order` assumes a buyer cart and would reserve auction stock a second time. No order/fee/settlement design or sandbox payment proof exists. **Auction winner payment: BLOCKED.**

Livestream initiation is guarded: missing configured WHIP/WHEP/Stream provider yields an error rather than a false live room. Chat throttling, pin ownership, buyer join counter integrity and ending a fixture room are tested in isolation. No real camera publish, actual WebRTC transmission, buyer playback or realtime viewer telemetry has been verified. **Actual broadcasting: BLOCKED.**

## 7. Authentication, KYC, wallets, admin and mobile

- Owner MFA and strict browser cookie role checks are exercised in isolated tests; admin routes deny native bearer-only impersonation. Real Cloudflare Access-authenticated multi-account browser sessions and owner MFA physical login: **NOT TESTED**. Google OAuth not confirmed operational.
- Seller KYC file uploads are **BLOCKED** by disabled uploads/no verified private bucket; do not claim a document was actually received or reviewed.
- Gifting fixture tests verify debit idempotency, overdraft rejection and refusal to mint client-supplied coins. Paid top-ups OFF; host realtime animation and refunds NOT TESTED.
- Admin product moderation and Seller Centre catalog lifecycle pass isolated API tests; complete UI click-through and all user-proposed pages NOT TESTED. Old QA badges/placeholder data source issues must be verified on current front, not assumed.
- Android Kotlin/Compose source is in the repository. No physical Samsung or emulator APK acceptance, login, camera or deep-link measurements occurred.
- Static customer-UI audit / build PASSED. Lighthouse, Axe runtime, Core Web Vitals, Resend real delivery, WebRTC latency and browser screenshots are **NOT TESTED**, and no invented performance metrics or images are included.

## 8. Evidence-based readiness coverage score (NOT a quality certificate)

These estimates measure **observable readiness evidence** at each stage, awarding limited credit for isolated regressions and no credit for missing real external integrations. They are deliberately conservative. A P0 blocker overrides any aggregate score.

| Category | Weight | Baseline | After source repair | Evidence |
|---|---:|---:|---:|---|
| Transaction workflows | 25 | 5 | 7 | Isolated cart/stock/order proof; live purchase blocked |
| Seller/Admin integration | 15 | 5 | 5 | Isolated approval/moderation; real staging sessions unavailable |
| Auctions & livestreams | 15 | 3 | 3 | Fail-closed + D1 fixtures; no provider media/settlement |
| Authentication & security | 15 | 8 | 9 | MFA, role tests + fulfilment isolation; browser untested |
| Backend and D1 integrity | 10 | 5 | 7 | Missing migration restored, checkout retry and transition tests |
| Payments & wallets | 10 | 3 | 3 | HMAC and coin fixtures; no real sandbox checkout |
| Mobile UI/UX | 5 | 2 | 2 | Static build only |
| Performance & operations | 5 | 1 | 1 | Static audit, no measured runtime metrics |
| **TOTAL** | **100** | **32** | **37** | **NOT PRODUCTION READY** |

*Subjective evidence-coverage scoring, not a statistically calibrated metric. No artificial score inflation for mocked provider capabilities.*

## 9. Required critical workflow status

| Critical workflow | Status | Evidence and release implication |
|---|---|---|
| Real buyer -> seller approval -> published listing | **NOT TESTED** | CI isolated pass only; remote 0023 pending |
| Authentication, owner MFA, six live role sessions | **NOT TESTED** | Isolated auth passes, real Access session not exercised |
| Normal buyer paid checkout -> delivery | **BLOCKED** | Flutterwave disabled and no verified shipping quotes |
| Auction winner -> pay -> fulfil | **BLOCKED** | Auction-specific settlement absent |
| Genuine seller Go Live -> buyer playback | **BLOCKED** | No configured media transport |
| Gift debit -> realtime host animation | **BLOCKED** | Ledger fixtures pass; realtime transport absent |
| Seller paid-order / status safeguards (isolated) | **PASSED** | 25-test CI, conditional DB transitions; live payment not proved |
| Paid multi-seller combined order fulfilment | **BLOCKED** | Legacy per-order fulfilment PK; safely rejected |
| Real staged admin/seller UI browser journey | **NOT TESTED** | Cloudflare Access authentication not available to test harness |
| Android Samsung physical-device login and purchase | **NOT TESTED** | Device APK test not run |
| Lighthouse/Axe and real Resend delivery | **NOT TESTED** | No measured data or receipts |

Statuses marked PASSED apply **only to the specifically named isolated backend test**. No complete real-money, streaming or production workflow is marked passed.

## 10. Changed source, test and artefacts

- `web/deploy/chatgpt-sites/unified-sync.ts`: seller order data/privacy/approval/payment/fulfilment-state safeguards.
- `web/scripts/run-automated-tests.ts`: additional 1 isolated Miniflare test with multiple user identities, order proof, stock, concurrency and replay.
- `web/deploy/chatgpt-sites/migrations/0013_payment_state_new_db_only.sql`: historical schema restoration for clean test DB only.
- `.github/workflows/benchmark-master-marketplace.yml`: Node 22 CI, npm ci, TypeScript, tests, build, static audit, Worker bundle, no deploy.
- `MARKETPLACE-ARCHITECTURE-MAP.md`: actual route, API, D1 and dependency mapping.
- `CASHNCARRY-MASTER-MARKETPLACE-BENCHMARK.md`: this report.

**Test logs:** [failed baseline of new case](https://github.com/deeonejosh/cashncarry-source/actions/runs/44248778729), [latest confirmed green source build](https://github.com/deeonejosh/cashncarry-source/actions/runs/44248947547). No screenshots are claimed.

## 11. Outstanding decisions, credentials and permissions

- Flutterwave TEST-only secret, webhook key and verified delivery-price/settlement rules before enabling payments.
- Approved/authorised real stream infrastructure (WHIP/WHEP or managed provider) and session lifecycle; no paid service has been activated.
- Durable staging D1 backup and reviewed 0022/0023 reconciliation before migration.
- Multi-seller fulfilment schema and earnings/fee allocation.
- Genuine Cloudflare Access authenticated test sessions for owner/buyer/seller and approved mobile devices.
- Reconcile historical source migrations 0014–0016 with remote D1.
- Confirm staging KYC private storage/approved document processing, Resend receipts, full mobile/Android E2E and measured performance.

## 12. Deployment and release gate

**New verified private staging release:** Cloudflare **v55**, deployed at 100%; deployment `4e5105a8-0f4f-4276-98e7-59d4ce5f6afe`. It is a backend-only safety release; the v54 frontend assets, entrypoint, 14 Cloudflare bindings and payment flags remain unchanged. Previous v54 is retained as the rollback. No staging schema migration or remote D1 fixture was executed. No production DNS, production Worker, production DB, production R2, live payment keys, Access policy or MFA settings were modified.

**Production unchanged by this benchmark. P0 full marketplace readiness: CLOSED.**

## 13. Verified v55 release and post-deployment readback (18 Nov 2026, 06:11 UTC)

| Evidence | Actual result |
|---|---|
| Private staging active | v55 `1e6cacd4-765b-4b10-9a98-82efe80ef5de` at **100%** |
| Cloudflare deployment ID | `4e5105a8-0f4f-4276-98e7-59d4ce5f6afe` |
| Source commit in Worker annotation | `a40ec1fc2b6f41bdd262b0e3cdb1705bca6e8568` |
| Source CI | [44249294268](https://github.com/deeonejosh/cashncarry-source/actions/runs/44249294268): 25 PASS, 0 FAIL, TypeScript/build/bundle pass |
| Release artifact CI | [44249294425](https://github.com/deeonejosh/cashncarry-source/actions/runs/44249294425): success |
| Immutable backend bundle | `artifact/staging-master-v55-20261118`, SHA-256 `394a0f96ede67344b7f77b72e86e95a59983024c3ca9fa651deb6cb1661e089e` |
| Active Worker guard strings readback | `FULFILMENT_NOT_READY`, `FULFILMENT_TRANSITION_REJECTED`, `COIN_CREDIT_NOT_AUTHORIZED`, `AUCTION_SETTLEMENT_NOT_CONFIGURED`, `BROADCAST_NOT_CONFIGURED` all present |
| Frontend assets | Prior v54 frontend manifest unchanged |
| Configuration | 14 bindings retained; payments, coins and KYC uploads OFF, Flutterwave disabled |
| Remote D1 | Read-only counts unchanged: 1 auth account, zero seller applications, seller stores, public stores, seller/public products, orders, auctions, gifts, live rooms or fulfilments |
| Remote migrations | **None applied**; restore-capable offsite D1 export still needed for 0022–0023 |
| Production | Not modified |

**Interpretation:** The code fix is **actually deployed to private staging**, but full marketplace acceptance remains **BLOCKED** by provider, checkout/fulfilment and live-media dependencies. A code readback and 25 isolated tests do not substitute for a real authenticated three-user transaction through Cloudflare Access. Do not release to production.


## 14. Subsequent candidate: seller-scoped multi-vendor fulfilment (18 Nov 2026)

**Status: SOURCE REPAIRED AND ISOLATED CI PASSED; NOT DEPLOYED TO CLOUDFLARE.**

**Repair branch:** `fix/staging-master-seller-split-20261118`; tested source commit `c22344fb29c345e2eba935d9d91730c112153d34`.
**Verified CI:** https://github.com/deeonejosh/cashncarry-source/actions/runs/44252077712 — Node 22, locked dependencies, TypeScript, **25 isolated tests passed / 0 failed**, Vite/UX static audit and Worker esbuild bundle all successful.

**Verified P0 root cause:** Existing `cnc_order_fulfilments` uses `PRIMARY KEY(order_id)` and could not hold separate shipping states for products belonging to different sellers on the same order. v55 intentionally rejected these paid orders during fulfilment, leaving a real business workflow disconnected.

**Repair committed but not deployed:**

- `web/deploy/chatgpt-sites/migrations/0024_seller_order_fulfilment.sql` — adds `cnc_seller_order_fulfilments` using `PRIMARY KEY(order_id,seller_id)`; enforces confirmed provider payment, seller line-item ownership, ordered state transitions, and atomic buyer notification triggers. Migrates only verified historical fulfilment data. An initial test failed because SQLite evaluates BEFORE INSERT triggers on UPSERT conflict paths; moved initial-state validation to AFTER INSERT. Retest passed.
- `web/deploy/chatgpt-sites/migrations/0025_paid_order_seller_notifications.sql` — one in-app notification per participating seller at the payment-state transition, not at unpaid reservation, with no duplicate on retry.
- `web/deploy/chatgpt-sites/unified-sync.ts` — seller-specific paid order totals, own line items and separate fulfilment state. No other seller's private items or unpaid delivery address leak.
- `web/deploy/chatgpt-sites/orders.ts` — buyer receives authoritative line items, saved delivery data and each seller's verified shipment/tracking record.
- `web/src/context/StoreContext.tsx`, `web/src/types/index.ts` and `web/src/components/pages/OrdersPage.tsx` — correct JSON address/date mapping, kobo precision, actual order items, truthful paid status, compact individual-seller shipment tracking without duplicate Track actions.
- `web/scripts/run-automated-tests.ts` — isolated API and D1 checks for unpaid fulfilment rejection, forged DB row prevention, stock reserved once, retry idempotency, independent seller totals/states, buyer order items, tracking, payment-state seller notifications and buyer notification deduplication.
- `.github/workflows/benchmark-master-marketplace.yml` — isolated child-branch CI; never deploys.

**Tests and statuses:**

| Test | Status | Evidence or blocker |
|---|---|---|
| Seller A/B own paid line items and privacy | **PASSED (isolated)** | 25-test Miniflare CI; per-seller SQL predicates |
| Buyer sees two real seller shipment records | **PASSED (isolated)** | API D1 fixtures and React TypeScript build |
| Seller-independent progression / replay deduplication | **PASSED (isolated)** | DB state guards and one notification per transition |
| Authenticated Cloudflare staging three-user purchase | **NOT TESTED** | No authorised Access sessions; Flutterwave disabled |
| Real Flutterwave sandbox transaction and fees | **BLOCKED** | TEST credential/fee quote configuration absent |
| Actual remote D1 migration 0022–0025 | **BLOCKED** | Database export retrieval/independent backup not verified |
| Public livestream transport and auction settlement | **BLOCKED** | No media handshake or winning checkout integration |

**Backup evidence:** Cloudflare D1 managed export reported complete at time-travel bookmark `000000ab-00000000-00005127-9ecfcbc3d05ccb37a2e6cfb4edeeca6b`. Retrieval of the signed SQL export was attempted and returned **HTTP 403**; an independent restorable SQL backup was **not** secured. Point-in-time bookmark was retrieved, but is not treated as a durable independent export. No remote D1 migrations, fixture data writes or release were performed from this child branch. No production resources modified.

**Staging release gate remains closed for this candidate.** The active private Worker remains previously verified **v55** `1e6cacd4-765b-4b10-9a98-82efe80ef5de` pending independent backup, remote migration test and actual multi-user acceptance. The isolated coverage is improved, but the published baseline **32/100** and v55 **37/100** conservative readiness scores are **not inflated** by tests that were never run against real providers or the deployed application. No new production-readiness score is claimed.

**Priority next:** secure independent staging D1 SQL backup; apply and verify 0022–0025 migrations using the actual staging schema; deploy the matching compiled frontend and Worker together; run authorised multi-user buyer/seller/owner acceptance and explicit rollback checks. Keep real payments, coin purchases, KYC uploads and streaming disabled until genuine provider acceptance exists.

## 15. Measured guest browser / UI / accessibility verification — 18 Nov 2026

**NEW VERIFIED EVIDENCE. All results below apply to a local isolated rebuilt Cloudflare Worker + D1, not the Cloudflare Access-protected deployed staging site.**

- Branch: `fix/staging-master-seller-split-20261118`; test source SHA: `64bfa36a4ca20ac42dbfbd420f10e3c446d8fa20`.
- Source/isolated D1 regression: [GitHub Actions 44255332164](https://github.com/deeonejosh/cashncarry-source/actions/runs/44255332164) **SUCCESS**: TypeScript, 25 Miniflare tests, React build, static UI audit and Cloudflare Worker bundle.
- Actual isolated-Worker guest route smoke: [GitHub Actions 44255332065](https://github.com/deeonejosh/cashncarry-source/actions/runs/44255332065) **SUCCESS**: Chromium at desktop (1440×900) and mobile (390×844); 26 real React tabs; route and console assertions, safe empty states and administrator/seller guest-access denials; 52 screenshots, uploaded artifact `cnc-private-guest-browser-evidence`.
- Worker-backed Playwright/Axe audit: [GitHub Actions 44255332210](https://github.com/deeonejosh/cashncarry-source/actions/runs/44255332210) **SUCCESS**. Evidence `cashncarry-ai-benchmark-evidence`: **26 routes × 2 viewports = 52 attempted, 52 passed the defined guest-shell criteria, 0 failed, 0 blocked, 0 Axe WCAG 2.0/2.1 A/AA violations**. The audit captured each screenshot and rejected any API HTTP 5xx response as a failed view.
- **Corrected audit false-positive:** The previous `website-benchmark.mjs` used Vite-only preview, so Shop/Live screenshots displayed HTTP 502 API error panels while being marked as successful visual views. The audit now starts a real **isolated Miniflare Worker + migrated D1** and explicitly fails on 5xx API responses. New evidence shows no such errors. This is a QA-harness fix, not a deployment, payment or authentication claim.
- Separate **Lighthouse CI** still runs on a frontend-only Vite preview (`http://127.0.0.1:4173`), so the resulting scores are *synthetic local frontend indications*, not remote/production Core Web Vitals and not proof that its API calls work. Scores from this run:

| Local Lighthouse page | Performance | Accessibility | Best practices | SEO |
|---|---:|---:|---:|---:|
| Home (`/`) | 75/100 | 100/100 | 96/100 | 66/100 |
| Shop (`/?tab=shop`) | 100/100 | 98/100 | 96/100 | 66/100 |

The staging-specific `noindex` setting and artificial preview environment limit SEO-score interpretation. Do not copy these scores to `www.cashncarryng.com`. Axe's zero detected violations is not a full accessibility certification, and the guest checks cannot verify logged-in seller/admin journeys or paid checkout.

**Staging deployment status remains unchanged:** private Worker **v55** `1e6cacd4-765b-4b10-9a98-82efe80ef5de` at 100% from the previous safety release. The seller-split candidate and migrations `0022`–`0025` are **NOT DEPLOYED** because no independently restorable D1 SQL backup has been retrieved (Cloudflare managed export completed, but the signed file retrieval failed). Zero remote D1 fixture writes. Payments, paid coin purchases, KYC uploads and live streaming are still disabled. All production infrastructure untouched.

**Final gate: NOT PRODUCTION READY.** Authenticated three-user live staging transactions, genuine Flutterwave sandbox settlement, shipping-rate quotation, auction payout, streaming transport, real device, email receipt and rollbacks remain BLOCKED or NOT TESTED, as detailed above.
