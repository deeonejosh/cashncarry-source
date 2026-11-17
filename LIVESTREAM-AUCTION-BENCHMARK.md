# LIVESTREAM–AUCTION BENCHMARK — Cash N Carry Nigeria

**Audit date:** 17 November 2026 (UTC)  
**Priority:** P0  
**Source branch:** `fix/staging-livestream-auction-20261117`  
**Tested repair commit:** `88581a022cdf2bd264c85e554e12d3ca23391e17`  
**CI evidence:** https://github.com/deeonejosh/cashncarry-source/actions/runs/44186705250  
**Private staging URL:** https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/  
**Release decision:** **NO DEPLOY — unresolved P0 auction winner settlement and unconfigured live media.**  
**Production:** **UNCHANGED.** The existing private staging Worker remains version **53**, ID `e4a8d185-5726-4b6e-9733-372265a8b44e`, at 100% traffic. No production or private staging database writes were performed by this audit.

## Executive findings

The actual React/TypeScript frontend, Cloudflare Worker handlers, existing isolated D1 schema and GitHub CI were inspected. Previous implementation was not a complete livestream shopping platform. It had D1 live-room records and a client EventSource request without a matching stream endpoint, but no verified media publishing session or authoritative presence service. Cloudflare settings do not expose configured Stream WHIP/WHEP or other media bindings. The Android app was not built or tested.

Auction creation and closure redundantly updated stock on top of existing D1 reservation/release triggers. Bids used a separate conditional highest-bid update even though D1 already had atomic bid-validation and bid-update triggers. Coin gifting performed a preflight balance check before a transactional debit; the D1 overdraft trigger existed but the code did not properly treat it as authoritative. Unverified direct coin credits could be requested when purchase flags were enabled. Winner order creation attempted to insert into `cnc_orders`, where the existing trigger expects a cart, so that is not a safe auction checkout. Moreover, payments and coin purchases are deliberately disabled in staging. These are root causes or code-level risks; no real financial loss is inferred.

## 1. Actual architecture and route inventory

| Layer | Inspected implementation | Verified state |
|---|---|---|
| Buyer web screens | React `?tab=live`, `auctions`, `coins`, `for-you`, `checkout`, `orders` | Source located; static build passed; no private authenticated click-through |
| Seller web | Seller Centre, seller products, seller dashboard, create-auction UI, live room UI | Source located; seller and product role rules locally tested; no camera |
| Admin | Admin Console seller approval and moderation endpoints; application review | Prior isolated admin tests plus this CI; no hosted owner MFA E2E |
| Android | Kotlin Compose `LiveHubScreen`, `LivePlayerScreen`, `LiveAuctionCard`, `SellerCentreScreen` | Source inventoried, native APK/device tests blocked by incomplete Gradle project |
| Live routes | `GET/POST/PATCH /api/v1/live`, `GET/POST /api/v1/live/comments` | D1 room and comment state; no operational media handshake |
| Livestream media | `POST /api/live/cloudflare/publish`, `GET /api/live/cloudflare/play` | Endpoint guards in `stream.ts`; no configured provider bindings |
| Real-time delivery | Browser attempted `/api/v1/live/:roomId/events` | No matching server SSE endpoint; repaired UI uses 5-second D1 comment polling, **not WebSocket/SSE real-time guarantees** |
| Product pinning | `PATCH /api/v1/live` with `action=pin` | New seller-owned/published/in-stock check; no genuine room E2E |
| Auction APIs | `GET/POST/PATCH /api/auctions` | D1 transaction/trigger-based creation, bidding and closing verified in isolated tests |
| Gifting | `GET/POST /api/coins`, `cnc_coin_ledger`, `cnc_gifts` | Atomic ledger and replay tests verified locally; real funding, animation and multi-viewer delivery blocked |
| Order/payment | `/api/checkout`, `/api/orders`, `/api/payments/initialize`, `/api/payments/status`, Flutterwave webhook | Cart order path exists; auction order path is **not ready**. Real/sandbox payments disabled |
| D1 schema | `cnc_auctions`, `cnc_bids`, `cnc_seller_products`, `cnc_coin_ledger`, `cnc_gifts`, `cnc_live_room_state`, `cnc_live_comments`, `cnc_orders`, `cnc_order_items` | Existing schema and 7 critical trigger definitions inspected read-only |

