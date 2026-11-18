# Cash N Carry Nigeria — Private staging v65 inventory approval repair

**Verified 18 November 2026 UTC.** Only existing Cloudflare private staging. No production DNS, production Worker, live payments, Access allow policy or paid services modified.

## Why this change was needed

On the deployed v64 source, the seller product update route in `web/deploy/chatgpt-sites/marketplace.ts` unconditionally assigned `publication='draft'` for *every* product edit, including changes only to the `stock` field. This removed already-approved listings from the public shop and required a second approval for ordinary inventory restocks.

The regression was reproduced using disposable Miniflare identities and D1. [Expected-failing CI 44365642303](https://github.com/deeonejosh/cashncarry-source/actions/runs/44365642303): `stock-only edit must preserve initial publication approval`.

## Verified v65 repair

The update is atomic and optimistic-concurrency guarded by `id`, `owner`, `revision`, `archived=0`. It preserves `published` for an inventory-only update **only if** the title, price, category, description, image URL, brand and compare-at price are unchanged. Any material change still returns to draft for admin re-review; new products still require initial approval. Database triggers automatically propagate changed stock to the public catalog.

Changes on feature branch `fix/v65-inventory-approval-staging-20261118`:
- `web/deploy/chatgpt-sites/marketplace.ts` — fix.
- `web/scripts/v58-marketplace-e2e.mjs` — verified that stock 5 → 8 → 5 preserves approval, that published buyer-catalog stock updates, and that a price change returns the product to draft and requires owner reapproval.
- `web/src/components/pages/seller/SellerProductsPage.tsx` — seller-facing policy explanation **committed only, not deployed**.
- `web/src/context/StoreContext.tsx` — in-app shop refresh after seller product update **committed only, not deployed**.
- `.github/workflows/v65-staging-inventory-approval-qa.yml` — source build, TypeScript, existing tests, isolated cross-role E2E, immutable packaging; no automatic Cloudflare deployment.

**Isolated QA PASS**: [GitHub Actions 44366957843](https://github.com/deeonejosh/cashncarry-source/actions/runs/44366957843). Prior red test confirms the bug; green rerun verifies the fix and the continued moderation gate.

## Cloudflare verified deployment

- Starting live private staging: v64 version `4b3b1e5f-fc51-41f9-a65e-9004b60316d9` at 100%, commit `e729cbece1af8f34c5c3315dff6f23241eeed105` (seller photo editor).
- Immutable source bundle from feature commit `cf37f2f52377fec517ec5877d228ab99d58c3f91`, artifact branch `artifact/staging-v65-inventory-approval-20261118`.
- Bundled backend SHA-256 `1e2e06215c1ac1037f4213bae80bfd6bdf517616c9f961b3ec85f16a35c20405`.
- New Worker version: `4f4c035b-d7a6-464c-a029-ecc03ba98df9` (v65).
- Active deployment: `e1a824fe-9053-4a39-a1ec-a8913930cbe1`; deployed **2026-11-18T18:13:15.944148Z**, 100%.
- Existing v64 `entry.mjs` unchanged, retaining `cnc:e729cbec:ui:*` KV asset keys, including the seller photo editor and working asset paths.
- All **14** bindings inherited and verified. `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `KYC_UPLOADS_ENABLED=false`, `FLW_MODE=disabled`.
- Staging D1 `9a2cdbee-e030-4b10-908b-b10b8142d2aa`: 26 migrations, `PRAGMA quick_check=ok`, no FK errors. Two account records, two seller product records, zero orders at readback. Existing user/product data not edited. No remote staging accounts, products, orders or orders were created by the test suite.
- Rollback: restore the previous v64 **Worker version only** `4b3b1e5f-fc51-41f9-a65e-9004b60316d9` at 100% if necessary. This rollback reintroduces the stock reapproval defect; do not roll back D1 or KV.
- No authenticated browser testing or owner MFA session was claimed. Cloudflare Access is intentionally enforced.

## Source-level page inventory and remaining QA

`web/src/App.tsx` contains **26** existing page tabs:

Buyer/public: `for-you`, `home`, `shop`, `product-detail`, `checkout`, `checkout-complete`, `orders`, `profile`, `live`, `auctions`, `coins`, `flash-deals`, `wishlist`, `shipments`, `messages`, `notifications`, `returns`, `storefront`, `policies`.

Seller: `seller-dashboard`, `seller-products`, `seller-orders`, `seller-kyc`, `seller-settlements`.

Owner admin: `admin-dashboard`, `email-marketing`.

This is a **static route inventory**, not a screenshot/visual/button audit. Authenticated browser, navigation, accessibility and mobile viewport acceptance remain blocked until the owner signs into the Cloud Browser in Work mode and authorised buyer/seller sessions are available.

## Media and support infrastructure findings

- Connected account has **0 R2 buckets** on direct API listing. The current product photo endpoint `web/deploy/chatgpt-sites/product-photos.ts` uses D1 BLOB storage with a 512 KiB photo cap, owner constraints and public access only for approved/published listings; not R2. No bucket created.
- The account currently lists **33 existing Cloudflare Stream live inputs**. No staging-only ownership/WHIP/WHEP provider binding verified; do not expose or reuse their publish URLs. The current `web/deploy/chatgpt-sites/stream.ts` expects `STREAM_SELLER_ID`, `STREAM_WHIP_URL`, `STREAM_WHEP_URL`, which are absent from v65 staging Worker bindings. No real browser playback or broadcast tested.
- **Compatible transport candidate:** Cloudflare Stream Live WebRTC WHIP/WHEP; it supports browser ingest and playback, but usage-based delivery billing began 15 October 2026. [Cloudflare GA notice](https://developers.cloudflare.com/changelog/post/2026-10-15-stream-live-webrtc-ga/). Alternative LiveKit free Build plan should be evaluated separately for test-only limits. No paid provider provisioned.
- `messages` currently exists as a buyer/seller page, but no newly implemented unified administrator support ticket inbox or AI provider was deployed in v65. The proposed support feature needs authenticated role-specific browser tests, an audited D1 migration/backup plan, order lookup scope, human escalation and explicit AI provider/billing approval before activation.

**Release status:** inventory approval bug fixed and deployed to existing private staging. Not full-marketplace ready; other requested browser and provider features still open.
