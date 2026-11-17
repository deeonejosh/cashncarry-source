# Cash N Carry Nigeria — UI/UX Cleanup Report

**Date:** 17 November 2026 (UTC)  
**Project:** Cash N Carry Nigeria, private staging scope only  
**Repository:** https://github.com/deeonejosh/cashncarry-source  
**Repair branch:** `fix/staging-workflow-audit`  
**Private staging URL:** https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/

## Release decision

**Source changes committed; new UI build NOT deployed to Cloudflare staging.** The existing private Worker is unchanged. Production, DNS, production databases and all payment settings were not modified. The final web screenshot regression PASSED on the last source commit. The release gate still requires safe alignment of the GitHub Vite build with the currently deployed manually assembled KV-backed Worker, plus authenticated private Access verification. Android builds remain blocked by incomplete Gradle source configuration. Do not claim that the CI-rendered screenshots are screenshots of an updated hosted staging deployment.

## Source and scope

Inspected the extracted React 19/Vite 8/TypeScript/Tailwind 4 web source committed on the repair branch, not the old production archive. Examined all 26 routed website page components and the shared header, footer, navigation, product cards, modals and CSS. The Android/Kotlin project exists, but source Gradle config is missing/empty; no successful Android compilation or screen verification is claimed.

## Existing route inventory and page-by-page cleanup

| Existing route | Cleanup / safety note |
| --- | --- |
| `home` | Smaller hero typography and spacing, shorter promotional statements; no inactive live/flash claims |
| `shop` | Short page title; compact search; filters collapse and disappear when catalog empty; accurate zero-product state |
| `for-you` | Shortened empty-video guidance and reduced visual overlay copy |
| `product-detail` | Compact wording, preserved price, shipping and availability requirements |
| `checkout` | Shorter headings, preserved shipping-quote warning and payment conditions |
| `checkout-complete` | Concise confirmation, keep order identifiers and next actions |
| `orders` | Reduced repetitive introductory copy; preserve payment/order statuses |
| `profile` | Guest is shown a real sign-in state, not fictional 'Guest Shopper' and zero account metrics; authenticated profile preserved |
| `live` | Shortened stream empty states and labels; no fake broadcasts or large promo blocks |
| `auctions` | Concise heading and guidance; bid rules remain |
| `coins` | Reduced decorative text; preserve balance/payment warning |
| `flash-deals` | Compact empty states; do not advertise nonexistent deals |
| `wishlist` | Concise saved-items heading and empty guidance |
| `shipments` | Shortened tracking UI copy, preserve delivery status |
| `messages` | Simpler messages heading, preserve communication actions |
| `notifications` | Minimal heading / clear empty state; preserve alerts |
| `returns` | Clearer short copy with refund/legal conditions untouched |
| `seller-dashboard` | Compact management header and KPI cards; seller role enforcement unchanged |
| `seller-products` | Compact product-management wording and inventory controls |
| `seller-orders` | Concise order-management headings, preserved fulfilment workflow |
| `seller-kyc` | Shorter heading but preserves verification and upload warnings |
| `seller-settlements` | Streamlined earnings title, preserve payment/payout safeguards |
| `admin-dashboard` | White SaaS-style header, reduced decoration and unsubstantiated MFA success label; roles remain server-controlled |
| `email-marketing` | Compact operational text; no removal of sender settings |
| `storefront` | Cleaner storefront empty state; preserve store ownership and actions |
| `policies` | Less decorative/legal header copy; terms, NDPA, returns, escrow and seller code content retained |

**Shared components**: `web/src/index.css`, `web/src/App.tsx`, `ProductCard.tsx`, `Footer.tsx`, and responsive page wrappers. Removed universal 'Verified' product badge with no verification backing; removed redundant product quick-view control. Standardised white surfaces, accessible focus rings, reduced-motion handling, compact spacing and product image sizing. Footer policy links remain real links rather than dead-end buttons.

## Safety and essential information

Protected: product price, stock, delivery information, server-calculated payment/order statuses, shipping quote warning, form labels and validation, accessibility labels and keyboard focus states, seller/admin authorisation, livestream safety controls, legal terms, privacy/NDPA, returns and escrow disclosures. No database rows, real buyer/seller records, secret values or payment keys have been changed.

