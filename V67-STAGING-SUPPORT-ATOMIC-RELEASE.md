# Cash N Carry Nigeria — Private staging v67 support ticket atomicity repair

**Verified date:** 18 November 2026 UTC  
**Scope:** Existing private Cloudflare staging Worker only. Production, production DNS, Cloudflare Access, payment credentials, D1 schema, frontend assets and real customer data were not changed by this release.

## Reproduced defect
The v66 support ticket creation endpoint inserted the ticket before a separate D1 batch for the opening message and creation audit. A failed opening-message insert returned a server error but left an orphaned ticket in D1.

- Expected-failing isolated regression commit `90d5c55c71cfb750c0eaa3eb7bf633ea246d79de`, run [44388931952](https://github.com/deeonejosh/cashncarry-source/actions/runs/44388931952), assertion: `ticket insert must roll back when first support message fails`.
- Fix commit [2d112984c738e6854103270e4cabcc0cc4d14719](https://github.com/deeonejosh/cashncarry-source/commit/2d112984c738e6854103270e4cabcc0cc4d14719): insert ticket, opening message and audit together via a single atomic D1 batch.
- Successful regression of repaired code: [44389135540](https://github.com/deeonejosh/cashncarry-source/actions/runs/44389135540).
- Successful complete packaging/test run: [44389351605](https://github.com/deeonejosh/cashncarry-source/actions/runs/44389351605).
- Source release commit: `ddd870a4171d2a02a4fc4958b2ac5663ba19cf21` on `fix/v67-staging-support-atomic-20261118`.
- Verified immutable backend artifact branch: `artifact/staging-v67-support-atomic-20261118`; compiled backend SHA-256 `29e2bec15b14c339c874b09f19fe71755f607a2254f439aa35497561c6f47945`.
- No remote staging writes were made by regression tests; Miniflare D1 test accounts/tickets were disposable.

## Verified deployment
- Existing private staging Worker: `cashncarry-d1-staging-worker`.
- URL: https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev/
- Deployed v67 Worker version: `f1518108-9d2d-42e5-aea3-11c620169551`, **100%** traffic.
- Deployment ID: `ea41de43-c32c-4abf-aab7-fd82e3b74fcf`; created **2026-11-18 20:19:12 UTC**.
- Preserved v66 frontend wrapper/asset references `cnc:v66-support:ui:*`; no extra pages or static assets deployed.
- All 14 existing Worker bindings inherited; flags remain `PAYMENTS_ENABLED=false`, `COINS_PURCHASES_ENABLED=false`, `KYC_UPLOADS_ENABLED=false`, `FLW_MODE=disabled`.
- Existing private D1 `9a2cdbee-e030-4b10-908b-b10b8142d2aa` read-only post-release verification: **27** applied migrations, `PRAGMA quick_check=ok`, zero `PRAGMA foreign_key_check` rows, **2** users, **2** seller products, zero orders, zero support tickets, zero support messages.
- Previous v66 version for rollback: `bc912f34-d878-4538-9f32-ef0bc4c86824`. Rolling back to v66 would reintroduce the orphaned-support-ticket defect; prepare a corrected version if rollback is required. Do not roll back D1 schema/data.

## Unverified / not changed
- Cloudflare Access remains owner-only; browser-based buyer/seller/admin acceptance was **not** performed in this chat.
- AI-assisted drafting remains unavailable until separately approved provider, guardrails and budget are configured. Human-edited templates remain available. No automatic support sends or inbound email webhook was enabled.
- Flutterwave, gifts/coin purchases, R2 image/KYC uploads and real livestream WHIP/WHEP remained disabled/unverified.
- There are no real support tickets in current remote staging; deployment is verified, but a real authenticated ticket journey has not been completed.
