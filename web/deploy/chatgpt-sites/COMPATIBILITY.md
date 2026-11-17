# ChatGPT Sites compatibility candidate

Production project appgprj_6ac60acabe3c8191b54a3bfd9ffae5d5, version 470. Production was not changed.

## Implemented

The D1 catalog adapter reads only the verified categories fields id, name and active. It binds literal search input and caps results. An isolated SQLite fixture passed active-row filtering, wildcard escaping and literal query input checks. The adapter is not yet wired to a Sites Worker entry point. It does not use live production data.

The HTTPS scanning client requires an authenticated private HTTPS endpoint and rejects redirects, timeouts, invalid configuration, non-204 statuses and unknown verdicts. Set KYC_SCANNER_HTTPS_REQUIRED=1 for Worker-targeted builds, with KYC_SCANNER_HTTPS_URL and KYC_SCANNER_BEARER_TOKEN injected through runtime secrets. The endpoint contract is POST raw PDF bytes, Authorization Bearer, HTTP 204 and x-cnc-scan-verdict clean or infected. The existing upload path validates file size and PDF header, keeps bytes out of application storage before scanning, and stores only clean, encrypted documents. The private scanner must be trusted to restrict access, securely handle documents and record scan outcomes without logging documents or credentials. No endpoint or production scan audit has been verified. The container keeps its existing ClamAV transport when HTTPS is not selected.

Official branding from 8be5bfb is included.

## Release blockers

Prisma, PostgreSQL transactions and event connections remain in the application. Worker SSR and API build wiring are unfinished. The source inventory lists direct references that require review. The actual Sites DB binding is visible through the Sites connector, but complete DDL, indexes, foreign keys and triggers have not been obtained. Obtain them through authorised schema-only access and reproduce them on a separate test binding. Do not run the bundled Prisma migrations against D1.

Verify existing account hashes, cookies and sessions, seller and product relationships, media access, orders, stock reservations, payment idempotency, auction concurrency, and atomic wallet and ledger changes against that isolated binding. Confirm the private scanner integration, scan audit, storage and provider sandbox callbacks. Build the Worker output, then run desktop and mobile end-to-end tests before publishing to the existing project. Keep version 470 as a potential rollback point. The included Next.js build and container deployment files are for the original runtime and do not deploy this candidate to Sites.

Local verification commands are npm ci, npm run typecheck, npm run lint, npm test and npm run build. These commands do not establish production compatibility.

## Worker category API revision

Run `npm ci` and `npm run test:sites-candidate` on Node 24. This bundles a standalone Worker ES module at `dist/server/index.js` and starts workerd via Miniflare with a disposable D1 binding. The module exposes only GET /api/categories. Seven local scenarios passed, covering a missing table, active category filtering, literal wildcard and search input, input length, method restrictions and rejection of unsupported routes. The Worker bundle excludes Prisma, PostgreSQL and Node APIs. The complete marketplace still depends on them and is outside that bundle.

The current 99-row compatibility matrix is a source review of direct references. It does not certify runtime behavior for the listed files. Sites returned the DB binding and a table inventory. Verified column names used by the Worker are categories.id, categories.name and categories.active. Full production DDL, indexes, foreign keys, triggers and uniqueness constraints remain unavailable. The local test schema is synthetic.

Exact unresolved entry points include src/lib/prisma.ts (database client), src/lib/event-broker.ts (PostgreSQL events), src/lib/auth.ts and src/lib/page-auth.ts (identity and sessions), src/app/api/auctions and src/app/api/coins (concurrent writes), src/app/api/payments and src/lib/reconcile-payment.ts (provider transactions), and src/app/api/sellers/kyc/route.ts (private storage and scan auditing). The frontend is unchanged from the branded candidate and does not consume the standalone Worker endpoint. Worker SSR, desktop and mobile browser tests, accessibility, provider callbacks and authenticated workflow checks were not run. Existing scanner tests use simulated responses. No private scanning endpoint was verified.

