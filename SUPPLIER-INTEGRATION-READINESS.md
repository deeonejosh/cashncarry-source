# Cash N Carry — Supplier Integration Readiness (Staging Only)

**Status:** NOT CONNECTED. No Banggood or Nigerian supplier credentials are known or used. Do not claim suppliers, inventory, dropshipping or tracking integrations are operational.

## Workflow (gated)

1. Store supplier credentials only as Cloudflare Worker secrets (never in frontend, Android APK or Git history).
2. Allow authorised administrators to configure supplier identity, origin country, currency, delivery service, API permissions and import schedule.
3. Fetch catalogue with a read-only supplier API after vendor permission is confirmed. Validate title, images, variants, remote SKU, available quantity, price, return terms, and supplier identity.
4. Stage imported records as unpublished, with deduplication by `(supplier_id, supplier_sku, variant_id)` and an immutable source snapshot. Prevent zero or negative stock and unsafe product categories.
5. Calculate provisional costs in minor units, using an audited configurable margin and exchange-rate source; label prices as provisional until quotes are approved. Never convert unverified costs to a final buyer payable amount.
6. Require explicit admin approval before publishing. Preserve moderation and update revision history. If supplier inventory sync fails or is stale, fail closed rather than oversell.
7. Checkout must display supplier origin, verified estimate, shipping, customs disclosure and returns, with explicit buyer acknowledgement for international shipments. Never obscure statutory refund remedies.
8. On a *real* paid order, create a pending fulfilment task for admin review. Supplier orders require separately approved authorisation; never auto-pay or auto-forward a customer order on mere import success.
9. Correlate supplier order references with marketplace order IDs without exposing other sellers' records. Update tracking and handle delays/cancellations/disputes under owner-approved policy.

## Integration readiness matrix

| Capability | Current verified state | Blocker |
|---|---|---|
| Supplier account/API | Not connected | Vendor approval and API credentials |
| Import, dedupe, approval | No integrated provider adapter | Backend schema, authenticated admin workflow and tests |
| Price/stock sync | Not connected | Supplier API/stock endpoints and quote rules |
| International shipping & customs | Not connected | Verified carrier service, estimates, duties disclosures |
| Supplier orders | Intentionally not automated | Merchant contract and explicit owner approval |
| Returns and defective goods | Existing policy page, no supplier policy sync | Counsel-reviewed and provider-specific returns process |

This document is design readiness, not an active supplier integration or approval to spend funds.