The D1 database contains both `cnc_live_rooms` and `cnc_live_room_state`; the audited web routes use `cnc_live_room_state`. This legacy split must be reconciled before claiming a unified stream lifecycle. No verified WebRTC media transport, cross-client low-latency event bus, viewer session table, gift animation fan-out or bid event streaming was found.

**Cloudflare safety state:** `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `KYC_UPLOADS_ENABLED=false`, `FLW_MODE=disabled`. `AUTH_DB` and `DB` are the private staging D1 UUID `9a2cdbee-e030-4b10-908b-b10b8142d2aa`. Admin MFA and Resend secret bindings are preserved and were not read. Aggregate counts for auctions, bids, gifts, live rooms, and live comments were each **zero** at the read-only verification. No sample customer records were inserted into this D1.

## 2. Seller and buyer livestream workflows

**Seller:** Authenticated seller → seller approval → camera permission → publish media handshake → live room becomes visible → product pin/interaction → end → camera/audio release. **Actual status:** D1 role gates exist; no verified media provider/handshake or camera permission test. Previously D1 would mark a room live without actual broadcast. The repair refuses to create fake live rooms until real transport and stream readiness can be established. Full Android, camera switch, mute/unmute, reconnection and end-resource cleanup are **BLOCKED**.

**Buyer:** Discover live → select room → connect to verified media → comments → pinned eligible product → cart → checkout. **Actual status:** catalog and D1 routes inspected; no media playback. Room state is not a count of unique viewers. The repair stops manufacturing viewer counts on refresh and discloses unavailable streaming; chat uses bounded polling. Playable video, authenticated two-user stream, viewer count, and successful pinned-product purchase are **BLOCKED / NOT TESTED**.

**Chat:** `GET/POST /api/v1/live/comments` stores messages in D1. The UI formerly requested an unimplemented SSE route and the wrong camelCase query argument. The repair aligns query parameters, polls actual comments every five seconds, uses saved display names (generic fallback rather than email prefixes), rejects repeated identical messages and throttles to five messages per user per room per ten-second window. Muted/banned account controls and an administrator moderation queue for chat **do not yet exist**, so complete chat abuse compliance is **NOT VERIFIED**.

**Product pinning:** The source now requires an owner-only host operation against a currently live room and a published, unarchived, in-stock product owned by that seller; clearing a pin is allowed. No live cross-device delivery or checkout transaction test was possible without a media session and sellable order inventory. Avoid a second checkout.

## 3. Auction and payment state maps

**Auction:** Approved seller → choose published in-stock product → create auction → D1 trigger reserves **one** stock unit → buyers place server-validated bids → D1 bid trigger atomically updates highest bidder → seller closes at/after end → unsold stock returned by D1 trigger **once**. The code no longer duplicates any of these trigger-owned stock or bid updates. Concurrent valid/stale bids and double close are covered by isolated tests. This still lacks an automated end-time closing scheduler and bidder event fan-out; end-to-end production readiness is **BLOCKED**.

**Winner payment:** Auction ends → winner confirmed → dedicated auction order/stock reservation → buyer address and verified shipping quote → Pay Now → Flutterwave sandbox redirect → verified webhook → payment reconciliation → seller fulfilment. **P0 BLOCKED.** Existing `cnc_orders` is a cart-first order type with an `AFTER INSERT` trigger that assumes a cart. A winning auction is not a cart. The pre-existing winner checkout code attempted that incompatible insert. The new implementation fails closed with `AUCTION_SETTLEMENT_NOT_CONFIGURED` rather than creating a potentially incorrect order. The nonfunctional generic Orders/checkout handoff was removed from auction cards. **No live or test payment has been created, verified or marked successful.** A dedicated auction order state machine, idempotent settlement, winning-bid fees, saved delivery address/consent, shipping quote and confirmed provider webhooks must be built and tested before activation.

**Gifts:** Valid existing promotional balance → gift request with stable request ID → atomic gift/debit/credit transaction guarded by D1's overdraft trigger → replay returns existing gift without new debit. Direct client-authorised coin minting is blocked, even if purchase flags are later switched on. The isolated test verifies a 100-coin gift, duplicate replay, insufficient-balance rejection and final nonnegative balance. There is no claim of real livestream gifting animation, purchase processing or cross-device gift event synchronisation.

## 4. Verified defects and repairs

| Severity | Baseline defect | Source repair | Evidence |
|---|---|---|---|
| P0 | Stock double-decrement on auction creation and double-restoration on empty closure | Depend exclusively on D1 auction reservation and no-bid closure triggers | Miniflare/D1 exact stock tests |
| P0 | Bid row could be inserted despite losing the competing highest-bid update | Single atomic `cnc_bids` insertion validated and applied by DB triggers; reject stale bids as 409 | Concurrent/duplicate bid assertions |
| P0 | Gift debit preceded by nonauthoritative balance read; replay may fail at zero balance | Idempotency first, atomic batch with D1 overdraft guard, explicit 409 on insufficient balance | Gift ledger test |
| P0 | Direct user coin credits when purchase feature enabled | Block unverifiable direct credits | API guard test |
| P0 | Auction checkout insertion incompatible with cart-order trigger and unquoted shipping | Fail closed and remove misleading Pay Now/general Orders redirect | Disabled checkout and no generated order test |
| P1 | UI sent `durationHours` while API expected `durationMinutes` | Support both on server; client sends minutes | Auction creation test in both formats |
| P1 | Auction feed selected nonexistent `p.image_url` column | Select actual D1 `p.image` as alias; supply frontend seller/product identifiers and counts | Isolated GET feed assertion |
| P1 | Livestream became 'live' merely by inserting a D1 record | Refuse broadcast creation before verified media handshake | No fake room created test |
| P1 | Arbitrary client-supplied video URL accepted as uploaded media | Fail closed until verified media upload service is ready | No fake video created test |
| P1 | Pinning ignored seller ownership/stock/room status | Seller-own verified product and active room update checks | Code review; hosted pin E2E blocked |
| P1 | Client EventSource pointed to nonexistent SSE route; live-comment query used wrong parameter | Five-second polling, compatible parameter names, throttled duplicate chat | Isolated D1 API chat test |
| P2 | Fake viewer counter increments on every join, including refresh | Stop increments and report unverified presence | Isolated API test |
| P2 | Misleading UI copy, long fixed-size chat and unsupported auction payment button | Clearer unavailable states, mobile chat safe-area spacing, remove generic checkout handoff | TypeScript/build/static audit only |

A new file `web/deploy/chatgpt-sites/migrations/0021_auction_wallet_integrity_contract.sql` codifies the **already existing** safety triggers for fresh isolated CI databases. **It was NOT applied to the populated Cloudflare staging D1.** The historical migration tracking gap (0011–0016) must be reconciled and a verified backup prepared before any remote migrations.

## 5. Reproducible testing

**Latest green run:** https://github.com/deeonejosh/cashncarry-source/actions/runs/44186705250

- GitHub Actions: Node 22 `npm ci` → TypeScript `npm run lint` → 24 isolated Miniflare/D1 tests → production `npm run build` → static frontend UI audit. **24 tests passed; 0 failed.** Build and audit passed.
- Dedicated test fixtures exist only inside temporary CI D1, not populated Cloudflare staging.
- Auction test: seller creation, one-unit stock reservation, no own bid, stale duplicate rejection, two competing HTTP bids, persisted highest-bid consistency, early-close rejection, idempotent close, one-time unsold stock release, payment fail-closed.
- Gift test: fake isolated 100-coin fixture, gift debit, replay once, insufficient balance, forbidden credit, aggregate ledger consistency.
- Live test: unconfigured stream/video fail-closed, no phantom room, manual isolated chat room, comment, duplicate throttle, GET room ID compatibility, no fabricated presence.
- Payment webhook work tested only as **disabled** or through existing HMAC unit assertions; no external Flutterwave sandbox payment executed.
- No valid measurements exist for actual stream startup, bid propagation between browsers, reconnect, peak viewer load, memory leaks or end-to-end payment latency. **Do not report performance metrics.**
- No authenticated Cloudflare Access browser session or native Android device was available. **No authenticated mobile screenshots are claimed or attached.**

## 6. Evidence-based scores (out of 100)

These are **conservative assurance-coverage points, NOT product quality or functional completeness ratings**. The requested weighted categories are preserved (Workflow 25, Real-time 20, Backend/Data 20, Security 15, UI/Mobile 10, Performance 10). A category receives points only for source/build or isolated D1 behaviours actually exercised. Unavailable actual media, payment and performance checks receive zero. **Before scores are not available** because no reproducible pre-repair live E2E run was completed. This is preferable to inventing a before/after performance improvement.

| System | Workflow /25 | Real-time /20 | Backend /20 | Security /15 | UI/Mobile /10 | Performance /10 | After evidence /100 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Seller Livestream | 0 | 0 | 5 | 5 | 3 | 0 | **13** |
| Buyer Livestream | 0 | 0 | 5 | 0 | 3 | 0 | **8** |
| Live Chat | 6 | 0 | 10 | 6 | 3 | 0 | **25** |
| Product Pinning | 0 | 0 | 5 | 5 | 3 | 0 | **13** |
| Auctions and Bidding | 12 | 0 | 16 | 10 | 3 | 0 | **41** |
| Auction Winner Payments | 0 | 0 | 6 | 8 | 3 | 0 | **17** |
| Gifting | 10 | 0 | 16 | 11 | 3 | 0 | **40** |

**Before-after evidence:** Before = code defects reproduced/identified and pre-existing tests of disabled state only; numerical before = **N/A (not measured)**. After = checked isolated API results and static UI build above; authenticated deployment E2E = **not measured**. These after scores will change when actual private logged-in workflows and media/payout providers can be exercised.

## 7. Changed files

- `web/deploy/chatgpt-sites/auctions.ts`
- `web/deploy/chatgpt-sites/coins.ts`
- `web/deploy/chatgpt-sites/unified-sync.ts`
- `web/deploy/chatgpt-sites/migrations/0021_auction_wallet_integrity_contract.sql` (isolated test schema contract only)
- `web/src/lib/api.ts`
- `web/src/components/pages/LiveShoppingPage.tsx`
- `web/src/components/pages/AuctionsPage.tsx`
- `web/src/components/ui/LiveAuctionCard.tsx`
- `web/src/components/pages/HomePage.tsx`
- `web/src/App.tsx`
- `web/scripts/run-automated-tests.ts`
- `.github/workflows/benchmark-live-auction.yml`

## 8. Open blockers and deployment decision

**P0 release gate remains CLOSED**: (1) no completed, supported and quoted auction winner payment/order flow; (2) no verified authenticated Stream media publish/playback, reconnect and recording; (3) no authenticated multi-user buyer/seller browser tests or full end-to-end payment tests. Important P1/P2 gaps also remain: live viewer presence, bid/chat event fan-out, end-time scheduling, gifting animation, moderation, upload pipeline and mobile camera screens. A real provider and consented staging accounts are required to test these correctly. We did **not** switch on real payments or issue virtual paid orders.

**Action completed:** A dedicated repair branch was created, 13 source/test/CI files changed, code committed and 24 isolated regressions plus frontend checks passed. **No Worker version was deployed and no D1 mutation or migration was executed on the private staging environment**, per the explicit instruction not to deploy with unresolved P0 defects. The prior private staging deployment **v53** is unchanged, and production is untouched.

**Next release criteria:** Confirm actual media provider/credentials and camera test devices; implement a dedicated auction-order reservation mechanism and confirmed shipping fees without reusing the cart trigger; implement idempotent payment reconciliation and end-time settlement; verify isolated browser accounts and D1 backups; perform multi-session auth, chat, bid and checkout acceptance; then deploy tested repair code as a new private Worker version while preserving all 14 existing secret/database bindings and rollback.

**No fake features, payment success, viewer counts or staging deployment claims.**


## 9. Follow-up regression and live-shopping checkout repair — 17 November 2026, 22:07 UTC

**Latest clean CI:** [GitHub Actions #44186705250](https://github.com/deeonejosh/cashncarry-source/actions/runs/44186705250); **24 of 24 isolated backend tests passing**, TypeScript lint, production Vite build, and static frontend audit successful. Tested source commit `88581a022cdf2bd264c85e554e12d3ca23391e17`.

This follow-up verifies additional pinning and audience-presence controls using isolated Miniflare D1 records, without touching existing staging data. New assertions prove a buyer cannot pin a seller product; unknown products cannot be pinned; an active host can pin and unpin their own published product; ended rooms cannot be pinned or joined; repeated joins do not artificially increment persisted viewers.

Frontend improvements correct an actual workflow break: the pinned-product **Buy Now** action used to open checkout even when authentication or the cart API had failed. The `StoreContext.addToCart` function now returns a success flag; `LiveShoppingPage` only proceeds to checkout on an accepted backend cart mutation. Failed product pinning and stream-ending operations now provide visible error messages, and chat display names use the backend's `author_name` field rather than falling back to generic identities when a verified name exists.

Additional changed files: `web/src/context/StoreContext.tsx` (cart success contract and comment author mapping). The existing live page and test file were further updated. No remote staging deployment, database migrations, production changes, payment activation, media provider configuration, genuine browser screenshots or authenticated end-to-end checks occurred.

**Release decision remains NO DEPLOY:** a fully implemented and verified winner-payment/shipping state machine and actual livestream media transport are still missing. This report describes validated code and temporary test D1 only. The previously deployed private staging Worker v53 remains the accessible baseline; do not mistake the new GitHub branch for deployed code.

## 10. Further P0 seller-authorisation and one-time delivery setup review — 17 November 2026

**Verified approved-seller repair:** A seller role by itself did not demonstrate that Admin Console had approved the seller application. The auction POST handler now checks `cnc_seller_applications.status='approved'` with verified/non-suspended account state. Isolated migration `0022_auction_seller_approval.sql` adds the same rule inside the D1 creation trigger. The regression exercises a rejected application (403, no stock reservation) and reapproval.

**Verified approval-order foreign-key repair:** The isolated test reproduced a 503/foreign-key failure when a private `cnc_seller_stores` record was created before the admin approved that seller. On subsequent auction stock reservation, the product publication trigger attempted to write a public product referencing an absent public `stores` row. Isolated migration `0023_approved_seller_public_store_sync.sql` reconciles public storefront and published products on approval and hides public listings on withdrawal. Its execution and downstream auction creation passed in the temporary Miniflare database. [CI proof](https://github.com/deeonejosh/cashncarry-source/actions/runs/44191528969): TypeScript, isolated tests, and frontend build completed successfully. Neither migration has been applied to remote Cloudflare D1.

**First-time auction shipping:** Bid submission now requires at least one stored buyer-owned delivery address, returning `BUYER_ADDRESS_REQUIRED` when none exists. The React auction modal sends the user to the existing Profile delivery-address form, which opens directly and can be reused across bids. The isolated test checks initial rejection and subsequent successful bidding with one persisted address. **This is not payment-method tokenization or a final shipping-fee quote**. A winner checkout must still obtain a real fee quote and payment confirmation.

**Current source checkout:** `fix/staging-livestream-auction-20261117`. Additional source edits after the seller-approval CI proof were submitted to [GitHub Actions](https://github.com/deeonejosh/cashncarry-source/actions?query=branch%3Afix%2Fstaging-livestream-auction-20261117), but this section does not claim their run is green until confirmed. No authenticated multi-account browser screenshots, WebRTC transport, provider streaming credentials or Flutterwave sandbox payments were supplied or claimed.

**Release gate remains CLOSED; private staging stays v53, production untouched.** Remote D1 remains unchanged and financial flags remain off. No real payment, order, stream or user account was created as part of these CI fixtures.
