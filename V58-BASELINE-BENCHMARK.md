# Cash N Carry Nigeria — V58 baseline benchmark
**Audit date:** 2026-11-18 (UTC)  
**Scope:** Existing Cloudflare **private staging only**; never production.  
**Dedicated repair branch:** `fix/v58-marketplace-e2e`, forked from `d7328633d96e865d185e9aed56e08f58c5aa9eaa`.

## Verified deployed baseline (direct Cloudflare readback)
- Active staging Worker: `cashncarry-d1-staging-worker`, deployment `60f4f54c-99ce-43dc-914e-80c66605af81`, **v58** version `6cf16c68-6515-4163-9ce2-dc146238d0b7` at **100%**, created 2026-11-18 08:46:14 UTC.
- Deployed Worker code annotation: `e7da750157ec15ac9bca0a5fdd15d2644ccb86a3` (KV frontend wrapper); verified v57 backend bundle built from `14cd892b0e39ed9f2a74601d0a7a88813fb79e80`. Current repository v58 report commit is `d7328633...`, newer than deployed code annotation because it records release evidence, not a new code release.
- Private staging URL: https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/. This URL is **Cloudflare Access protected**; unauthorised direct HTTP requests return 403, so remote authenticated 3-role acceptance has NOT been executed.
- Staging HTML/JS/CSS source built v56 and delivered to existing staging KV under `cnc:v58:ui:*`. Each file was independently read back and SHA-256 checked against approved source:
  - HTML `d885970af9a34102f4a8d63b0f6d4b4bea90bd3c13b6d00c109fdcdac99c660c`
  - JS `6595806be9b58806b6bf1b34d8c6dab88fd0f2864b14004884d39e36df68ae72`
  - CSS `a25a7fb15bf5883b5152e0cb296a317feffaf4688c043e6a6ac51b9c68d51057`
