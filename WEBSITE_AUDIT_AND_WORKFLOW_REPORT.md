# Cash N Carry Nigeria — Customer Website UI/UX and Workflow Audit
**Date:** 16 November 2026  
**Scope:** New website + Android source from the latest cleaned ZIP; existing private Cloudflare staging only.  
**Deployment:** NOT DEPLOYED. Previous Cloudflare assets stay as-is until build and real browser tests pass.

## Findings from the supplied screenshots

1. The `QA`, `QA Suite`, `V17 Staging ZIP`, `Export ZIP`, visible `Private Staging` development ribbon and hardcoded `Chidi Okafor — BUYER` controls must not appear on customer pages.
2. The older compiled bundle includes these labels. The current source's old extra green utility header was removed; the normal guest **Sign In** action is retained in desktop and mobile navigation.
3. The Cloudflare Access identity policy protecting the staging address must remain **on**. Hiding a staging badge alone does not make a site private.
4. The compiled staging site is **not yet replaced** by these changes; a fresh customer bundle needs to be compiled and staged after verification.

## Source fixes actually made

- `web/src/components/ui/Navbar.tsx`: remove green development/utility ribbon and demo-like profile indicators; retain actual account menu and guest sign-in.
- `web/src/components/pages/HomePage.tsx`: change two clickable promotional divs into keyboard-accessible buttons.
- `web/src/components/ui/AuthModal.tsx`: explain verified-email registration and separate seller approval accurately.
- `web/src/components/pages/ShopPage.tsx`, `web/src/App.tsx`: maintain search query with navigation.
- `web/src/context/StoreContext.tsx`: normalise catalog category IDs (`electronics` to `tech`, `kids` to `baby`) and stop claiming an unimplemented newsletter subscription was saved.
- `web/src/components/ui/Footer.tsx`, `NewsletterModal.tsx`, `web/src/components/pages/EmailMarketingPage.tsx`: clarify newsletter operations are preview-only, not saved or emailed.
- `web/deploy/chatgpt-sites/staging-init-complete.sql` AND `catalog-init.sql`: remove five fake store and eight fake product inserts from both entry points, preserving schema/category definitions.
- `web/scripts/package-zip.py`: removed dangerous public source-archive packaging script.
- `web/package.json`: build a customer bundle with a no-QA/no-ZIP asset audit; never leave the server-side Worker bundle in public static `dist`.
- `web/scripts/audit_customer_ui.py`: new route/button/developer-content/static-asset safety gate.
- `web/scripts/verify-staging-browser.mjs`: local browser script now checks all 26 routes on mobile and desktop, customer-only controls, overflow and login action. Not executed locally.
- `.github/workflows/verify-existing-private-staging.yml`: manual **build-only** workflow; adds full browser smoke after a CI-run build and Android debug APK build. Does not deploy.
- `web/deploy/chatgpt-sites/DEPLOYMENT-GUIDE.md`: remove stale `--env staging` step (does not exist in top-level `wrangler.jsonc`); do not reinitialise existing D1 or publish raw Worker code as an asset.
- `scripts/test_*`: update stale structural checks and add 10 customer-specific regression checks.

## Inventory and test evidence

- **26** React page routes, **26** source navigation destinations.
- **309** JSX button elements scanned; **283** with `onClick`, **24** submit types, **37** with disabled states. These categories overlap. **0 inert buttons detected by static source scan.**
- **25** form elements.
- **49/49 Python offline tests PASS**, including compiled SQLite bootstrap checks for both catalog init scripts.
- `node --check web/scripts/verify-staging-browser.mjs` PASS.
- `python web/scripts/audit_customer_ui.py` PASS, no errors/warnings.
- **Not performed:** TypeScript lint, React production compile, real browser click-through, private Access sign-in capture, server-backed account signup, end-to-end Android build, production domain cutover.
- **Build blocker:** Package cache lacks dependencies (`npm ci --offline` fails `ENOTCACHED`, missing `zod@4.6.7`). Internet package registry resolution is unavailable in this container.
- **GitHub blocker:** `development/cloudflare-staging` contains older ZIPs, but no extracted `web/` or `app/` directories. Current CI cannot verify this new source until extracted files are committed.

## Page and route checklist

