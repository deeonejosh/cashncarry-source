# Cash N Carry Android — Staging Audit (15 Nov 2026)

**Verdict: NOT production-ready.** Verified by examining the Android source ZIP actually used by staging GitHub Actions, the staging Worker API schemas, screenshots provided by the tester, and read-only staging D1 counts. No production code/data modified.

## Critical blockers (P0)
1. **Catalog fields mismatch.** Worker `/api/products` returns `name, store, price, image` but Android reads `title, seller_id, price_naira, image_key` and can display generic “Marketplace Item” and ₦100 (see `app/.../CloudflareSyncRepository.kt:316-342`, `web/.../catalog.ts:21-30`).
2. **Automatically invented verified seller/products.** `MarketplaceViewModel.kt:138-143` calls `bootstrapInitialMarketplaceCatalog`; `CatalogRepository.kt:517+` makes fake verified shop, ratings and listings in real signed-in sessions.
3. **Artificial live rooms and auctions.** `LiveCommerceRepository.kt:25-35,480-569` seeds “live” rooms (with viewer counts) and an auction; empty server results do not clear those seeds. Read-only staging D1 check: 0 live rooms, 0 auctions.
4. **No actual live video playback/publishing.** `LivePlayerScreen.kt:184-196` shows a still image; `BroadcastStudioScreen.kt:150-185` binds CameraX preview, without streaming encoder/publisher/player.
5. **Seller edits never persist.** `CatalogRepository.kt:417-507` stores seller profile/listings only in `MutableStateFlow` and reports success; Worker has server endpoints `/api/seller/store`, `/api/seller/products` that Android does not use.
6. **Seller cannot buy through the current API.** Worker `marketplace.ts:28-32` restricts `/api/cart` to `buyer`; `orders.ts:10-14` does likewise, but app offers cart/order screens to seller accounts.
7. **Cart can lie about persistence.** `CatalogRepository.kt:253-307` mutates cart locally first, ignores backend failures, and defaults to source `replacement` although the exposed catalog reads legacy products; remote requests may fail silently.

## High-priority defects (P1)
8. `GET /api/storefronts` list is called by Android but specifically unsupported by Worker (`worker.ts:185-207`).
9. Wishlist and follows response keys mismatch: Android expects `items`/`sellerIds`; Worker returns `wishlist`/`following` (`unified-sync.ts:150-164`).
10. Video feed is a cover image; “Publish” sends metadata, not a recorded/uploaded video.
11. Promo wallet, virtual gifts, auctions, bids and portions of chat are locally simulated; gift combo cost is inconsistent with displayed count.
12. Buyer shipping and “payment ready” state is local, not synced to D1 addresses.
13. Go Live and Seller Centre routes are exposed to buyer users before role checks; remote seller requirements and local fallback conflict.
14. Several sync failures are swallowed or treated as empty/local success.
15. The 17 passing Android automated tests focus on auth and a few safety guards, not all shopping/seller/live workflows.

## Other gaps (P2 / scope)
16. “AI Search” is keyword ranking, not an AI model call.
17. Auth screens use a large hero and are crowded by the keyboard in user screenshots.
18. Android backup/data extraction rules are template defaults despite encrypted Keystore-backed session preferences.
19. Native Admin Console is intentionally disabled (MFA-protected web only), but still has an exposed navigation destination.

## Fix sequence
**P0:** Stop showing fake verified/live content → align catalog and storefront schemas → repair buyer/seller cart and address persistence → wire real seller store/product APIs → implement genuine video broadcasting/player → then transactional gifts/auctions. Preserve staging payment/coin/KYC disables until authorised.

**Acceptance gate:** Real staging data and actual APK UI must match; cart/wishlist/storefront edits survive restart and match web; empty live DB shows empty states; live camera transmits to a second device; remote errors never show success; all roles and backend writes are secure.

**Environment:** 12 native route destinations; staging D1 read-only counts: 8 legacy products, 5 legacy stores, 1 seller product, 1 seller store, 0 live rooms, 0 auctions, 0 cart rows, 1 order. No D1 writes or live deployments were made during the audit.

**Notes:** This is a source and screenshot audit with read-only backend inspection, not an emulator-driven all-screen QA pass. Verified source-level assertions matched 19/19; these are not app feature pass results.
