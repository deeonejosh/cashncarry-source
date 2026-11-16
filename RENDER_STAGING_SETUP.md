# Cash N Carry — CURRENT Render Free staging setup

The previous paid Render Starter/disk configuration has been superseded.
**Do not provision the old paid service or attach a disk.**

The staging branch's `render.yaml` now declares a **Free** Node web service, no disk, manual deployment only.

## Required before deploying
1. Extract and commit the latest complete source ZIP to branch `feature/node-platform-phase1`: `server/`, `web/`, `app/`, `gradle/`, `scripts/`, root Gradle files, and CI workflow. This repo currently has the Blueprint but NOT the new full Node application.
2. Set Render secret `CNC_NEON_DATABASE_URL` to the existing *Neon* project `cashncarry-staging`, database `cashncarry_staging` (never paste secrets into GitHub).
3. Keep `CNC_VIDEO_STORAGE_MODE=disabled`, payments, coins and KYC uploads disabled. Render Free filesystem is ephemeral.
4. Verify Node and source tests, actual Neon staging migrations, and `/api/health` before distributing an Android APK. Do not auto-deploy or touch `cashncarryng.com`.
5. Cloudflare Stream may generate metered charges; do not enable paid media for free-only validation.

The complete source ZIP also contains `FREE_STAGING_SETUP.md` and `FREE_STAGING_CHANGE_REPORT.md`. Only staging resources are in scope.
