# Cash N Carry — permanent staging frontend replacement

## What this package changes

The previous staging Worker uploaded a cleaned React bundle inside `cleaned-bundle.txt`, but Cloudflare static assets were configured with `serve_directly: true` and `raw_run_worker_first: false`. Consequently, requests for the original JS bundle were served directly and bypassed the Worker-side cleanup. Two hotfixes therefore did not affect the real UI.

This package **replaces the static assets themselves**. The V17 React bundle was patched to remove the entire dark-green QA/demo toolbar and the QA/ZIP links in the footer. The clean JS is now named `/assets/index-clean-20261116.js`; index.html points to that filename to break browser caches. The public HTML file masquerading as a V17 staging ZIP was removed from the assets. The old JS filename is absent from this release.

## Target and safeguards

- Existing private staging Worker: `cashncarry-d1-staging-worker`.
- Existing D1 bindings: `DB` and `AUTH_DB` point to `cashncarry-d1-staging`.
- Preserve Cloudflare Access to the staging hostname. Do not change the production domain/DNS.
- Preserve `AUTH_RESEND_API_KEY` as a Worker **secret**. Never put secret values into this ZIP.
- Payments, purchased coins, and KYC uploads remain disabled.
- No D1 migrations or records should be changed by this redeployment.

## Deployment

1. Verify the Worker in the current Cloudflare account is `cashncarry-d1-staging-worker` (not a new staging Worker).
2. In a machine or CI runner with Wrangler v4 installed and authenticated to the correct Cloudflare account, extract this ZIP into a temporary directory.
3. Run `npx wrangler deploy --config wrangler.jsonc` **from that directory**. Do not use `--env staging` because this deployment uses a single top-level staging configuration.
4. Confirm the deployed version reports a static-asset manifest including `/assets/index-clean-20261116.js` and `index.html`; confirm `/assets/index-mIkMM3kr.js` is no longer in the new version.
5. Confirm `AUTH_RESEND_API_KEY`, `DB`, `AUTH_DB` and the Cloudflare Access application are still present; verify payment flags remain `false`.
6. Test the protected staging page on desktop and mobile. Check QA, QA Suite, V17 Staging ZIP, Export ZIP, Private Staging toolbar and Chidi Okafor/BUYER demo identity are absent. Then test Sign In and registration email.
7. Invalidate old browser caches or open the URL in a private tab to verify the newest HTML loads the changed JS filename.

## Current status

The **compiled bundle and source are corrected**, but this ZIP **has not been uploaded to Cloudflare** from this chat. The in-chat Cloudflare connector can update a Worker script, but does not expose a way to upload the binary static-asset directory already present in the local container. The recent Worker script deployments did not change Cloudflare's asset-first routing. Do not claim the deployed page is repaired until the new static asset manifest and browser view are verified.

## Offline verification

`node --check _worker.js` and `node --check public/assets/index-clean-20261116.js` passed. Source string inspection found none of the unwanted QA or ZIP labels. Asset reference consistency, removed ZIP HTML and staging worker configuration checks passed.
