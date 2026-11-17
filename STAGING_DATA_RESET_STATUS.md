# Cash N Carry — Existing Cloudflare Private Staging Data Reset

Checked: 2026-11-16 (UTC)

## Current remote staging D1 verification
- Database: `cashncarry-d1-staging` (`9a2cdbee-e030-4b10-908b-b10b8142d2aa`), shared by private web Worker and mobile staging API.
- All **38 application-data tables** were queried and had **zero rows** at the final read-back.
- `cnc_auth_users`: 0; `cnc_auth_sessions`: 0; `products` and `cnc_seller_products`: 0; `stores` and `cnc_seller_stores`: 0; `cnc_orders`: 0; `cnc_short_videos`: 0.
- Preserved schema, 17 applied migration records, 8 category taxonomy records, and Cloudflare internal `_cf_KV` table.
- Cloudflare Stream reported **0 stored videos** in the connected account at time of check. Account-wide Stream live inputs are not the same as video recordings and were not deleted, as they are not identified as belonging exclusively to this staging application.
- R2 bucket list returned no buckets.
- No Worker, DNS, deployment, Cloudflare Access policy, Resend secret, or domain was changed as part of this check.

## Preventing example listings returning in a new database
- Updated `web/deploy/chatgpt-sites/migrations/0010_catalog_schema_and_seed.sql` **in this source package only** to preserve the table definitions and eight category records, but remove the five example seller/store inserts and eight example product inserts.
- Added `test_no_demonstration_products_or_stores_seeded` to `scripts/test_existing_private_staging.py`.
- Confirmed the updated migration against in-memory SQLite: categories=8, stores=0, products=0.
- `python -m unittest scripts.test_existing_private_staging -q`: **15/15 passed**.
- An unrelated broader legacy suite still has outdated expectations for an old staging structure; it is not a passing release gate.

## Scope and caveats
- The empty D1 state was verified remotely. This report does not claim that a deletion was executed in this tool session; the data was already absent when the final verification ran.
- Source patch is local and **not deployed** to the existing Cloudflare Worker or pushed to GitHub.
- If the site or installed Android app still displays stale demo listings, check its browser cache/bundled app version or another backend; the inspected staging D1 is empty.
- Don't reapply old seed-bearing migrations from older packages, and don't reset categories/migration records.
