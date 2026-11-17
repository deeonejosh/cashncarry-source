# Cash N Carry Nigeria — existing private Cloudflare staging

This package is based on the supplied **void.zip**. It does **not** recreate a website or create a new staging database.

- Web staging (Cloudflare Access): `https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev`
- Android staging API: `https://cashncarry-mobile-staging-api.cashncarry-workforce-2026.workers.dev`
- Shared staging D1: `cashncarry-d1-staging`
- Payments, coin purchases, and KYC uploads: disabled

Read `EXISTING_STAGING_DEPLOYMENT.md` before any deployment. Do not apply the migrations in this archive to the populated D1 without an independent migration comparison and backup. No production routes or DNS changes are included.
