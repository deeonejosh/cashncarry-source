// Staging-only, same-origin chat handler. Mount as POST /api/chat in the
// existing marketplace Worker; do not expose this as a cross-origin endpoint.
// Requires env.AUTH_DB, env.CHAT_LIMITER and env.OPENAI_API_KEY.
const reply=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("");
export async function handleShoppingChat(request,env){
  const url=new URL(request.url);
  if(request.method!=="POST")return reply({error:"Method not allowed"},405);
  if(url.protocol!=="https:"||request.headers.get("origin")!==url.origin)return reply({error:"Invalid origin"},403);
  if(!env.AUTH_DB||!env.CHAT_LIMITER||!env.OPENAI_API_KEY)return reply({error:"Chat unavailable"},503);
  const cookie=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith("__Host-cnc_session="))?.slice("__Host-cnc_session=".length);
  if(!cookie||!/^[a-f0-9]{64}$/.test(cookie))return reply({error:"Sign in required"},401);
  const hash=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(cookie)));
  const user=await env.AUTH_DB.prepare("SELECT u.id FROM cnc_auth_sessions s JOIN cnc_auth_users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND u.verified=1 AND u.suspended=0 AND u.role IN ('buyer','seller')").bind(hash,Date.now()).first();
  if(!user?.id)return reply({error:"Session expired"},401);
  const limit=await env.CHAT_LIMITER.limit({key:"ai:"+user.id});
  if(!limit.success)return reply({error:"Too many requests"},429);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return reply({error:"JSON required"},415);
  if(Number(request.headers.get("content-length")||0)>8192)return reply({error:"Request too large"},413);
  let input;try{input=await request.text();if(input.length>8192)return reply({error:"Request too large"},413);input=JSON.parse(input)}catch{return reply({error:"Invalid JSON"},400)}
  if(typeof input.message!=="string"||!input.message.trim()||input.message.length>2000)return reply({error:"Invalid message"},400);
  let upstream;try{upstream=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"authorization":"Bearer "+env.OPENAI_API_KEY,"content-type":"application/json"},body:JSON.stringify({model:"gpt-4.1-mini",instructions:"You are Cash N Carry Nigeria's shopping assistant. Never invent stock, prices, orders or payment status. Never ask for passwords or payment card details.",input:input.message.trim(),max_output_tokens:350,store:false}),signal:AbortSignal.timeout(20000)})}catch{return reply({error:"Chat provider unavailable"},502)}
  if(!upstream.ok)return reply({error:"Chat provider unavailable"},502);
  const result=await upstream.json();
  const message=(result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n").trim();
  return message?reply({reply:message}):reply({error:"Empty response"},502);
}
