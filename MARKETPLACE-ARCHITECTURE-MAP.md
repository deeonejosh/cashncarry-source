# MARKETPLACE ARCHITECTURE MAP — Cash N Carry Nigeria
**Audit:** 18 November 2026 (UTC) • **Environment:** PRIVATE Cloudflare staging ONLY
**Source repository:** https://github.com/deeonejosh/cashncarry-source
**Working branch:** `fix/staging-master-marketplace-20261118`
**Production:** https://www.cashncarryng.com — OUT OF SCOPE, NOT MODIFIED
**Staging:** https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/
**Verified active Worker:** **v55**, `1e6cacd4-765b-4b10-9a98-82efe80ef5de`, 100% traffic, deployment `4e5105a8-0f4f-4276-98e7-59d4ce5f6afe`, 2026-11-18 06:11:34 UTC. **Previous rollback version:** v54 `a1133ace-90c5-424c-af47-f514fca72dca`.
**Active backend release source:** `a40ec1fc2b6f41bdd262b0e3cdb1705bca6e8568` from this master repair branch. Immutable compiled backend artifact: `artifact/staging-master-v55-20261118`. Existing v54 frontend, stage entrypoint and 14 bindings preserved. The missing 0013 migration was source-only and not replayed against staging D1.
**Baseline tests:** 24 passes, 0 failures, [run 44194889147](https://github.com/deeonejosh/cashncarry-source/actions/runs/44194889147). Tests are isolated Miniflare/D1 and static checks—not real authenticated staging browser acceptance.

## 1. Actual system boundary

```text
React 19 + TypeScript / Vite 8 client (web/src)
  |-- Buyer: shop, products, addresses, cart, checkout, orders, videos
  |-- Seller: application, products, storefront, auctions, livestream UI, fulfilment
  |-- Owner: admin dashboard, seller applications, product moderation, email marketing
  +--> HTTPS /api/* (Cloudflare Worker)
        |-- new-auth.ts / owner-setup.ts / auth-email.ts
        |-- seller-application.ts / admin.ts / marketplace.ts
        |-- orders.ts / flutterwave.ts / reservation-expiry.ts
        |-- auctions.ts / coins.ts / unified-sync.ts / stream.ts / kyc.ts
        |-- catalog.ts / newsletter.ts / edge-seo.ts
        +--> D1: AUTH_DB + DB (staging database)
        +--> KV: CNC_STAGING_ASSETS (staging compiled frontend assets)
        +--> Resend: AUTH_RESEND_API_KEY (credential binding, delivery not tested)
        +--> Flutterwave: sandbox integration in source, disabled in staging
        +--> Cloudflare Stream / WHIP / WHEP: source adapters, NO configured media binding
        +--> R2 private KYC documents: required binding missing; uploads disabled

Android native source (app/src/main/java/com/example)
  +--> Kotlin / Jetpack Compose screens + CloudflareSyncRepository
  +--> API bearer-session authentication, device build workflow
  +--> Physical Samsung/Android E2E NOT TESTED
```

There is no verified Google OAuth provider configuration or demonstrated real provider test. Never treat an installed UI element as working infrastructure.

## 2. Discovered React SPA tab routes (26)

Buyer-facing: `home`, `shop`, `product-detail`, `for-you`, `storefront`, `live`, `auctions`, `coins`, `flash-deals`, `wishlist`, `checkout`, `checkout-complete`, `orders`, `profile`, `shipments`, `messages`, `notifications`, `returns`, `policies`.

Seller Centre: `seller-dashboard`, `seller-products`, `seller-orders`, `seller-settlements`; seller onboarding: `seller-kyc`.

Admin Console: `admin-dashboard`, `email-marketing`.

**Important:** These are `currentTab` React views controlled by query parameters and local navigation, not necessarily distinct server URL paths. Any Admin Console capability not in this list is **not demonstrated to exist as a separate UI route**. Do not invent the 60+ proposed screens.

## 3. Server API inventory

**Auth:** `/api/auth/*` (register, login, verify, reset, logout, me, MFA/admin login, setup).
**Onboarding:** `/api/seller/application`, `/api/admin/seller-applications`, `/api/admin/seller-applications/review`, `/api/sellers/kyc`.
**Seller catalog:** `/api/seller/store`, `/api/seller/products`, `/api/admin/moderation`.
**Buyer catalog/cart:** `/api/categories`, `/api/products`, `/api/storefronts`, `/api/cart`.
**Orders:** `/api/checkout`, `/api/orders`, `/api/orders/cancel`, `/api/v1/seller/orders`, `/api/v1/seller/orders/fulfil`.
**Payments:** `/api/payments/initialize`, `/api/payments/status`, `/api/payments/webhooks/flutterwave`.
**Auctions/gifting:** `/api/auctions`, `/api/coins`.
**Mobile/social:** `/api/v1/profile`, `/api/v1/addresses`, `/api/v1/wishlist`, `/api/v1/follows`, `/api/v1/messages`, `/api/v1/notifications`, `/api/v1/videos`, `/api/v1/videos/like`, `/api/v1/videos/comments`, `/api/v1/live`, `/api/v1/live/comments`, `/api/v1/reviews`.
**Broadcast adapter:** `/api/live/cloudflare/publish`, `/api/live/cloudflare/play`.
**Admin and operations:** `/api/admin/overview`, `/api/health`, `/api/staging-config`; separate newsletter routes.
`/api/v1/*` normalisation is performed by Worker for most non-admin paths; test the actual route handler before relying on an alias.

## 4. Discovered D1 state

Remote D1 read-only inspection: 44 tables, including `cnc_auth_users`, `cnc_auth_sessions`, `cnc_auth_audit`, `cnc_seller_applications`, `cnc_seller_application_events`, `cnc_seller_stores`, `cnc_seller_products`, public `stores` and `products`, `cnc_buyer_cart`, `cnc_buyer_addresses`, `cnc_orders`, `cnc_order_items`, `cnc_flutterwave_payments`, `cnc_order_fulfilments`, `cnc_seller_fulfilments`, `cnc_auctions`, `cnc_bids`, `cnc_coin_ledger`, `cnc_gifts`, `cnc_live_rooms`, `cnc_live_room_state`, `cnc_live_comments`, `cnc_notifications`, `cnc_kyc_submissions`, `cnc_short_videos`, messages and profiles.

At audit: 1 auth account; zero seller applications, seller stores, public stores, seller products, public products, orders or auctions in the actual private staging D1. This is **not** a substitute for fresh real buyer/seller sessions. No fixture was inserted into remote D1.

**Applied migration history:** Remote `d1_migrations` includes `0013_payment_state_new_db_only.sql`, `0014_seller_fulfilment.sql`, `0015_seller_product_metadata.sql`, `0016_marketplace_messages.sql`, `0017_unified_mobile_sync.sql` and earlier. Source previously omitted 0013–0016; the 0013 payment-state DDL was restored on this branch **for isolated clean databases**, not for reapplication to the existing D1. 0014–0016 are a remaining source-history reconciliation task. Many 0018–0020 schema objects exist remotely, but ledger entries may not reflect manual applications; never bulk-run these files against populated remote D1.

**Pending migration review:** `0021` reasserts existing wallet/auction safety triggers; `0022` adds approved-application enforcement to the auction-create trigger; `0023` reconciles public store/product records when an existing private store is approved or suspended. Validate exact schema and take a restore-capable backup before applying. Do not replay `0020` ALTER statements into pre-existing columns.

**Backup evidence:** A full Cloudflare D1 SQL export job completed on 2026-11-18 using bookmark `000000a7-00000000-00005127-e507ad86aad22748fc1124e0f1a10533`. Its download URL is time-limited. The current D1 time-travel bookmark was also captured; no durable separately verified offsite backup has yet been established. Therefore migrations are NOT approved for remote execution solely on the basis of an export job completion.

## 5. Critical workflow dependencies and blockers

```text
Seller: buyer role -> verified email -> application -> owner MFA review
  -> role seller, session revoked -> fresh sign-in
  -> private store -> public store sync -> product draft
  -> moderation -> public product

Standard sale: published product -> buyer cart (replacement source)
  -> saved address -> order reservation / inventory decrement once
  -> Flutterwave TEST initialize -> signed webhook AND provider verify
  -> payment proof trigger -> paid order -> seller-visible fulfilment
  -> buyer notification -> tracking -> reconciliation

Auction: approved seller + published stock -> D1 reserves 1
  -> bids + minimum increment -> deterministic winner -> auction close
  -> [BLOCKED: auction-specific payable order and shipping quote]
  -> [BLOCKED: sandbox payment / fulfilment]
  Winner checkout intentionally fails closed.

Livestream: approved seller -> camera permission -> genuine WHIP publish
  -> confirmed media handshake -> genuine WHEP playback
  -> chat/pins/reactions -> checkout -> end/cleanup
  [BLOCKED: WHIP/WHEP and/or real media transport not provisioned]
  No fake 'live' status is acceptable.

Gifting: buyer balance + host identity -> validated gift
  -> single idempotent debit + immutable ledger entry
  -> [BLOCKED: genuine realtime animation transport]
  Paid coin top-ups remain disabled.
```

**Verified critical defect (branch repair pending CI):** `unified-sync.ts` previously exposed orders (including buyer delivery addresses) before payment and allowed seller fulfilment updates without checking payment proof. It also used `cnc_order_fulfilments` keyed only by `order_id`, so different sellers could overwrite a combined order's fulfilment status. The branch repairs gate visibility and updates on approved seller, verified payment and single-seller ownership, rejects backwards status transitions and idempotently handles duplicate submissions. Mixed-seller fulfilment is explicitly blocked until a safe per-seller schema/flow is implemented.

## 6. Measurable acceptance boundaries

- Existing baseline: 24 isolated tests passed, no real buyer/seller/browser checkout proof.
- New branch adds an isolated order/fulfilment regression (payment proof is simulated **at D1 fixture level only**).
- Actual Resend delivery, Flutterwave TEST payment callbacks, live video, physical Android hardware and authenticated Cloudflare Access E2E remain **NOT TESTED** or **BLOCKED**.
- No production resources touched.
- Final readiness requires connected staging credentials and provider/test fixtures; CI green alone cannot close the P0 payment, multivendor fulfilment or video gates.

## 7. Verified backend-only staging v55 rollout — 18 Nov 2026

- Source CI: [run 44249294268](https://github.com/deeonejosh/cashncarry-source/actions/runs/44249294268): **25 PASS, 0 FAIL**, TypeScript, Vite build, UI static audit and bundled Worker all passed.
- Artifact packaging: [run 44249294425](https://github.com/deeonejosh/cashncarry-source/actions/runs/44249294425): successful, backend bundle SHA-256 `394a0f96ede67344b7f77b72e86e95a59983024c3ca9fa651deb6cb1661e089e`, no production deployment.
- Cloudflare version `1e6cacd4-765b-4b10-9a98-82efe80ef5de` uploaded with **strict inheritance of all 14 bindings**, preserving previous stage entry, v54 static manifest and financial switches.
- Deployed at 100% via deployment `4e5105a8-0f4f-4276-98e7-59d4ce5f6afe`, verified through fresh Cloudflare readback.
- Active backend contains `FULFILMENT_NOT_READY`, `FULFILMENT_TRANSITION_REJECTED`, `COIN_CREDIT_NOT_AUTHORIZED`, `AUCTION_SETTLEMENT_NOT_CONFIGURED`, `BROADCAST_NOT_CONFIGURED`, `BUYER_ADDRESS_REQUIRED`.
- Post-deployment staging D1 read-only counts: one existing auth account; **0** seller applications, stores, products, orders, auctions, gifts, live room states or fulfilments. No staging SQL migrations applied or real test customers created.
- Current real-money configuration: `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `FLW_MODE=disabled`, `KYC_UPLOADS_ENABLED=false`.
- This is a **safety-only backend patch**, not proof of functioning real buyer/seller checkout, multi-seller shipping or live video. No Access-authenticated browser acceptance was performed. Production unchanged.