TypeScript, lint and dependency listing passed. Vitest reported 21 passed and 1 skipped. The archive includes the standalone Worker build but is not a complete deployable Sites release.

## Phase 2

Homepage category cards now request the same-origin Worker API and handle loading, errors and empty results. The catalog Worker additionally serves GET /api/products (q, category, store, offset), GET /api/products/:id and GET /api/storefronts/:id. These use observed columns from products and stores. Synthetic fixtures check proposed publication rules (active products, verified and unsuspended storefronts). These rules and join semantics need independent verification against the existing application's contract. Public responses omit seller owner IDs and phone numbers. Existing product, seller and storefront pages remain on their original paths and have not been integrated into the Worker.

Sites exposed auth_user, auth_account and auth_session column names. auth_account includes provider_id, user_id and password. auth_session includes user_id, token and expires_at. The hash algorithm, cookie signing and token derivation, expiry encoding, provider rules, two-factor flows, and seller ownership/permission contract remain unverified. No auth or inventory writes are registered in the candidate Worker. Indexes and constraints remain unavailable. No production rows were changed. No hosted or desktop/mobile browser checks were run.

## Phase 3 candidate

The standalone Worker now serves server-rendered Shop, product detail and storefront pages backed by the Phase 2 D1 repositories. It preserves the official artwork and green/orange palette. These are Worker catalog templates, not a conversion of the full Next.js frontend. It forwards the logo, icon and manifest to an optional ASSETS binding. The fixture verifies forwarding, but Sites binding configuration and arbitrary product media delivery remain unverified.

Production Sites identifies the source provider as a Cloudflare artifact. The available project/version tools did not expose the deployed authentication implementation. The known D1 columns do not establish cookie signing, token validation, expiry semantics, two-factor or ownership and write constraints. No Worker login, session, seller or inventory write routes were enabled. Homepage, account and Seller Centre Worker routing remain outstanding. Version 470 and live D1 were left untouched.

The Worker build, 25 local Worker/D1 assertions, TypeScript, lint and 21 Vitest tests passed. One Vitest test was skipped. The optional desktop/mobile test was blocked before navigation because Chromium could not open a local process socket in this environment. Run with CNC_TEST_CHROMIUM pointing to a Chromium executable. Full accessibility and performance audits remain unrun.

## Phase 4

The Worker serves the homepage at / from D1 and links category and product records to the existing catalog routes. The Worker homepage is a read-only template using approved branding and palette. The complete original Next.js UI remains in source. The hosted ASSETS binding is still unverified. Local Miniflare provides DB and ASSETS fixtures. Use npm run test:sites-candidate, or set CNC_TEST_CHROMIUM to a compatible headless Chromium executable to additionally run desktop and mobile browser navigation.

Sites version 470 exposes commit and archive metadata. Sites documents ChatGPT visitor identity headers and platform sign-in, but no verified linkage to Cash N Carry's legacy account IDs, sessions, roles or two-factor policy was available. The Worker returns 503 on account and management routes, including seller write routes. No login, session, ownership or inventory write compatibility is claimed. Exact remaining paths include src/lib/auth.ts, src/lib/page-auth.ts, src/app/api/auth, src/app/api/sellers, src/app/api/products, and deploy/chatgpt-sites/worker.ts. The HTTPS antivirus client remains unchanged; no scanner was provisioned and the Worker exposes no KYC upload.

Results: dependency check, TypeScript, lint and Worker build passed. 34 local Worker/D1 assertions passed. Vitest: 21 passed, one skipped. Desktop and mobile catalog navigation passed in headless Chromium, including category navigation, search, product details, storefront refresh, and no horizontal overflow on Shop. Full accessibility, performance, and authenticated browser checks were not run. Production was not deployed.

## Phase 5

Recovered the original 204-entry Phase 4 archive. Public marketplace and catalog behavior are preserved. Worker navigation now includes My account and Seller Centre. Sign-in, registration, buyer account, Seller Centre, product management and Admin Console have branded unavailable states. Their API routes return 503 with no-store. No forms or private records are rendered.

