// Cloudflare Pages same-origin /api/chat route.
// Authentication, origin validation, rate limiting, and OpenAI calls are
// implemented in the shared staging handler. Requires AUTH_DB (D1 with
// cnc_auth_users and cnc_auth_sessions), CHAT_LIMITER, OPENAI_API_KEY.
// Do not deploy without verifying bindings and signed-in smoke tests.
import { handleShoppingChat } from "../../deploy/chatgpt-sites/shopping-chat-auth.ts";

export async function onRequestPost({ request, env }) {
  return handleShoppingChat(request, env);
}

export async function onRequestGet() {
  return Response.json({ error: "Method not allowed" }, {
    status: 405,
    headers: { allow: "POST", "cache-control": "no-store" },
  });
}
