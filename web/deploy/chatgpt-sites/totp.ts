export async function verifyTotp(secret: string, code: string, now: number): Promise<number | null> {
  if (!/^[a-f0-9]{40,128}$/i.test(secret) || secret.length % 2 || !/^\d{6}$/.test(code)) return null;
  const bytes = Uint8Array.from(secret.match(/../g)!, pair => Number.parseInt(pair,16));
  const key = await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const current = Math.floor(now / 30000);
  for (const step of [current,current-1,current+1]) {
    const counter = new ArrayBuffer(8);
    new DataView(counter).setBigUint64(0,BigInt(step));
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC',key,counter));
    const offset = mac[mac.length-1] & 15;
    const expected = String((new DataView(mac.buffer).getUint32(offset) & 0x7fffffff) % 1000000).padStart(6,'0');
    let mismatch=0;
    for (let i=0;i<6;i++) mismatch |= expected.charCodeAt(i) ^ code.charCodeAt(i);
    if (!mismatch) return step;
  }
  return null;
}