Sites Dispatch handles hosted sign-in and sign-out, and forwards a site-scoped ChatGPT visitor ID with email and optional display name. The documentation does not provide an application-verifiable signed legacy assertion or map the visitor ID to Cash N Carry accounts. Sites service access is not visitor identity. The deployed legacy cookie, token, two-factor, revocation and ownership contracts are still unavailable. Linking must wait for an authoritative server-side proof of control of both identities and verified uniqueness and role constraints. Current routes ignore identity headers and cookies for protected access. No account linking, login, logout, session, address/order access or seller ownership/write services are active.

Exact affected paths: deploy/chatgpt-sites/worker.ts, deploy/chatgpt-sites/catalog-pages.ts, src/lib/auth.ts, src/lib/page-auth.ts, src/app/profile, src/app/seller, src/app/admin, src/app/api/auth, src/app/api/sellers and src/app/api/products. Hosted assets and full Next.js routing remain unverified. Worker KYC upload remains unavailable. The HTTPS scanning client is preserved.

Local verification: Worker build and 60 Worker/D1 assertions, desktop and mobile Chromium navigation (including unavailable account and Seller Centre views), dependency check, TypeScript and lint. Vitest: 21 passed, one skipped. No authenticated browser or full accessibility audit. No deployment or production writes. Version 470 was verified before edits.

## Phase 6 recovery candidate

Recovered and verified the 204-entry Phase 5 ZIP. Production version 470 was verified before changes. Sites configuration exposes a Better Auth secret name, but that does not establish password hashing, session, recovery, two-factor, role or ownership behavior. No production transactional email transport was verified. No secrets, password hashes or legacy session rows were retrieved.

The recovery module runs in workerd with isolated D1. It accepts a trusted account directory and delivery adapter, creates short-lived random tokens, stores only token/session hashes, uses per-address and trusted-client rate buckets, and atomically consumes tokens. A later recovery request supersedes an earlier token. Redemption rechecks account eligibility and registered email. A successful redemption rotates recovery sessions and writes an audit entry. Validation rechecks eligibility and expiry. Revocation deletes the synthetic session. The test fixture denies sellers, admins, suspended accounts and accounts requiring two-factor verification. The recovery module is not registered in the public Worker. The smoke harness deliberately exposes tokens only inside its synthetic fixture.

Release requirements: a verified legacy account directory and policy source, including verified registered email, suspension, roles and two-factor requirements; authorised production email delivery; an authoritative ownership contract for sellers; and reviewed D1 migration and retention controls. Any future HTTP integration needs trusted ingress rate keys, generic and timing-resistant responses, HTTPS Secure/HttpOnly cookies, origin/CSRF validation, and a secure logout route. Linking additionally requires a trusted platform subject and uniqueness constraints. No buyer addresses, orders, seller writes or production sessions were accessed or changed. Public Worker routes, branding and fail-closed KYC behavior are preserved.

Run npm run test:sites-recovery for isolated recovery tests and CNC_TEST_CHROMIUM=/path/to/chromium npm run test:sites-candidate for local catalog and account-unavailable browser checks.

## Phase 7 independent accounts

The replacement Worker has independent buyer and seller registration, email verification, login, identity lookup, password reset and logout APIs under /api/auth. The additive 0001_new_auth.sql migration creates namespaced users, sessions, verification/reset tokens, rate buckets and audit events. It ran on a disposable D1 binding only. Admin credentials cannot be registered or used through these endpoints. Legacy records and sessions are untouched.

Local bindings: AUTH_DB is the isolated new-account D1 database, AUTH_ORIGIN is the exact HTTPS origin, and AUTH_EMAIL is a trusted private service binding accepting POST JSON {email,token,purpose} at https://auth-mail.internal/send. Its implementation must deliver tokens securely without logging them. No provider credentials are required by the Worker module itself. Production bindings and trusted client-IP ingress behavior remain unverified. Test delivery is a synthetic in-memory fixture. Generic request status and response bodies are implemented; timing resistance, abuse controls and hosted CPU/memory budget still require verification.

