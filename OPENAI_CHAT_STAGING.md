# OpenAI Chat — staging integration

This repository currently stores Cash N Carry source as ZIP archives. This addition is a **standalone Cloudflare Pages Function**, not an integration into the archived application. It does not change the deployed site.

## Files
- `functions/api/chat.js`: POST /api/chat with JSON `{"message":"Hello"}`.

## Before staging deployment
1. Extract/identify the actual active application source and confirm its hosting architecture. **Cloudflare Pages Functions only work with a compatible Pages deployment**; Workers-only deployments require adapting the handler.
2. Add `OPENAI_API_KEY` as a Cloudflare secret (never commit it); optionally configure `OPENAI_MODEL`.
3. Restrict the endpoint to your authenticated users or implement robust rate limiting and abuse controls before exposing it publicly. The included endpoint has **no authentication or rate limiting** and is **not production-ready**.
4. Verify billing, allowed model, endpoint availability, and response shape.
5. Build and test a frontend chat UI separately, including error states, before wiring it to this endpoint.
6. Test only on private staging; do not deploy to production without approval.

## Example
```bash
curl -X POST https://YOUR-STAGING-DOMAIN/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello"}'
```