| Route | Access workflow | Validation |
|---|---|---|
| `for-you` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `home` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `shop` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `product-detail` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `checkout` | Signed-in account | Source route and click-handler scan; browser smoke pending |
| `checkout-complete` | Signed-in account | Source route and click-handler scan; browser smoke pending |
| `orders` | Signed-in account | Source route and click-handler scan; browser smoke pending |
| `profile` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `live` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `auctions` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `coins` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `flash-deals` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `wishlist` | Signed-in account | Source route and click-handler scan; browser smoke pending |
| `shipments` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `messages` | Signed-in account | Source route and click-handler scan; browser smoke pending |
| `notifications` | Signed-in account | Source route and click-handler scan; browser smoke pending |
| `returns` | Signed-in account | Source route and click-handler scan; browser smoke pending |
| `seller-dashboard` | Approved seller | Source route and click-handler scan; browser smoke pending |
| `seller-products` | Approved seller | Source route and click-handler scan; browser smoke pending |
| `seller-orders` | Approved seller | Source route and click-handler scan; browser smoke pending |
| `seller-kyc` | Signed-in account | Source route and click-handler scan; browser smoke pending |
| `seller-settlements` | Approved seller | Source route and click-handler scan; browser smoke pending |
| `admin-dashboard` | Admin + MFA/role check | Source route and click-handler scan; browser smoke pending |
| `email-marketing` | Admin + MFA/role check | Source route and click-handler scan; browser smoke pending |
| `storefront` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |
| `policies` | Public or its own in-page gate | Source route and click-handler scan; browser smoke pending |

The table indicates code access gating, not a successful live click-test. Additional stateful test scenarios are required for seller-approved, buyer-verified, authenticated admin and media-enabled sessions.

## Workflow review

| Journey | Current source flow | Risk / next test |
|---|---|---|
| Visitor / identity | Sign In button -> registration email -> Resend verification token -> password creation -> authenticated session | Confirm actual email receipt on a clean test account and server session cookie; API secret is present on staging |
| Buyer discovery | Home -> search and category -> Shop -> Product -> Wishlist / Cart | D1 starts empty intentionally; add one approved seller product through UI for tests, do not add fake seed records |
| Buyer order | Cart -> delivery address -> order reservation -> Orders / tracking / Returns | `PAYMENTS_ENABLED=false`; payment/settlement is intentionally not end-to-end operational |
| Seller approval | Sign In -> seller application -> admin review -> approved seller -> product draft -> submit for moderation -> published | KYC file uploads disabled; verify role/approval boundary on server, not just React |
| Social / videos | Approved seller -> choose actual published product -> upload video -> For You and comments | Provider API and upload readiness require integration test; no fake demo videos |
| Go Live | Approved seller -> open live shopping room -> chat / product pin | Room can exist without video transmission. Camera preview does **not** broadcast until media publishing is configured |
| Auctions and gifting | Buyer and seller interactions through server APIs | Coin purchases and payments disabled; assert safe fail-closed UI, don't advertise real checkout |
| Admin | Verified admin session / MFA -> admin dashboard, product moderation and settings | Anonymous and nonadmin must receive access denial, browser test exists but not executed |
| Marketing | Admin email template preview | Newsletter subscriber persistence and bulk sending are **not implemented**; avoid fake success |
| Staging release | Build -> static audit -> TypeScript/test -> Worker smoke -> 26-page browser smoke -> Android debug APK -> reviewed staging deploy | Source branch has ZIPs only; no deployment performed in this chat |

A source-derived interactive workflow map was also generated in the conversation with Workflow Viewer. It distinguishes confirmed flows from release steps pending live verification.

## Cloudflare staging resource checks

- Worker: `cashncarry-d1-staging-worker`
- Website: `https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev` — Cloudflare Access protected.
- D1 `cashncarry-d1-staging` ID `9a2cdbee-e030-4b10-908b-b10b8142d2aa`.
- D1 data rechecked: **0 accounts, 0 products, 0 video rows**.
- Resend credential binding `AUTH_RESEND_API_KEY` exists. Credentials are not stored in source.
- Payment flag remains false.
- No DNS/custom-domain modification, no private-access removal, no live Worker overwrites.

## Required verification before changing the staging site

1. Extract this full source into a staging-only GitHub branch; do not upload only the ZIP. Confirm `web/`, `app/`, `gradle/`, `scripts/` and `.github/workflows/` are present.
2. Run `.github/workflows/verify-existing-private-staging.yml` manually. Must pass `npm ci`, lint, web tests, web build, Worker smoke, the 26-route browser script and Gradle test/APK build.
3. Confirm built `dist/` has no QA/ZIP controls, no ZIP file and no `_worker.js` script as public asset.
4. Deploy with top-level `web/wrangler.jsonc` to `cashncarry-d1-staging-worker` **only**, after review; do not run D1 bootstrap or migrations unnecessarily.
5. Using an authorised Cloudflare Access session, test desktop/mobile buttons in real browser, plus genuine registration + Resend, buyer/seller/admin scenarios and Android login. Capture actual UI screenshots and console/network errors.
6. Do not change the customer domain until the new platform passes all agreed staging gates.

**Status:** Audited and repaired **source artifact**. Existing Cloudflare deployment still serves its previous frontend assets. No claim is made of 309 live button clicks or a completed website deployment.