- Existing staging D1 `cashncarry-d1-staging` UUID `9a2cdbee-e030-4b10-908b-b10b8142d2aa`: **25 applied migrations**, including 0022–0025. `PRAGMA quick_check = ok`; foreign-key check returns 0 rows. Exactly **one verified unsuspended admin**, zero buyer/seller users, applications, private products, orders, auctions, livestreams, or Flutterwave payment rows at baseline. No database writes made during the baseline inspection.
- Existing settings expose 14 bindings, including separate DB/AUTH_DB names pointing to the staging database, Admin MFA secrets and Resend sender secret (values NOT read), staging-only KV. `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `KYC_UPLOADS_ENABLED=false`, `FLW_MODE=disabled`. No Stream WHIP/WHEP provider configured and **no R2 buckets exist on the connected Cloudflare account**. Do not provision/charge a new service.
- Cloudflare Access application `Cash N Carry Private Staging` has a single `allow` policy named `Staging owner`, containing email rules. This protects the site and **currently blocks buyer/seller test identities**. Do not weaken Access or impersonate real customers. User needs to explicitly authorise test recipients if remote multi-role testing is required.
- Workers observability issues summary reported **zero tracked active issues**. This is not a substitute for inspecting authorised request logs or real user E2E.
- Resend sending domain is verified; historical verification/reset messages were delivered. No fresh provider email was sent or independently tested in this audit. Historical delivery does not prove current delivery.
- Staging D1 independent encrypted, SQLite-restorable snapshot and encryption key are stored separately in private ChatGPT Library at `/Cash N Carry Nigeria/Private Staging Backups/` from previous v57 migration release. For future schema mutations, take a new verified snapshot; a Cloudflare bookmark alone is insufficient.

## Baseline workflow statuses
| Workflow | Live remote staging | Isolated evidence |
|---|---|---|
| Browser buyer registration, verification, login and sessions | BLOCKED by Access owner-only policy; no buyer account exists | Partial prior Miniflare auth/bearer tests |
| Owner MFA / admin login | NOT TESTED in this audit | MFA DB guard and static code checked |
| Buyer -> application -> owner review -> seller role | BLOCKED remote | SQL migration and route source available; complete E2E new test pending |
| Seller storefront -> product moderation -> buyer catalog | BLOCKED remote | v58 source/DB triggers and isolated tests only |
| Cart -> D1 order -> reservation / cancellation | BLOCKED remote | Prior source-level isolated tests; payment disabled |
| Real Flutterwave **TEST** transaction and verified webhook | BLOCKED: sandbox integration disabled/credentials not verified | Mock/fixture checks not counted as provider PASS |
| Auction winner -> buyer order -> payment -> fulfilment | BLOCKED; `AUCTION_SETTLEMENT_NOT_CONFIGURED` in source; payments disabled | Atomic bid/auction guards tested in isolation only |
| Real video capture/WHIP/WHEP playback | BLOCKED: transport not configured | No real-media test |
| Paid gifting/coins | BLOCKED: purchase flag false | Ledger guards isolated only |
| Product media/KYC upload | BLOCKED: no private staging R2 | KYC intentionally disabled |
| Android physical Samsung app | NOT TESTED | Source present and unit-test workflows available |
| Resend current staging receipt | NOT TESTED | Historical domain/delivery verified, not fresh test |
| 26 web routes desktop/mobile guest | NOT TESTED remotely due Access | Prior isolated Worker + D1 CI 52 passes, 0 Axe findings |
| Security / backup / migration state | PASSED direct readback for D1 & flags | Encrypted SQL backup restored pre-v57; D1 checked now |

## Reproducible source findings and release constraints
1. **AUTHENTICATED TESTING BLOCKER (P0):** Access's single owner-only allow policy prevents ordinary external buyer/seller sign-in. Fixing this requires an explicitly authorised policy change; do not use bypass credentials or disable security. Local isolated authenticated fixtures are allowed but cannot claim remote acceptance.
2. **R2 UPLOAD BLOCKER (P0):** No R2 bucket exists, so genuine document and image upload acceptance is impossible; do not claim successful KYC.
3. **EXTERNAL FINANCIAL GATE (P0):** `/api/auctions` winning checkout deliberately responds `AUCTION_SETTLEMENT_NOT_CONFIGURED` once flagged enabled; plain checkout uses verified D1 reservations but no real Flutterwave test settlement performed.
4. **ROLE CONSISTENCY REVIEW:** `checkoutPage` protects buyer-only checkout, whereas `ordersRoute` currently authorises `buyer` or `seller` on `/api/checkout` / cancellation. Add a failing server-side regression proving no seller order creation and repair only if reproduced.
5. Cloudflare Access prevents external black-box authenticated browser checks. Do not fabricate 3-user acceptance, provider outcomes or whole-marketplace readiness.
6. Cloudflare assets-upload endpoint earlier returned HTTP 401; the existing KV wrapper delivered v58 UI successfully. Preserve the established UI, KV isolation and noindex.
7. No production DNS, Worker, DB, R2, domain or real payment resource was touched by this baseline inspection.

## Evidence sources and rollback
- [v58 tested Worker/KV CI](https://github.com/deeonejosh/cashncarry-source/actions/runs/44270084678) — prior isolated tests and build PASS.
- [Full v58 deployment evidence](https://github.com/deeonejosh/cashncarry-source/blob/fix/staging-v58-kv-ui-20261118/CASHNCARRY-MASTER-MARKETPLACE-BENCHMARK.md) — verified staging hashes and rollback.
- Source: [repair branch](https://github.com/deeonejosh/cashncarry-source/tree/fix/v58-marketplace-e2e).
- Rollback Worker to v57 `5cef92b3-47f6-4f73-8bee-382da52d73f0` (100%, private staging only) if UI wrapper fails; v58 `6cf16c68-6515-4163-9ce2-dc146238d0b7` is baseline rollback when deploying verified isolated fixes. Never roll back D1 blindly; its applied migration ledger must remain consistent.

**Scoring rule:** Before/after weighted benchmark will award credit ONLY for independently verified code, D1, isolated or actual provider evidence, explicitly flagging blocked live E2E. A single total cannot override an unresolved P0 risk. No new measured score or production-ready claim is made at baseline.
