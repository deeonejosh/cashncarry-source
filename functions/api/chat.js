// Cloudflare Pages Function: POST /api/chat
// Configure OPENAI_API_KEY as a Cloudflare secret and optionally OPENAI_MODEL.
// This endpoint is intentionally not deployed or wired to a frontend yet.
export async function onRequestPost({ request, env }) {
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 12000) return json({ error: "Request too large." }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const message = body?.message;
  if (typeof message !== "string" || !message.trim()) {
    return json({ error: "A message is required." }, 400);
  }
  if (message.length > 4000) return json({ error: "Message is too long." }, 413);
  if (!env.OPENAI_API_KEY) return json({ error: "Chat service is not configured." }, 503);

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4.1-mini",
        input: message.trim(),
        max_output_tokens: 500,
        store: false,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok) {
      console.error("OpenAI returned HTTP", upstream.status);
      return json({ error: "Could not get a response." }, 502);
    }
    const result = await upstream.json();
    const reply = (result.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text || "")
      .join("\n").trim();
    if (!reply) return json({ error: "No reply was generated." }, 502);
    return json({ reply });
  } catch (error) {
    console.error("Chat request failed:", error?.name || "unknown");
    return json({ error: "Could not get a response." }, 502);
  }
}

export async function onRequestGet() {
  return new Response(JSON.stringify({ error: "Method not allowed." }), {
    status: 405,
    headers: { "content-type": "application/json", allow: "POST" },
  });
}