Sessions use hashed opaque tokens and Secure HttpOnly SameSite=Strict cookies. State-changing requests require an exact Origin. Passwords use scrypt (N=32768,r=8,p=3) with random salts. Password reset revokes existing sessions. Login issuance checks the credential is still current. The migration records verification, reset, role and suspension changes without storing credentials in the audit log.

Passes: dependencies, TypeScript, lint, Worker build, 22 new-auth assertions, 20 prior recovery assertions, 60 catalog Worker assertions, 21 Vitest tests with one skipped, and desktop/mobile catalog browser flows. Authenticated browser flows, production email, hosting bindings, and production CPU performance were not verified.

Buyer and seller browser pages remain unavailable. Seller role does not grant inventory, product or store writes. Admin provisioning and MFA, cart/checkout, orders/fulfilment, payment callbacks/refunds, auctions, wallet/gifting, livestreaming, protected media and hosted asset delivery remain incomplete. Full Next.js integration is not verified. The existing KYC scanner client remains fail-closed and no upload route was added. Production version 470 was verified and no deployment or production writes occurred.

## Complete integration candidate

The Worker now serves functional sign-in, registration, email code verification, reset request and completion, account summary, logout and delivery address screens using existing authentication and the branded Worker templates. Seller Centre now enforces the seller role and verified active session before showing the account summary. Seller business data and management are unavailable. This is partial Worker UI integration; the full Next.js design and source remain packaged and full Worker routing is incomplete.

The additive 0002_buyer_addresses.sql migration was applied to isolated D1 only. Address creation, listing and removal use the session owner and parameterised SQL. Foreign-owner deletion is a no-op, and cross-origin posts are rejected. Address editing, buyer orders and other private data remain pending.

Verification: dependencies, TypeScript, lint, Worker build, 37 authentication/account assertions, 20 isolated recovery assertions, 60 public catalog Worker/D1 assertions, and 21 Vitest passes with one skipped. Desktop and mobile Chromium passed the public catalog checks and isolated HTTPS sign-in, address add/remove and logout. Browser tests used a local test certificate, synthetic accounts and mock email. No full accessibility or hosted performance audits were performed.

Production version 470 was verified. No production deployment or D1 writes were made. Release blockers include authorised transactional email and verified Sites AUTH_DB, AUTH_ORIGIN, AUTH_EMAIL and hosted ASSETS; production runtime and password-hashing limits; admin provisioning and MFA; seller ownership and store/product/inventory mutations; checkout, orders, shipping and verified payment sandbox credentials and callbacks; livestream service and real-device tests; auction and wallet concurrency/reconciliation; private media storage and the private HTTPS KYC scanner. Existing Flutterwave and stream configuration names are visible but their mode, validity and suitability were not verified. No production Paystack, email or scanner credentials were verified. No unscanned upload route was added.

## Seller drafts and buyer cart update

The Worker now provides seller store profiles and private product drafts, including creation, editing, price and stock changes, and archival. Seller sessions are checked on every request and SQL scopes records to the signed-in seller. Product changes use revision checks and duplicate draft IDs are rejected. Drafts do not enter the public catalog. Product publishing, moderation, variants, uploads, and fulfilment remain pending.

Buyer cart pages and APIs validate products against the read-only catalog and scope saved quantities to the buyer. Cart changes neither reserve inventory nor create orders. Tests cover role denial, cross-seller isolation, conflicting edits, duplicate IDs, invalid stock, insufficient catalog stock and cart removal. Migration 0003 adds new tables to the isolated account binding. It does not change legacy catalog or financial tables. Production Sites exposes DB; the replacement AUTH_DB, email and asset bindings remain unverified. No production migration or deployment ran.

