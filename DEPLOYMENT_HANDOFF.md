# Deploy the new customer source to existing private Cloudflare staging

1. Extract the full ZIP and commit actual folders `web/`, `app/`, `gradle/`, `scripts/`, `.github/` to a dedicated staging branch; GitHub currently has legacy ZIP archives only.
2. Use `.github/workflows/verify-existing-private-staging.yml` manual run. It does **not deploy**.
3. Only after successful lint, web build, 26-route Chromium tests and Android unit/APK build, deploy as described in `web/deploy/chatgpt-sites/DEPLOYMENT-GUIDE.md` using **top-level** wrangler configuration.
4. Preserve Cloudflare Access, shared D1, Resend secret, disabled payments and all DNS records.
5. Confirm QA/ZIP/demo-account controls are absent from actual authenticated staging screenshots.

Live site and production DNS remain out of scope.