## Test evidence

- **PASS**: source static audit: 26 routes, 26 navigation targets, all 26 page components, ~297 buttons, 25 forms and no inert buttons detected.
- **PASS on CI revision `3c0205ede533`**: `npm ci`, TypeScript/lint, automated unit/integration suite, Vite build and mobile (390×844) and desktop (1440×900) browser smoke for all 26 routes; 52 route screenshots attached to run `44049428889`. This verifies that CI revision only; later page refinements need independent rerun.
- **PASS on final source commit `ecbd8c22c5e1693668db8f9a1cf7a0a31bc0f7c4`**: [GitHub Actions run 44050260508](https://github.com/deeonejosh/cashncarry-source/actions/runs/44050260508), source inventory and web job successful. Evidence: `npm ci`, TypeScript/lint, 16 backend integration tests passed, Vite production build passed, 26 routes passed browser smoke at desktop and mobile, zero console/page errors and overflow failures. The downloadable artifact contains **52 final route screenshots** (artifact id `14313367258`). The overall workflow is failed solely because the Android Gradle configuration gate failed.
- **BLOCKED** Android: missing/empty root Gradle scripts and incomplete wrapper; Android test/build did not run.
- **NOT VERIFIED**: signed-in buyer/seller/admin end-to-end flows, real stream camera, coin purchases, external supplier integrations, device keyboard/safe-area testing and authenticated Cloudflare Access browser rendering.
- **NOT DEPLOYED**: UI source build under audit is not published on staging. Current staged Worker revision seen before the task: `4771ec1f-247d-42ab-8811-6acbf2949ddb` (17 Nov 2026 04:17 UTC).

## Before/after evidence

- User-provided earlier staging home screenshots and the locally CI-rendered clean source home are packaged in `CashNCarry-UIUX-before-after-home.png`. The latter is **CI source**, not a hosted staging proof.
- GitHub CI screenshot artifact `cashncarry-uiux-screenshots`, run `44049428889`, captures 26 tab views in both desktop and mobile widths. The first gallery exposed the fake guest profile. The final gallery from [run 44050260508](https://github.com/deeonejosh/cashncarry-source/actions/runs/44050260508), artifact `14313367258`, was captured after the repair and visually reviewed; the logged-out page now shows "Your Account" and Sign In / Create Account.

## Verified defects and actual repairs

1. Product card falsely asserted universal 'Verified' seller status: removed the unsupported badge, kept price/delivery.
2. Empty Shop displayed overwhelming filters: reduced sidebar and empty state.
3. Seller/admin headers included redundant banners and developer-like explanations: compressed and standardized.
4. Guest profile presented fictional 'Guest Shopper' identity and empty metrics: replaced with explicit sign-in screen and added browser regression assertion.
5. Headers, status and empty-state copy were repetitive across buyer, seller, legal and stream screens: rewritten concisely, essential content retained.
6. Earlier screenshot mismatched responsive layouts; shared spacing and CSS improved without adding competing pages.

## Remaining release blockers

1. **Complete:** final source web lint, unit/integration tests, production build and 52-route desktop/mobile screenshot checks pass. Keep this release gate enabled for every new source change.
2. Decide whether Android is a required gate to deploy web-only UI or must be repaired first; **the Android gradle source is incomplete**, so Android is not verified.
3. The Cloudflare staging Worker currently uses a manually assembled backend plus KV static asset routing. It is not safe to overwrite it with generic Wrangler deploy and risk losing Resend secret, bindings or current UI. Prepare a separate, reviewable deployment adapter with full binding inheritance and asset content checks. Keep payment flags disabled.
4. Authenticate via Cloudflare Access in the browser and verify the actual staging screenshot after deployment. Unauthenticated remote browser probes received the Cloudflare Access sign-in page.
5. Finish functional design review of logged-in seller/admin and real livestream on disposable staging accounts; remove only verified obsolete controls.
6. Android UI source can receive its own cleanup after Gradle can compile reliably; none of the Android design claims are verified today.

## Deploy status and production assurance

**Deployment of this requested revised UI: NOT COMPLETED**; staging old version remains. Source cleanup is committed on `fix/staging-workflow-audit`. Production was untouched. No D1 migration, destructive data reset, privileged account creation or payment processing occurred.