Outstanding application paths include deploy/chatgpt-sites/marketplace.ts (publishing and checkout), deploy/chatgpt-sites/worker.ts (full frontend and admin), src/app/api/payments (provider callback port), src/app/api/live (stream provider), src/app/api/auctions and src/app/api/coins (Worker financial operations), and src/app/api/sellers/kyc (private storage and scanner). Production email delivery, payment sandbox and callbacks, streaming device tests, and the private scanner remain unverified. Existing auth uses mock email in tests only.

## Product review and order reservation update

Sellers can submit owned drafts for review and unpublish published items using revision checks. Edits return items to draft. No administrative approval path or public listing of replacement products is enabled. Existing public catalog reads remain separate.

Migration 0004 adds publication state, explicit cart item source, orders, immutable item snapshots at creation and D1 triggers for atomic reservation and cancellation. The gated APIs support buyer checkout, order summaries and cancellation. Checkout requires replacement-source items and a buyer-owned saved address, reads prices from the database and handles duplicate request IDs. Concurrent isolated checkouts for a single unit produced one order. Cancellation restored stock once. There is no payment completion, shipping calculation, reservation expiry, seller fulfilment or production checkout UI. Keep ORDER_RESERVATIONS disabled in hosted environments pending these release requirements.

Verification: 66 authentication, marketplace and order assertions, 60 catalog assertions, 20 recovery assertions, 21 Vitest passes and one skip. Desktop and mobile Chromium covered existing catalog and buyer account/cart/address flows. Order concurrency was tested via API, not browser. Production bindings, admin MFA and moderation, media uploads, hosted routing, authorised email and payment/streaming/scanning providers remain unverified or incomplete. Auction, gifting and KYC writes remain unavailable in the candidate Worker. No production deployment or migration.

## Administrator MFA and moderation

The Worker supports password plus TOTP for one explicitly configured administrator. It requires an existing verified, active admin record, exact HTTPS origin, a securely provisioned ADMIN_ACCOUNT_ID and ADMIN_TOTP_SECRET_HEX, and migration 0005. Public registration and ordinary sign-in cannot issue admin sessions. D1 prevents TOTP step reuse. Admin sessions expire after 15 minutes. Never use fixture credentials or fixture TOTP seeds on a host. Production provisioning, MFA enrolment, secret rotation and recovery procedures remain pending.

The admin queue supports review of pending product revisions belonging to active verified sellers. An immutable review record and trigger apply the decision in one statement. Concurrent approval requests result in one accepted review. Approval does not add the product to the separate legacy public catalog. Tests cover invalid codes, replay, seller denial, cross-origin denial, concurrent moderation and audit record creation. They use synthetic D1 data.

The Sites project exposes DB and version 470. The replacement AUTH_DB, AUTH_EMAIL and hosted ASSETS bindings are not verified. Local Worker routing includes branded admin sign-in and a moderation queue. Full redesigned Next.js routing and provider integration remain incomplete. No production migrations or deployments occurred. Payment callbacks, streams, auctions, gifts and KYC still need their Worker ports. Email provider delivery, Flutterwave sandbox callbacks, real-device streaming, private media storage and the HTTPS scanner remain unverified.

## Transactional email adapter

The Worker can deliver verification and reset codes through the existing private AUTH_EMAIL binding or Resend. Resend requires AUTH_RESEND_API_KEY as a hosting secret and AUTH_EMAIL_FROM as a verified sender. The adapter uses a fixed HTTPS endpoint, request timeout and per-token idempotency key. Provider rejection preserves the existing generic HTTP response and removes the rejected token. No live provider was configured or contacted. Local tests stub the provider request. The Sites variable inventory did not show the required Resend settings. No production payment, streaming, storage or scanning configuration changed.

## Private KYC intake

