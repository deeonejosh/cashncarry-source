# Existing private Cloudflare staging — verification (2026-11-16)

## Current Cloudflare account findings (read-only)

- The protected web Worker `cashncarry-d1-staging-worker` is deployed and has an `ASSETS` binding.
- Cloudflare Access application `Cash N Carry Private Staging` has an owner email allow policy for the exact web Worker hostname.
- Android API Worker `cashncarry-mobile-staging-api` is deployed and has its own `AUTH_RESEND_API_KEY` secret.
- Both Workers bind to D1 database `cashncarry-d1-staging` (`9a2cdbee-e030-4b10-908b-b10b8142d2aa`).
- The D1 contains 41 tables and applied migration names 0001–0017. Existing test records were observed in aggregate counts. No records were changed.
- Website Worker has **no** `AUTH_RESEND_API_KEY` or `AUTH_EMAIL` binding; account verification may fail with HTTP 503 until the website secret is securely configured.

## Tests run against locally patched source

- `python -m unittest scripts.test_existing_private_staging -v`: **14/14 passed** (static/source contracts).
- `python -m unittest discover -s scripts -p 'test_*.py'`: **38 ran, 8 failures, 2 errors**. Some checks assert older code shapes or duplicate environment settings; they should be reconciled against actual requirements, not silently disabled.
- `npm ci --offline --legacy-peer-deps --ignore-scripts`: failed `ENOTCACHED` because `zod@4.6.7` package was not cached. No TypeScript build/lint/web integration run completed here.
- Android Gradle/SDK builds not run; **no new APK** was generated from this archive.
- No Worker deployment or real HTTP end-to-end verification was performed.

## Release gate

Do not deploy the patched source until: web dependencies install, real web tests and Worker smoke checks pass, source is compared with the existing Worker, missing SQL migrations 0011–0016 are accounted for, existing D1 data is protected, and website email delivery is configured with a secure domain-scoped key. Keep Access, payment flags and domain routing unchanged.