The Worker accepts seller-authenticated PDF submissions only when AUTH_DB, KYC_PRIVATE, KYC_SCANNER_HTTPS_URL, KYC_SCANNER_BEARER_TOKEN and KYC_DOCUMENT_KEY are configured. It requires same-origin POST, caps bytes at 5 MiB, and scans before persistence. Clean documents are AES-GCM encrypted and written to a dedicated private bucket; outcome and ownership are recorded in D1. The encrypted format is a 12-byte nonce followed by ciphertext and authentication tag, with JSON [seller ID, submission ID] as associated data. Migration 0006 must be applied to the account binding. There is no download, approval or public object route. Hosted scanner and bucket configuration, review access and retention remain unverified. Tests use synthetic scanner and storage responses. Payment, livestream, auctions and gifting remain pending Worker ports.

## Cloudflare Stream candidate

Worker routes POST /api/live/cloudflare/publish and GET /api/live/cloudflare/play serve browser signaling URLs for one dedicated Stream input. Use STREAM_SELLER_ID (replacement seller ID), STREAM_WHIP_URL (secret), and STREAM_WHEP_URL (playback endpoint). The publish route requires same-origin POST and the active assigned seller; playback requires an active session. The playback URL may be shareable depending on provider settings. The publish URL is a bearer capability: use a dedicated input, never log it, and rotate it when access must be revoked. The connected account has live inputs and the inspected input exposes both WHIP and WHEP. No input or configuration was changed. The existing Next.js LiveKit UI still needs a WHIP/WHEP browser integration and two-device tests; this Worker change does not start or end a broadcast.

## Flutterwave sandbox Worker integration

Migration 0007 adds a unique order/payment ledger and a cancellation guard. POST /api/payments/initialize creates a checkout for the signed-in buyer's reserved order. POST /api/payments/webhooks/flutterwave requires raw-body HMAC SHA-256 and independently verifies the transaction with the provider before reconciling. GET /api/payments/status exposes reconciled status to the owning buyer. The order table itself still reports awaiting_payment; the payment ledger is authoritative for this sandbox status endpoint. The Worker requires FLW_MODE=sandbox, a FLWSECK_TEST-prefixed FLW_SECRET_KEY, FLW_WEBHOOK_HASH, FLW_WEBHOOK_SIGNATURE=hmac-sha256 and an exact HTTPS AUTH_ORIGIN. Verify actual sandbox signature mode, checkout hostname, callbacks and service bindings before enabling. A failed or ambiguous initiation leaves a locked intent for reconciliation; expiry, operational recovery and refunds are not implemented. No hosted sandbox, real charge or deployment was performed.

## Isolated Worker callback verification

The workerd/Miniflare suite applies migration 0007 on isolated D1 and intercepts Flutterwave requests with network access disabled. It confirms that an interrupted initiation can later be reconciled by a signed callback and verified provider response, that replay leaves one paid ledger entry, and that payment status is buyer-scoped. An invalid signature and cancellation while the payment is unresolved are rejected. If no verified callback arrives, safe automatic expiry and cancellation remain unimplemented. This is not a real sandbox transaction.

Worker HTTP clients now use manual redirect handling because workerd rejects the Fetch redirect mode error. Flutterwave, Resend and the scanner still reject redirect responses. The discovered staging projects expose DB but no sandbox key or webhook hash, and the replacement account binding and public test callback were not verified. No production credentials were copied or modified.

## Hosted staging version 6

The existing owner-only Sites preview now runs the checkout and order-history routes. Sites supports the preview's single DB binding; the preview wrapper passes that same isolated database to the replacement as AUTH_DB. Account and order tables are namespaced cnc_* alongside the preview catalog. This is logical separation within one staging database, not a second physical database. The hosted migration journal adds 0024–0030, corresponding to source migrations 0001–0007. Sites deployment succeeded and table inspection confirmed account, addresses, cart, orders and payment tables.

The existing visual homepage remains in place with sample content. Hosted checkout still needs approved replacement staging inventory and a verified test buyer. Resend AUTH_RESEND_API_KEY and AUTH_EMAIL_FROM are not configured. No hosted account journey, sandbox checkout or provider callback passed. Payment variables are not passed by the staging wrapper. Reservation expiry and late-payment reconciliation still need implementation before payment enablement. No production edits were made.
