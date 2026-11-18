// deploy/chatgpt-sites/reservation-expiry.ts
async function expireUnpaidReservations(db) {
  return db.prepare(`INSERT INTO cnc_reservation_expiries (order_id)
    SELECT o.id FROM cnc_orders o
    WHERE o.status='awaiting_payment' AND o.created<=unixepoch()-1800
      AND NOT EXISTS (SELECT 1 FROM cnc_flutterwave_payments p WHERE p.order_id=o.id)
    ORDER BY o.created,o.id LIMIT 25
    ON CONFLICT(order_id) DO NOTHING`).run();
}

// deploy/chatgpt-sites/auth-email.ts
function emailConfigured(env) {
  return Boolean(env.AUTH_EMAIL || env.AUTH_RESEND_API_KEY && env.AUTH_EMAIL_FROM);
}
function htmlEscape(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return value.replace(/[&<>"']/g, (ch) => entities[ch] ?? ch);
}
function renderAuthEmail(token, purpose) {
  const code = htmlEscape(token);
  const verify = purpose === "verify";
  const subject = verify ? "Your Cash N Carry verification code" : "Reset your Cash N Carry password";
  const action = verify ? "Verify your email" : "Reset your password";
  const lead = verify ? "Enter this code to verify your Cash N Carry account." : "Enter this code to reset your Cash N Carry password.";
  const text4 = [
    action,
    "",
    lead,
    "",
    token,
    "",
    "This code expires in 15 minutes.",
    "If you did not request this code, ignore this message. Never share your code.",
    "",
    "Cash N Carry Nigeria \u2014 secure account access"
  ].join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px;background:#f5f8f6;font-family:Arial,Helvetica,sans-serif;color:#142d24">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dce9df;border-radius:18px">
<tr><td style="background:#106b43;padding:24px 28px;border-radius:18px 18px 0 0"><span style="color:#ffffff;font-size:24px;font-weight:800">Cash N Carry</span><span style="color:#ff8a00;font-size:24px;font-weight:800">.</span></td></tr>
<tr><td style="padding:28px"><h1 style="font-size:24px;margin:0 0 16px;color:#16372b">${htmlEscape(action)}</h1><p style="line-height:1.6;font-size:16px">${htmlEscape(lead)}</p>
<p style="margin:26px 0;padding:18px;background:#eff8f2;border:1px solid #cfe8d8;border-radius:12px"><code style="display:block;text-align:center;word-break:break-all;overflow-wrap:anywhere;font-family:Consolas,Monaco,monospace;letter-spacing:1px;line-height:1.65;font-size:15px;color:#0b6139">${code}</code></p>
<p style="font-size:14px;line-height:1.6">Your code expires in <strong>15 minutes</strong>. Never share it with anyone.</p>
<p style="font-size:13px;color:#63756c;border-top:1px solid #e9eeeb;padding-top:18px">Didn't request this? You can safely ignore this email.</p></td></tr>
<tr><td style="padding:18px 28px;color:#6a7b70;font-size:12px;background:#f4f8f5;border-radius:0 0 18px 18px">Cash N Carry Nigeria &middot; Secure account notification</td></tr>
</table></body></html>`;
  return { subject, text: text4, html };
}
async function deliverAuthEmail(env, email, token, purpose, requestId) {
  const signal = AbortSignal.timeout(8e3);
  const rendered = renderAuthEmail(token, purpose);
  const response2 = env.AUTH_EMAIL ? await env.AUTH_EMAIL.fetch(new Request("https://auth-mail.internal/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, token, purpose }),
    signal
  })) : await fetch("https://api.resend.com/emails", {
    method: "POST",
    redirect: "manual",
    signal,
    headers: {
      authorization: `Bearer ${env.AUTH_RESEND_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": `cashncarry-auth/${requestId}`
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM,
      to: [email],
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html
    })
  });
  await response2.body?.cancel();
  if (!response2.ok) throw new Error("Authentication email provider rejected delivery");
}

// deploy/chatgpt-sites/totp.ts
async function verifyTotp(secret, code, now) {
  if (!/^[a-f0-9]{40,128}$/i.test(secret) || secret.length % 2 || !/^\d{6}$/.test(code)) return null;
  const bytes = Uint8Array.from(secret.match(/../g), (pair) => Number.parseInt(pair, 16));
  const key = await crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const current = Math.floor(now / 3e4);
  for (const step of [current, current - 1, current + 1]) {
    const counter = new ArrayBuffer(8);
    new DataView(counter).setBigUint64(0, BigInt(step));
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter));
    const offset = mac[mac.length - 1] & 15;
    const expected = String((new DataView(mac.buffer).getUint32(offset) & 2147483647) % 1e6).padStart(6, "0");
    let mismatch = 0;
    for (let i = 0; i < 6; i++) mismatch |= expected.charCodeAt(i) ^ code.charCodeAt(i);
    if (!mismatch) return step;
  }
  return null;
}

// node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
var atitle = (title) => title ? `"${title}" ` : "";
function anumber(n, title = "") {
  if (typeof n !== "number")
    throw new TypeError(atitle(title) + "expected number, got " + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
  return n;
}
function abytes(value, length, title = "") {
  if (isBytes(value) && (length === void 0 || value.length === length))
    return value;
  if (length !== void 0)
    anumber(length, "length");
  const bytes = isBytes(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes)
    throw new TypeError(message);
  throw new RangeError(message);
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new TypeError("expected hash wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
  if (h.outputLen < 1 || h.blockLen < 1)
    throw new Error("hash blockLen / outputLen must be >= 1");
}
var aobject = (value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
var aopts = (value, label) => {
  aobject(value, label);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null)
    throw new TypeError(`"${label}" expected plain object`);
  if (Object.hasOwn(value, "__proto__"))
    throw new TypeError(`"${label}.__proto__" is not allowed`);
};
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("hash was destroyed");
  if (checkFinished && instance.finished)
    throw new Error("digest() was already called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "output");
  const min = instance.outputLen;
  if (!(out.length >= min)) {
    throw new RangeError('"output" expected length >= ' + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function rotl(word, shift) {
  return word << shift | word >>> 32 - shift >>> 0;
}
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
var swap32IfBE = isLE ? (u) => u : byteSwap32;
function nextTick(onReject) {
  const host = globalThis;
  if (typeof host.scheduler?.yield === "function") {
    const promise = host.scheduler.yield();
    if (onReject)
      promise.catch(onReject);
    return promise;
  }
  return new Promise((resolve) => host.setTimeout(resolve, 0));
}
async function asyncLoop(iters, tick, cb, onReject) {
  anumber(iters, "iters");
  anumber(tick, "tick");
  if (typeof cb !== "function")
    throw new TypeError("callback must be a function");
  let ts = Date.now();
  for (let i = 0; i < iters; i++) {
    cb(i);
    const diff = Date.now() - ts;
    if (diff >= 0 && diff < tick)
      continue;
    await nextTick(onReject);
    ts = Date.now();
  }
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new TypeError("string expected");
  const encoded = new TextEncoder().encode(str);
  try {
    return new Uint8Array(encoded);
  } finally {
    clean(encoded);
  }
}
function kdfInputToBytes(data, errorTitle = "") {
  if (typeof data === "string")
    return utf8ToBytes(data);
  return abytes(data, void 0, errorTitle);
}
function checkOpts(defaults, opts, title = "opts") {
  aopts(defaults, "defaults");
  if (opts !== void 0)
    aopts(opts, title);
  const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
  return merged;
}
function createHasher(hashCons, info = {}) {
  if (typeof hashCons !== "function")
    throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
  info = checkOpts({}, info, "info");
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
var oidNist = (suffix) => ({
  // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
  // Larger suffix values would need base-128 OID encoding and a different length byte.
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
});

// node_modules/@noble/hashes/hmac.js
var _HMAC = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  canXOF = false;
  finished = false;
  destroyed = false;
  constructor(hash, key) {
    ahash(hash);
    abytes(key, void 0, "key");
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("expected Hash instance");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54;
    this.iHash.update(pad);
    this.oHash = hash.create();
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54 ^ 92;
    this.oHash.update(pad);
    clean(pad);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const buf = out.subarray(0, this.outputLen);
    this.iHash.digestInto(buf);
    this.oHash.update(buf);
    this.oHash.digestInto(buf);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.canXOF = canXOF;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = /* @__PURE__ */ (() => {
  const hmac_ = ((hash, key, message) => new _HMAC(hash, key).update(message).digest());
  hmac_.create = (hash, key) => new _HMAC(hash, key);
  return hmac_;
})();

// node_modules/@noble/hashes/pbkdf2.js
function pbkdf2Init(hash, _password, _salt, _opts) {
  ahash(hash);
  const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
  const { c, dkLen, asyncTick } = opts;
  anumber(c, "c");
  anumber(dkLen, "dkLen");
  anumber(asyncTick, "asyncTick");
  if (c < 1)
    throw new Error('"c" (iterations) must be >= 1');
  if (dkLen < 1)
    throw new Error('"dkLen" must be >= 1');
  if (dkLen > (2 ** 32 - 1) * hash.outputLen)
    throw new Error("derived key too long");
  const p = kdfInputToBytes(_password, "password");
  try {
    const s = kdfInputToBytes(_salt, "salt");
    try {
      const DK = new Uint8Array(dkLen);
      const { iHash, oHash, outputLen } = hmac.create(hash, p);
      const u = new Uint8Array(outputLen);
      const eng = pbkdf2Engine(iHash, oHash, s, u);
      return { c, dkLen, asyncTick, DK, outputLen, eng };
    } finally {
      if (typeof _salt === "string")
        clean(s);
    }
  } finally {
    if (typeof _password === "string")
      clean(p);
  }
}
function pbkdf2Engine(iHash, oHash, salt, u) {
  const counter = new Uint8Array(4);
  const view = createView(counter);
  const salted = iHash._cloneInto().update(salt);
  const work = oHash._cloneInto();
  const iClone = iHash._cloneInto;
  const oClone = oHash._cloneInto;
  return {
    u1: (ti, Ti) => {
      view.setInt32(0, ti, false);
      salted._cloneInto(work).update(counter).digestInto(u);
      oHash._cloneInto(work).update(u).digestInto(u);
      Ti.set(u.subarray(0, Ti.length));
    },
    // Whole `F` inner loop for the sync variant: one optimized function owns the hot loop.
    rounds: (c, Ti) => {
      for (let ui = 1; ui < c; ui++) {
        iClone.call(iHash, work).update(u).digestInto(u);
        oClone.call(oHash, work).update(u).digestInto(u);
        for (let i = 0; i < Ti.length; i++)
          Ti[i] ^= u[i];
      }
    },
    output: (DK) => {
      iHash.destroy();
      oHash.destroy();
      salted.destroy();
      work.destroy();
      clean(u);
      return DK;
    }
  };
}
function pbkdf2(hash, password, salt, opts) {
  const { c, dkLen, DK, outputLen, eng } = pbkdf2Init(hash, password, salt, opts);
  for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += outputLen) {
    const Ti = DK.subarray(pos, pos + outputLen);
    eng.u1(ti, Ti);
    eng.rounds(c, Ti);
  }
  return eng.output(DK);
}

// node_modules/@noble/hashes/_u64.js
var fromNumH = (n) => n / 2 ** 32 | 0;
var fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE2) {
  const h = fromNumH(n);
  const l = fromNumL(n);
  view.setUint32(byteOffset, isLE2 ? l : h, isLE2);
  view.setUint32(byteOffset + 4, isLE2 ? h : l, isLE2);
}

// node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class {
  blockLen;
  outputLen;
  canXOF = false;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = false;
  length = 0;
  pos = 0;
  destroyed = false;
  constructor(blockLen, outputLen, padOffset, isLE2) {
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE2;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    let processed = false;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        processed = true;
        continue;
      }
      buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
        processed = true;
      }
    }
    this.length += data.length;
    if (processed)
      this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE: isLE2 } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    buffer.fill(0, pos);
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      buffer.fill(0);
    }
    setU64FromNum(view, blockLen - 8, this.length * 8, isLE2);
    this.process(view, 0);
    this.roundClean();
    const oview = out === buffer ? view : createView(out);
    const len = this.outputLen;
    const outLen = len / 4;
    const state = this.get();
    if (len % 4 || outLen > state.length)
      throw new Error("invalid outputLen");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE2);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneIntoMeta(to) {
    const { buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (pos)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);

// node_modules/@noble/hashes/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA2_32B = class extends HashMD {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  // Numeric initializers matter: starting the fields as `undefined` changes
  // V8's field representation and makes sha256 3x slower (measured).
  A = 0;
  B = 0;
  C = 0;
  D = 0;
  E = 0;
  F = 0;
  G = 0;
  H = 0;
  constructor(outputLen, IV) {
    super(64, outputLen, 8, false);
    this.A = IV[0] | 0;
    this.B = IV[1] | 0;
    this.C = IV[2] | 0;
    this.D = IV[3] | 0;
    this.E = IV[4] | 0;
    this.F = IV[5] | 0;
    this.G = IV[6] | 0;
    this.H = IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  _cloneInto(to) {
    (to ||= new this.constructor()).set(...this.get());
    return this._cloneIntoMeta(to);
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    clean(SHA256_W);
  }
  destroy() {
    this.destroyed = true;
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var _SHA256 = class extends SHA2_32B {
  constructor() {
    super(32, SHA256_IV);
  }
};
var sha256 = /* @__PURE__ */ createHasher(
  () => new _SHA256(),
  /* @__PURE__ */ oidNist(1)
);

// node_modules/@noble/hashes/scrypt.js
function XorAndSalsa(prev, pi, input, ii, out, oi) {
  let y00 = prev[pi++] ^ input[ii++], y01 = prev[pi++] ^ input[ii++];
  let y02 = prev[pi++] ^ input[ii++], y03 = prev[pi++] ^ input[ii++];
  let y04 = prev[pi++] ^ input[ii++], y05 = prev[pi++] ^ input[ii++];
  let y06 = prev[pi++] ^ input[ii++], y07 = prev[pi++] ^ input[ii++];
  let y08 = prev[pi++] ^ input[ii++], y09 = prev[pi++] ^ input[ii++];
  let y10 = prev[pi++] ^ input[ii++], y11 = prev[pi++] ^ input[ii++];
  let y12 = prev[pi++] ^ input[ii++], y13 = prev[pi++] ^ input[ii++];
  let y14 = prev[pi++] ^ input[ii++], y15 = prev[pi++] ^ input[ii++];
  let x00 = y00, x01 = y01, x02 = y02, x03 = y03, x04 = y04, x05 = y05, x06 = y06, x07 = y07, x08 = y08, x09 = y09, x10 = y10, x11 = y11, x12 = y12, x13 = y13, x14 = y14, x15 = y15;
  for (let i = 0; i < 8; i += 2) {
    x04 ^= rotl(x00 + x12 | 0, 7);
    x08 ^= rotl(x04 + x00 | 0, 9);
    x12 ^= rotl(x08 + x04 | 0, 13);
    x00 ^= rotl(x12 + x08 | 0, 18);
    x09 ^= rotl(x05 + x01 | 0, 7);
    x13 ^= rotl(x09 + x05 | 0, 9);
    x01 ^= rotl(x13 + x09 | 0, 13);
    x05 ^= rotl(x01 + x13 | 0, 18);
    x14 ^= rotl(x10 + x06 | 0, 7);
    x02 ^= rotl(x14 + x10 | 0, 9);
    x06 ^= rotl(x02 + x14 | 0, 13);
    x10 ^= rotl(x06 + x02 | 0, 18);
    x03 ^= rotl(x15 + x11 | 0, 7);
    x07 ^= rotl(x03 + x15 | 0, 9);
    x11 ^= rotl(x07 + x03 | 0, 13);
    x15 ^= rotl(x11 + x07 | 0, 18);
    x01 ^= rotl(x00 + x03 | 0, 7);
    x02 ^= rotl(x01 + x00 | 0, 9);
    x03 ^= rotl(x02 + x01 | 0, 13);
    x00 ^= rotl(x03 + x02 | 0, 18);
    x06 ^= rotl(x05 + x04 | 0, 7);
    x07 ^= rotl(x06 + x05 | 0, 9);
    x04 ^= rotl(x07 + x06 | 0, 13);
    x05 ^= rotl(x04 + x07 | 0, 18);
    x11 ^= rotl(x10 + x09 | 0, 7);
    x08 ^= rotl(x11 + x10 | 0, 9);
    x09 ^= rotl(x08 + x11 | 0, 13);
    x10 ^= rotl(x09 + x08 | 0, 18);
    x12 ^= rotl(x15 + x14 | 0, 7);
    x13 ^= rotl(x12 + x15 | 0, 9);
    x14 ^= rotl(x13 + x12 | 0, 13);
    x15 ^= rotl(x14 + x13 | 0, 18);
  }
  out[oi++] = y00 + x00 | 0;
  out[oi++] = y01 + x01 | 0;
  out[oi++] = y02 + x02 | 0;
  out[oi++] = y03 + x03 | 0;
  out[oi++] = y04 + x04 | 0;
  out[oi++] = y05 + x05 | 0;
  out[oi++] = y06 + x06 | 0;
  out[oi++] = y07 + x07 | 0;
  out[oi++] = y08 + x08 | 0;
  out[oi++] = y09 + x09 | 0;
  out[oi++] = y10 + x10 | 0;
  out[oi++] = y11 + x11 | 0;
  out[oi++] = y12 + x12 | 0;
  out[oi++] = y13 + x13 | 0;
  out[oi++] = y14 + x14 | 0;
  out[oi++] = y15 + x15 | 0;
}
function BlockMix(input, ii, out, oi, r) {
  let head = oi + 0;
  let tail = oi + 16 * r;
  for (let i = 0; i < 16; i++)
    out[tail + i] = input[ii + (2 * r - 1) * 16 + i];
  for (let i = 0; i < r; i++, head += 16, ii += 16) {
    XorAndSalsa(out, tail, input, ii, out, head);
    if (i > 0)
      tail += 16;
    XorAndSalsa(out, head, input, ii += 16, out, tail);
  }
}
var SCRYPT_DEFAULT_MAXMEM = 128 * 8 * (2 ** 20 + 1 + 1);
function scryptInit(password, salt, _opts) {
  const opts = checkOpts({
    dkLen: 32,
    asyncTick: 10,
    maxmem: SCRYPT_DEFAULT_MAXMEM
  }, _opts);
  const { N, r, p, dkLen, asyncTick, maxmem, onProgress } = opts;
  anumber(N, "N");
  anumber(r, "r");
  anumber(p, "p");
  anumber(dkLen, "dkLen");
  anumber(asyncTick, "asyncTick");
  anumber(maxmem, "maxmem");
  if (onProgress !== void 0 && typeof onProgress !== "function")
    throw new Error('"onProgress" must be a function');
  if (r < 1)
    throw new Error('"r" expected integer >= 1');
  const blockSize = 128 * r;
  const blockSize32 = blockSize / 4;
  const pow32 = Math.pow(2, 32);
  if (N <= 1 || (N & N - 1) !== 0 || N > pow32)
    throw new Error('"N" expected a power of 2, and 2^1 <= N <= 2^32');
  if (p < 1 || p > (pow32 - 1) * 32 / blockSize)
    throw new Error('"p" expected integer 1..((2^32 - 1) * 32) / (128 * r)');
  if (dkLen < 1 || dkLen > (pow32 - 1) * 32)
    throw new Error('"dkLen" expected integer 1..(2^32 - 1) * 32');
  const memUsed = blockSize * (N + p + 1);
  if (memUsed > maxmem)
    throw new Error('"maxmem" limit was hit: memUsed(128*r*(N+p+1))=' + memUsed + ", maxmem=" + maxmem);
  const B = pbkdf2(sha256, password, salt, { c: 1, dkLen: blockSize * p });
  const B32 = u32(B);
  const V = u32(new Uint8Array(blockSize * N));
  const tmp = u32(new Uint8Array(blockSize));
  let blockMixCb = () => {
  };
  if (onProgress) {
    const totalBlockMix = 2 * N * p;
    const callbackPer = Math.max(Math.floor(totalBlockMix / 1e4), 1);
    let blockMixCnt = 0;
    blockMixCb = () => {
      blockMixCnt++;
      if (onProgress && (!(blockMixCnt % callbackPer) || blockMixCnt === totalBlockMix)) {
        try {
          onProgress(blockMixCnt / totalBlockMix);
        } catch (e) {
          clean(B, V, tmp);
          throw e;
        }
      }
    };
  }
  return { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb, asyncTick };
}
function scryptOutput(password, dkLen, B, V, tmp) {
  const res = pbkdf2(sha256, password, B, { c: 1, dkLen });
  clean(B, V, tmp);
  return res;
}
async function scryptAsync(password, salt, opts) {
  const { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb, asyncTick } = scryptInit(password, salt, opts);
  const abort = () => clean(B, V, tmp);
  swap32IfBE(B32);
  for (let pi = 0; pi < p; pi++) {
    const Pi = blockSize32 * pi;
    for (let i = 0; i < blockSize32; i++)
      V[i] = B32[Pi + i];
    let pos = 0;
    await asyncLoop(N - 1, asyncTick, () => {
      BlockMix(V, pos, V, pos += blockSize32, r);
      blockMixCb();
    }, abort);
    BlockMix(V, (N - 1) * blockSize32, B32, Pi, r);
    blockMixCb();
    await asyncLoop(N, asyncTick, () => {
      const j = (B32[Pi + blockSize32 - 16] & N - 1) >>> 0;
      for (let k = 0; k < blockSize32; k++)
        tmp[k] = B32[Pi + k] ^ V[j * blockSize32 + k];
      BlockMix(tmp, 0, B32, Pi, r);
      blockMixCb();
    }, abort);
  }
  swap32IfBE(B32);
  return scryptOutput(password, dkLen, B, V, tmp);
}

// deploy/chatgpt-sites/new-auth.ts
var cookie = "__Host-cnc_session";
var encoder = new TextEncoder();
var hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
var random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
var sha = async (text4) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text4))));
var tokenFormat = /^[a-f0-9]{64}$/;
var sessionSeconds = 8 * 60 * 60;
async function derive(password, salt) {
  return hex(await scryptAsync(encoder.encode(password), encoder.encode(salt), {
    N: 32768,
    r: 8,
    p: 3,
    dkLen: 32,
    maxmem: 64 * 1024 * 1024
  }));
}
async function credential(password) {
  const salt = random();
  return salt + ":" + await derive(password, salt);
}
async function passwordMatches(password, stored) {
  const [salt, expected] = (stored || "0".repeat(64) + ":" + "0".repeat(64)).split(":");
  const actual = await derive(password, salt);
  let different = 0;
  for (let i = 0; i < actual.length; i++) different |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return different === 0 && Boolean(stored);
}
var json = (data, status = 200, setCookie) => Response.json(data, {
  status,
  headers: { "cache-control": "no-store", ...setCookie ? { "set-cookie": setCookie } : {} }
});
var sessionCookie = (value, age) => `${cookie}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Strict`;
var generic = () => json({ accepted: true }, 202);
async function readBody(request) {
  const type = request.headers.get("content-type")?.split(";")[0];
  if (type !== "application/json" && type !== "application/x-www-form-urlencoded" || !request.body) throw Error();
  const reader = request.body.getReader();
  let size = 0;
  let text4 = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) {
      await reader.cancel();
      throw Error();
    }
    text4 += decoder.decode(value, { stream: true });
  }
  text4 += decoder.decode();
  if (type === "application/x-www-form-urlencoded") return Object.fromEntries(new URLSearchParams(text4));
  const body = JSON.parse(text4);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw Error();
  return body;
}
function isMobileBearerRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  return tokenFormat.test(bearer) && !request.headers.get("cookie");
}
function hasValidMutationOrigin(request, env) {
  if (!env.AUTH_ORIGIN) return false;
  if (request.headers.get("origin") === env.AUTH_ORIGIN) return true;
  if (request.headers.get("x-client-type")?.toLowerCase() === "mobile" && isMobileBearerRequest(request)) {
    return true;
  }
  return false;
}
async function requestSessionHash(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (tokenFormat.test(bearer)) return await sha(bearer);
  }
  const rawSession = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(cookie + "="))?.slice(cookie.length + 1);
  return rawSession && tokenFormat.test(rawSession) ? await sha(rawSession) : "";
}
async function currentAccount(request, env, admin = false) {
  const db = env.AUTH_DB;
  const url = new URL(request.url);
  if (!db || env.AUTH_ORIGIN !== url.origin || url.protocol !== "https:") return null;
  const nativeRequest = Boolean(request.headers.get("authorization") || request.headers.get("x-client-type")?.toLowerCase() === "mobile");
  if (admin && nativeRequest) return null;
  const sessionHash = await requestSessionHash(request);
  if (!sessionHash) return null;
  const rule = admin ? "u.role='admin' AND s.mfa=1 AND u.id=?" : nativeRequest ? "u.role IN ('buyer','seller')" : "(u.role IN ('buyer','seller') OR (u.role='admin' AND s.mfa=1 AND u.id=?))";
  return db.prepare("SELECT u.id,u.email,u.role FROM cnc_auth_sessions s JOIN cnc_auth_users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND u.verified=1 AND u.suspended=0 AND " + rule).bind(sessionHash, Date.now(), ...admin || !nativeRequest ? [env.ADMIN_ACCOUNT_ID ?? ""] : []).first();
}
async function authRoute(request, env) {
  const db = env.AUTH_DB;
  const url = new URL(request.url);
  if (!db || !env.AUTH_ORIGIN || env.AUTH_ORIGIN !== url.origin || url.protocol !== "https:") {
    return json({ error: "Authentication unavailable" }, 503);
  }
  const action = url.pathname.replace(/^\/api\/(?:v1\/)?auth\//, "");
  const now = Date.now();
  if (action === "me" && request.method === "GET") {
    const user2 = await currentAccount(request, env);
    return user2 ? json({ authenticated: true, user: user2 }) : json({ authenticated: false, error: "Sign-in required" }, 401);
  }
  const sessionHash = await requestSessionHash(request);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const isMobileHeader = request.headers.get("x-client-type")?.toLowerCase() === "mobile";
  if (request.headers.get("origin") !== url.origin && !isMobileHeader) return json({ error: "Invalid request origin" }, 403);
  if (action === "logout") {
    if (sessionHash) await db.prepare("DELETE FROM cnc_auth_sessions WHERE hash=?").bind(sessionHash).run();
    return json({ signedOut: true }, 200, sessionCookie("", 0));
  }
  if (!["register", "login", "admin-login", "verify", "request-reset", "reset"].includes(action)) return json({ error: "Unknown operation" }, 404);
  let body;
  try {
    body = await readBody(request);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const token = typeof body.token === "string" ? body.token : "";
  const emailRequired = ["register", "login", "admin-login", "request-reset"].includes(action);
  if (emailRequired && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return json({ error: "Invalid email" }, 400);
  if (["login", "admin-login", "reset"].includes(action) && (password.length < 12 || password.length > 128)) return json({ error: "Invalid password length" }, 400);
  async function permit(key, max) {
    const window = Math.floor(now / 6e5);
    return db.prepare(`INSERT INTO cnc_auth_rate VALUES (?,?,1) ON CONFLICT(bucket) DO UPDATE SET
      window=excluded.window, attempts=CASE WHEN cnc_auth_rate.window=excluded.window THEN cnc_auth_rate.attempts+1 ELSE 1 END
      WHERE cnc_auth_rate.window<excluded.window OR (cnc_auth_rate.window=excluded.window AND cnc_auth_rate.attempts<?)
      RETURNING attempts`).bind(await sha(key), window, max).first();
  }
  const client = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!await permit("client:" + client, 25) || email && !await permit(action + ":" + email, 5)) {
    return action === "register" || action === "request-reset" ? generic() : json({ error: "Try again later" }, 429);
  }
  const user = email ? await db.prepare("SELECT * FROM cnc_auth_users WHERE email=?").bind(email).first() : null;
  if (action === "admin-login") {
    if (isMobileHeader) return json({ error: "Admin sign-in unavailable to mobile clients" }, 403);
    if (!env.ADMIN_ACCOUNT_ID || !env.ADMIN_TOTP_SECRET_HEX) return json({ error: "Administrator sign-in unavailable" }, 503);
    const valid = await passwordMatches(password, user?.credential);
    if (!valid || !user || user.id !== env.ADMIN_ACCOUNT_ID || user.role !== "admin" || !user.verified || user.suspended) {
      return json({ error: "Invalid credentials or code" }, 401);
    }
    const step = await verifyTotp(env.ADMIN_TOTP_SECRET_HEX, typeof body.code === "string" ? body.code : "", now);
    if (step === null) return json({ error: "Invalid credentials or code" }, 401);
    const fresh = random();
    const rows = await db.batch([
      db.prepare(`INSERT INTO cnc_admin_mfa_steps SELECT id,? FROM cnc_auth_users
        WHERE id=? AND credential=? AND verified=1 AND suspended=0 AND role='admin'
        ON CONFLICT(user_id) DO UPDATE SET last_step=excluded.last_step
        WHERE cnc_admin_mfa_steps.last_step<excluded.last_step RETURNING user_id`).bind(step, user.id, user.credential),
      db.prepare("DELETE FROM cnc_auth_sessions WHERE user_id=? AND mfa=1 AND changes()=1").bind(user.id)
    ]);
    if (!rows[0]?.results.length) return json({ error: "Invalid credentials or code" }, 401);
    const issued = await db.prepare(`INSERT INTO cnc_auth_sessions (hash,user_id,expires,mfa)
      SELECT ?,id,?,1 FROM cnc_auth_users WHERE id=? AND credential=? AND role='admin' AND verified=1 AND suspended=0
      AND (SELECT last_step FROM cnc_admin_mfa_steps WHERE user_id=cnc_auth_users.id)=? RETURNING hash`).bind(await sha(fresh), now + 15 * 6e4, user.id, user.credential, step).first();
    return issued ? json({ signedIn: true, user: { id: user.id, email: user.email, role: "admin", sellerStatus: "none" } }, 200, sessionCookie(fresh, 900)) : json({ error: "Invalid credentials or code" }, 401);
  }
  if (action === "login") {
    if (user?.role === "admin" && user.id === env.ADMIN_ACCOUNT_ID && user.verified && !user.suspended && await passwordMatches(password, user.credential)) {
      return json({ error: "Authenticator code required", mfaRequired: true }, 401);
    }
    if (!await passwordMatches(password, user?.credential) || !user || !user.verified || user.suspended || user.role === "admin") {
      return json({ error: "Invalid credentials or account unavailable" }, 401);
    }
    const fresh = random();
    const issued = await db.batch([
      db.prepare("DELETE FROM cnc_auth_sessions WHERE hash=? AND user_id=?").bind(sessionHash, user.id),
      db.prepare(`INSERT INTO cnc_auth_sessions (hash,user_id,expires)
        SELECT ?,id,? FROM cnc_auth_users WHERE id=? AND credential=? AND verified=1 AND suspended=0 AND role IN ('buyer','seller') RETURNING hash`).bind(await sha(fresh), now + sessionSeconds * 1e3, user.id, user.credential)
    ]);
    if (!issued[1]?.results.length) return json({ error: "Invalid credentials or account unavailable" }, 401);
    if (isMobileHeader) {
      return json({
        signedIn: true,
        user: { id: user.id, email: user.email, role: user.role },
        token: fresh,
        expiresInSeconds: sessionSeconds
      }, 200);
    }
    return json({ signedIn: true, user: { id: user.id, email: user.email, role: user.role } }, 200, sessionCookie(fresh, sessionSeconds));
  }
  if (action === "register" || action === "request-reset") {
    if (!emailConfigured(env)) return json({ error: "Email delivery unavailable" }, 503);
    let target = user;
    if (action === "register") {
      const id = crypto.randomUUID();
      if (!target) {
        await db.prepare("INSERT INTO cnc_auth_users (id,email,credential,role) VALUES (?,?,?,?) ON CONFLICT(email) DO NOTHING").bind(id, email, "", "buyer").run();
        target = await db.prepare("SELECT * FROM cnc_auth_users WHERE email=?").bind(email).first();
      }
    }
    if (!target || target.suspended || target.role === "admin" || Boolean(target.verified) !== (action === "request-reset")) return generic();
    const purpose2 = action === "register" ? "verify" : "reset";
    const fresh = random();
    const hash2 = await sha(fresh);
    await db.prepare(`INSERT INTO cnc_auth_tokens VALUES (?,?,?,?)
      ON CONFLICT(user_id,purpose) DO UPDATE SET hash=excluded.hash,expires=excluded.expires`).bind(hash2, target.id, purpose2, now + 9e5).run();
    try {
      await deliverAuthEmail(env, target.email, fresh, purpose2, hash2);
    } catch {
      await db.prepare("DELETE FROM cnc_auth_tokens WHERE hash=?").bind(hash2).run();
    }
    return generic();
  }
  if (!tokenFormat.test(token)) return json({ error: "Invalid or expired token" }, 400);
  if (password.length < 12 || password.length > 128) return json({ error: "Invalid password length" }, 400);
  const purpose = action === "verify" ? "verify" : "reset";
  const hash = await sha(token);
  const eligible = await db.prepare(`SELECT u.id FROM cnc_auth_tokens t JOIN cnc_auth_users u ON u.id=t.user_id
    WHERE t.hash=? AND t.purpose=? AND t.expires>? AND u.suspended=0 AND u.role IN ('buyer','seller') AND u.verified=?`).bind(hash, purpose, now, action === "verify" ? 0 : 1).first();
  if (!eligible) return json({ error: "Invalid or expired token" }, 400);
  const replacement = await credential(password);
  const results = await db.batch([
    db.prepare(`UPDATE cnc_auth_users SET credential=?,verified=1 WHERE id=? AND suspended=0 AND role IN ('buyer','seller') AND verified=?
      AND EXISTS (SELECT 1 FROM cnc_auth_tokens WHERE hash=? AND user_id=cnc_auth_users.id AND purpose=? AND expires>?) RETURNING id`).bind(replacement, eligible.id, action === "verify" ? 0 : 1, hash, purpose, Date.now()),
    db.prepare("DELETE FROM cnc_auth_sessions WHERE user_id=? AND changes()=1").bind(eligible.id),
    db.prepare("DELETE FROM cnc_auth_tokens WHERE hash=?").bind(hash)
  ]);
  return results[0]?.results.length ? json({ completed: true }) : json({ error: "Invalid or expired token" }, 400);
}

// deploy/chatgpt-sites/orders.ts
var routes = /* @__PURE__ */ new Set(["/api/orders", "/api/checkout", "/api/orders/cancel"]);
var json2 = (data, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
async function ordersRoute(request, env) {
  const url = new URL(request.url);
  if (!routes.has(url.pathname)) return null;
  if (!env.AUTH_DB || env.ORDER_RESERVATIONS !== "enabled") return json2({ error: "Order service unavailable" }, 503);
  const account = await currentAccount(request, env);
  if (!account) return json2({ error: "Sign-in required" }, 401);
  if (account.role !== "buyer") return json2({ error: "Buyer account required" }, 403);
  const db = env.AUTH_DB;
  if (url.pathname === "/api/orders") {
    if (request.method !== "GET") return json2({ error: "Method not allowed" }, 405);
    const { results } = await db.prepare(`SELECT o.id,o.buyer,o.status,o.payment_state,o.delivery_address,o.created,
      SUM(i.quantity*i.price_minor) AS total_minor
      FROM cnc_orders o JOIN cnc_order_items i ON i.order_id=o.id WHERE o.buyer=?
      GROUP BY o.id ORDER BY o.created DESC,o.id LIMIT 50`).bind(account.id).all();
    const { results: fulfilments } = await db.prepare(`
      SELECT f.order_id,f.seller_id,COALESCE(st.name,'') AS store_name,
             f.status,f.carrier,f.tracking_number,f.updated_at
      FROM cnc_seller_order_fulfilments f
      JOIN cnc_orders o ON o.id=f.order_id
      LEFT JOIN cnc_seller_stores st ON st.owner=f.seller_id
      WHERE o.buyer=? AND o.id IN (
        SELECT id FROM cnc_orders WHERE buyer=? ORDER BY created DESC,id LIMIT 50
      )
      ORDER BY f.updated_at DESC LIMIT 150
    `).bind(account.id, account.id).all();
    const { results: items } = await db.prepare(`
      SELECT i.order_id,i.product_id,i.seller AS seller_id,
             COALESCE(st.name,'') AS seller_name,
             i.name,i.quantity,i.price_minor,COALESCE(p.image,'') AS image
      FROM cnc_order_items i
      JOIN cnc_orders o ON o.id=i.order_id
      LEFT JOIN cnc_seller_stores st ON st.owner=i.seller
      LEFT JOIN cnc_seller_products p ON p.id=i.product_id
      WHERE o.buyer=? AND o.id IN (
        SELECT id FROM cnc_orders WHERE buyer=? ORDER BY created DESC,id LIMIT 50
      )
      ORDER BY o.created DESC,i.product_id LIMIT 2000
    `).bind(account.id, account.id).all();
    const itemsByOrder = /* @__PURE__ */ new Map();
    for (const item of items) {
      const group = itemsByOrder.get(item.order_id) || [];
      group.push(item);
      itemsByOrder.set(item.order_id, group);
    }
    const byOrder = /* @__PURE__ */ new Map();
    for (const item of fulfilments) {
      const group = byOrder.get(item.order_id) || [];
      group.push(item);
      byOrder.set(item.order_id, group);
    }
    return json2({ orders: results.map((order2) => ({
      ...order2,
      items: itemsByOrder.get(order2.id) || [],
      fulfilments: byOrder.get(order2.id) || []
    })) });
  }
  if (request.method !== "POST") return json2({ error: "Method not allowed" }, 405);
  if (!hasValidMutationOrigin(request, env)) return json2({ error: "Invalid request origin" }, 403);
  let body;
  try {
    body = await readBody(request);
  } catch {
    return json2({ error: "Invalid request" }, 400);
  }
  if (url.pathname === "/api/orders/cancel") {
    if (typeof body.id !== "string" || body.id.length > 100) return json2({ error: "Invalid order" }, 400);
    try {
      const cancelled = await db.prepare(`UPDATE cnc_orders SET status='cancelled'
        WHERE id=? AND buyer=? AND status='awaiting_payment' RETURNING id,status`).bind(body.id, account.id).first();
      return cancelled ? json2({ order: cancelled }) : json2({ error: "Order unavailable" }, 409);
    } catch (error) {
      if (error instanceof Error && error.message.includes("CNC_PAYMENT_IN_PROGRESS")) return json2({ error: "Payment awaiting reconciliation" }, 409);
      throw error;
    }
  }
  if (typeof body.request_id !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(body.request_id) || typeof body.address_id !== "string" || body.address_id.length > 100) return json2({ error: "Invalid order request" }, 400);
  try {
    await db.prepare(`INSERT INTO cnc_orders (id,buyer,request_id,address_id,delivery_address)
      SELECT ?,user_id,?,id,json_object('recipient',recipient,'line',line,'city',city,'state',state)
      FROM cnc_buyer_addresses WHERE id=? AND user_id=? ON CONFLICT(buyer,request_id) DO NOTHING`).bind(crypto.randomUUID(), body.request_id, body.address_id, account.id).run();
  } catch (error) {
    if (error instanceof Error && /CNC_CART_EMPTY|CNC_STOCK_UNAVAILABLE/.test(error.message)) return json2({ error: "Cart is empty or stock unavailable" }, 409);
    throw error;
  }
  const order = await db.prepare("SELECT id,status,address_id FROM cnc_orders WHERE buyer=? AND request_id=?").bind(account.id, body.request_id).first();
  if (!order) return json2({ error: "Delivery address unavailable" }, 400);
  if (order.address_id !== body.address_id) return json2({ error: "Order request ID already used" }, 409);
  return json2({ order: { id: order.id, status: order.status } });
}

// deploy/chatgpt-sites/catalog.ts
async function readActiveCategories(db, search = "") {
  const term = search.trim().replace(/[\\%_]/g, "\\$&");
  const { results } = await db.prepare(
    "SELECT id, name FROM categories WHERE active = 1 AND name LIKE ? ESCAPE '\\' ORDER BY name, id LIMIT 100"
  ).bind(`%${term}%`).all();
  return results;
}
var productFields = "p.id, p.store, p.name, p.description, p.category, p.price, p.stock, p.image, p.featured";
var publicProducts = "FROM products p JOIN stores s ON s.id = p.store WHERE p.active = 1 AND s.verified = 1 AND s.suspended = 0";
async function readProducts(db, term, store, category, offset) {
  const pattern = `%${term.trim().replace(/[\\%_]/g, "\\$&")}%`;
  const { results } = await db.prepare(
    `SELECT ${productFields} ${publicProducts}
    AND p.name LIKE ? ESCAPE '\\' AND (? = '' OR p.store = ?)
    AND (? = '' OR p.category = ?) ORDER BY p.featured DESC, p.id LIMIT 25 OFFSET ?`
  ).bind(pattern, store, store, category, category, offset).all();
  return results;
}
async function readProduct(db, id) {
  const { results } = await db.prepare(
    `SELECT ${productFields} ${publicProducts} AND p.id = ? LIMIT 1`
  ).bind(id).all();
  return results[0] ?? null;
}
async function readStorefront(db, id) {
  const { results } = await db.prepare(
    "SELECT id, name, description, category, location, verified FROM stores WHERE id = ? AND verified = 1 AND suspended = 0 LIMIT 1"
  ).bind(id).all();
  return results[0] ?? null;
}
async function readStorefronts(db, offset) {
  const { results } = await db.prepare(
    `SELECT id, name, description, category, location, verified FROM stores
     WHERE verified = 1 AND suspended = 0 ORDER BY name, id LIMIT 25 OFFSET ?`
  ).bind(offset).all();
  return results;
}

// deploy/chatgpt-sites/catalog-pages.ts
var encode = encodeURIComponent;
var escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
var price = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
var shop = (params) => "/shop?" + params.toString();
function page(title, content, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | Cash N Carry</title>
<link rel="icon" href="/brand/icon.png"><link rel="apple-touch-icon" href="/brand/icon.png"><link rel="manifest" href="/manifest.webmanifest">
<style>
*{box-sizing:border-box}body{margin:0;font:16px system-ui;color:#17251e;background:white}header,footer,main{max-width:1200px;margin:auto;padding:1rem}header,footer,nav,form{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}header{justify-content:space-between;border-bottom:1px solid #e6ede8}header nav a{font-weight:700;text-decoration:none}header img,footer img{width:144px;height:auto}.catalog-search{margin:1.25rem 0}.catalog-search input{flex:1;min-width:min(100%,220px)}.card a{text-decoration:none}.card a:hover{text-decoration:underline}.card{box-shadow:0 4px 16px #1235240a}.hero a.button{text-decoration:none}@media(max-width:480px){header nav{gap:.65rem;font-size:.9rem}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}.card{padding:.7rem}.card h2{font-size:1rem}}a{color:#065f46}a:focus-visible,input:focus-visible,button:focus-visible{outline:3px solid #e68110;outline-offset:3px}.hero{background:linear-gradient(110deg,#047857,#064e3b);color:white;border-radius:28px;padding:clamp(1.25rem,5vw,3rem)}h1{font-size:clamp(1.8rem,5vw,3rem);margin:.25rem 0}section{margin:1.5rem 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:1rem}.card{border:1px solid #e2e8e5;border-radius:22px;padding:1rem;min-width:0;overflow-wrap:anywhere}.card img{width:100%;max-height:340px;aspect-ratio:4/3;object-fit:contain;border-radius:12px;background:#f7faf8}.button,button{display:inline-block;border:0;border-radius:999px;padding:.65rem 1rem;background:#f59e0b;color:#202016;font:inherit;font-weight:700}form.account-form{display:grid;max-width:420px;align-items:stretch}input,select{padding:.65rem;border:1px solid #a2afa7;border-radius:12px;max-width:100%}nav.categories a{padding:.65rem 1rem;border-radius:12px;background:#e9f7ef}nav.categories a:nth-child(3n){background:#fff0d6}nav.categories a:nth-child(3n+1){background:#fce7f3}footer{border-top:1px solid #e2e8e5}
</style></head><body><header><a href="/"><img width="2172" height="724" src="/brand/logo.png" alt="Cash N Carry"></a><nav aria-label="Main"><a href="/shop">Shop</a><a href="/account">My account</a><a href="/cart">Cart</a><a href="/orders">Orders</a></nav></header>
<main id="main">${content}</main><footer><img width="2172" height="724" src="/brand/logo.png" alt="Cash N Carry"></footer></body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}
function card(product, detail = false) {
  const image = /^(?:https:\/\/|\/(?!\/))/i.test(product.image ?? "") && !product.image.includes("\\") ? `<img src="${escape(product.image)}" alt="${escape(product.name)}" loading="lazy">` : "";
  return `<article class="card">${image}<${detail ? "h1" : "h2"}>${detail ? escape(product.name) : `<a href="/products/${encode(product.id)}">${escape(product.name)}</a>`}</${detail ? "h1" : "h2"}>
<p><strong>${escape(price.format(product.price))}</strong> \xB7 ${product.stock > 0 ? "In stock" : "Out of stock"}</p>
${detail ? `<p>${escape(product.description)}</p><a href="/sellers/${encode(product.store)}">Visit storefront</a><form method="post" action="/cart"><input type="hidden" name="id" value="${escape(product.id)}"><label>Quantity <input type="number" name="quantity" min="1" max="99" value="1" required></label><button>Set cart quantity</button></form>` : ""}</article>`;
}
function protectedPageUnavailable(path) {
  const seller = path === "/seller" || path.startsWith("/seller/");
  const admin = path === "/admin" || path.startsWith("/admin/");
  const title = admin ? "Admin Console" : path === "/seller/products" ? "Manage products" : path === "/seller/register" ? "Seller registration" : seller ? "Seller Centre" : path === "/register" ? "Create an account" : ["/sign-in", "/login"].includes(path) ? "Sign in" : "My account";
  const message = admin ? "Administrator access is unavailable in this build." : seller ? "Seller account access and product management are unavailable in this build." : "Sign-in and account management are unavailable in this build.";
  return page(title, `<section class="hero"><h1>${title}</h1></section><section class="card">
<p role="status">${message}</p><a href="/shop">Browse the Shop</a></section>`, 503);
}
async function homePage(db) {
  const hero = '<section class="hero"><h1>Watch live.<br>Discover. Shop.</h1><p>Discover independent Nigerian sellers and shop local.</p><a class="button" href="/shop">Start shopping</a></section>';
  if (!db) return page("Cash N Carry Nigeria", hero + "<p>Catalog temporarily unavailable.</p>", 503);
  try {
    const [categories, products] = await Promise.all([
      readActiveCategories(db),
      readProducts(db, "", "", "", 0)
    ]);
    return page("Cash N Carry Nigeria", hero + `<form action="/shop" method="get" class="catalog-search"><label for="home-search">Search products</label>
      <input id="home-search" name="q" maxlength="100" placeholder="Search the marketplace"><button>Search</button></form>
      <section><h2>Shop by category</h2>${categories.length ? `<nav class="categories" aria-label="Categories">${categories.map(
      (category) => `<a href="${escape(shop(new URLSearchParams({ category: category.id })))}">${escape(category.name)}</a>`
    ).join("")}</nav>` : "<p>No active categories yet.</p>"}</section>
<section><h2>Discover products</h2><div class="grid">${products.length ? products.slice(0, 8).map((product) => card(product)).join("") : "<p>No products available yet.</p>"}</div></section>`);
  } catch {
    return page("Cash N Carry Nigeria", hero + "<p>Catalog temporarily unavailable.</p>", 503);
  }
}
async function catalogPage(url, db) {
  if (!db) return page("Catalog unavailable", "<h1>Catalog temporarily unavailable</h1>", 503);
  try {
    const match = /^\/(products|sellers)\/([^/]+)$/.exec(url.pathname);
    const id = match ? decodeURIComponent(match[2]) : "";
    if (id.length > 100) return page("Invalid identifier", "<h1>Invalid identifier</h1>", 400);
    if (match?.[1] === "products") {
      const item = await readProduct(db, id);
      return item ? page(item.name, card(item, true)) : page("Product not found", "<h1>Product not found</h1>", 404);
    }
    const storefront = match ? await readStorefront(db, id) : null;
    if (match && !storefront) return page("Storefront not found", "<h1>Storefront not found</h1>", 404);
    const q = (url.searchParams.get("q") ?? "").slice(0, 100);
    const category = (url.searchParams.get("category") ?? "").slice(0, 100);
    const store = storefront?.id ?? (url.searchParams.get("store") ?? "").slice(0, 100);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1e4) return page("Invalid page", "<h1>Invalid page</h1>", 400);
    const [products, categories] = await Promise.all([
      readProducts(db, q, store, category, offset),
      storefront ? [] : readActiveCategories(db)
    ]);
    const title = storefront?.name ?? "Discover all the best deals";
    const search = new URLSearchParams({ q, category, store });
    const navigation = (label, next) => {
      search.set("offset", String(next));
      const href = storefront ? "/sellers/" + encode(storefront.id) + "?" + search : shop(search);
      return `<a class="button" href="${escape(href)}">${label}</a>`;
    };
    return page(title, `<section class="hero"><h1>${escape(title)}</h1>${storefront ? `<p>Verified seller \xB7 ${escape(storefront.location)}</p><p>${escape(storefront.description)}</p>` : ""}</section>
<form><label for="q">Search products</label><input id="q" name="q" maxlength="100" value="${escape(q)}"><input type="hidden" name="store" value="${escape(store)}"><input type="hidden" name="category" value="${escape(category)}"><button>Search</button></form>
${categories.length ? `<section><h2>Categories</h2><nav aria-label="Categories"><a href="${escape(shop(new URLSearchParams({ q, store })))}">All categories</a>${categories.map((item) => `<a href="${escape(shop(new URLSearchParams({ q, store, category: item.id })))}">${escape(item.name)}</a>`).join("")}</nav></section>` : ""}
<section class="grid" aria-label="Products">${products.length ? products.map((product) => card(product)).join("") : "<p>No matching products.</p>"}</section>
<nav aria-label="Product pages">${offset ? navigation("Previous", Math.max(0, offset - 25)) : ""}${products.length === 25 && offset + 25 <= 1e4 ? navigation("Next", offset + 25) : ""}</nav>`);
  } catch (error) {
    if (error instanceof URIError) return page("Invalid identifier", "<h1>Invalid identifier</h1>", 400);
    return page("Catalog unavailable", "<h1>Catalog temporarily unavailable</h1>", 503);
  }
}

// deploy/chatgpt-sites/checkout-pages.ts
async function checkoutPage(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/checkout" && url.pathname !== "/orders") return null;
  if (!env.AUTH_DB || env.ORDER_RESERVATIONS !== "enabled") return page("Checkout unavailable", "<h1>Checkout unavailable</h1>", 503);
  const buyer = await currentAccount(request, env);
  if (!buyer) return new Response(null, { status: 303, headers: { location: "/sign-in", "cache-control": "no-store" } });
  if (buyer.role !== "buyer") return page("Buyer access required", "<h1>Buyer access required</h1>", 403);
  if (request.method === "POST") {
    const api = url.pathname === "/checkout" ? "/api/checkout" : "/api/orders/cancel";
    const result = await ordersRoute(new Request(new URL(api, url), request), env);
    if (result?.ok) return new Response(null, { status: 303, headers: { location: "/orders", "cache-control": "no-store" } });
    const data = await result?.json();
    return page("Order request unsuccessful", `<h1>Order request unsuccessful</h1><p>${escape(data?.error)}</p><a href="${url.pathname}">Return</a>`, result?.status ?? 503);
  }
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { allow: "GET, POST" } });
  if (url.pathname === "/orders") {
    const { results } = await env.AUTH_DB.prepare("SELECT id,status FROM cnc_orders WHERE buyer=? ORDER BY created DESC,id LIMIT 50").bind(buyer.id).all();
    return page("Your orders", `<h1>Your orders</h1>${results.map((order) => `<section class="card"><h2>Order ${escape(order.id)}</h2><p>${escape(order.status.replaceAll("_", " "))}</p>
      ${order.status === "awaiting_payment" ? `<form method="post"><input type="hidden" name="id" value="${escape(order.id)}"><button>Cancel unpaid order</button></form>` : ""}</section>`).join("") || "<p>No orders yet.</p>"}<a href="/shop">Continue shopping</a>`);
  }
  const [addresses2, cart] = await Promise.all([
    env.AUTH_DB.prepare("SELECT id,line,city FROM cnc_buyer_addresses WHERE user_id=? ORDER BY rowid DESC LIMIT 20").bind(buyer.id).all(),
    env.AUTH_DB.prepare(`SELECT c.quantity,c.source,p.name,p.price_minor,p.stock,p.publication,p.archived FROM cnc_buyer_cart c
      LEFT JOIN cnc_seller_products p ON p.id=c.product WHERE c.buyer=?`).bind(buyer.id).all()
  ]);
  if (!cart.results.length || cart.results.some((item) => item.source !== "replacement" || item.price_minor === null || item.stock < item.quantity || item.publication !== "published" || item.archived)) {
    return page("Review your cart", '<h1>Review your cart</h1><p>Checkout needs in-stock staging products approved for ordering.</p><a href="/cart">Return to cart</a>', 409);
  }
  if (!addresses2.results.length) return page("Delivery address required", '<h1>Delivery address required</h1><a href="/addresses">Add a delivery address</a>', 409);
  const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
  const total = cart.results.reduce((sum, item) => sum + (item.price_minor ?? 0) * item.quantity, 0);
  return page("Staging checkout", `<h1>Staging checkout</h1><ul>${cart.results.map((item) => `<li>${escape(item.name)} \xD7 ${item.quantity}</li>`).join("")}</ul>
    <p>Items total: ${money.format(total / 100)}</p><p>This creates an unpaid test order.</p>
    <form class="account-form" method="post"><input type="hidden" name="request_id" value="${crypto.randomUUID()}">
    <label for="address_id">Delivery address</label><select id="address_id" name="address_id">${addresses2.results.map((address) => `<option value="${escape(address.id)}">${escape(address.line)}, ${escape(address.city)}</option>`).join("")}</select>
    <button>Create test order</button></form>`);
}

// deploy/chatgpt-sites/flutterwave.ts
var json3 = (data, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
var encoder2 = new TextEncoder();
async function verifyFlutterwaveSignature(body, signature, secret) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const key = await crypto.subtle.importKey("raw", encoder2.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, Uint8Array.from(atob(signature), (char) => char.charCodeAt(0)), new Uint8Array(body));
}
function verifiedAmount(data, id, payment) {
  return String(data.id) === id && data.tx_ref === payment.reference && data.status === "successful" && data.currency === "NGN" && typeof data.amount === "number" && Number.isFinite(data.amount) && data.amount === payment.amount_minor / 100;
}
async function flutterwaveRoute(request, env) {
  const url = new URL(request.url);
  const webhook = url.pathname === "/api/payments/webhooks/flutterwave";
  const status = url.pathname === "/api/payments/status";
  if (!webhook && !status && url.pathname !== "/api/payments/initialize") return null;
  if (request.method !== (status ? "GET" : "POST")) return json3({ error: "Method not allowed" }, 405);
  const paymentsEnabled = env.PAYMENTS_ENABLED === "true";
  if (!webhook && !status && !paymentsEnabled) {
    return json3({ error: "Payments temporarily unavailable", code: "PAYMENTS_DISABLED", paymentsEnabled: false }, 503);
  }
  if (webhook && !paymentsEnabled) {
    return json3({ error: "Payments temporarily unavailable", code: "PAYMENTS_DISABLED", paymentsEnabled: false }, 503);
  }
  const db = env.AUTH_DB, secret = env.FLW_SECRET_KEY;
  if (status && !paymentsEnabled) {
    if (!db || url.protocol !== "https:" || url.origin !== env.AUTH_ORIGIN) {
      return json3({ error: "Payments temporarily unavailable", code: "PAYMENTS_DISABLED", paymentsEnabled: false }, 503);
    }
    const buyer = await currentAccount(request, env);
    if (!buyer || buyer.role !== "buyer") return json3({ error: "Buyer sign-in required" }, 401);
    const id2 = url.searchParams.get("order_id");
    if (!id2 || id2.length > 100) return json3({ error: "Invalid order" }, 400);
    const state = await db.prepare(`SELECT o.status FROM cnc_orders o WHERE o.id=? AND o.buyer=?`).bind(id2, buyer.id).first();
    return state ? json3({ ...state, paymentsEnabled: false }) : json3({ error: "Order unavailable" }, 404);
  }
  if (!db || env.FLW_MODE !== "sandbox" || !secret?.startsWith("FLWSECK_TEST-") || !env.FLW_WEBHOOK_HASH || env.FLW_WEBHOOK_SIGNATURE !== "hmac-sha256" || url.protocol !== "https:" || url.origin !== env.AUTH_ORIGIN) {
    return json3({ error: "Payment sandbox unavailable" }, 503);
  }
  const provider = (path, body) => fetch("https://api.flutterwave.com/v3/" + path, {
    method: body ? "POST" : "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(8e3),
    headers: { authorization: "Bearer " + secret, "content-type": "application/json" },
    ...body ? { body: JSON.stringify(body) } : {}
  });
  if (status) {
    const buyer = await currentAccount(request, env);
    if (!buyer || buyer.role !== "buyer") return json3({ error: "Buyer sign-in required" }, 401);
    const id2 = url.searchParams.get("order_id");
    if (!id2 || id2.length > 100) return json3({ error: "Invalid order" }, 400);
    const state = await db.prepare(`SELECT CASE WHEN p.transaction_id IS NOT NULL THEN 'paid' ELSE o.status END AS status
      FROM cnc_orders o LEFT JOIN cnc_flutterwave_payments p ON p.order_id=o.id WHERE o.id=? AND o.buyer=?`).bind(id2, buyer.id).first();
    return state ? json3({ ...state, paymentsEnabled: true }) : json3({ error: "Order unavailable" }, 404);
  }
  if (!webhook) {
    if (!hasValidMutationOrigin(request, env)) return json3({ error: "Invalid origin" }, 403);
    const buyer = await currentAccount(request, env);
    if (!buyer) return json3({ error: "Sign-in required" }, 401);
    if (buyer.role !== "buyer") return json3({ error: "Buyer access required" }, 403);
    let input;
    try {
      input = await readBody(request);
    } catch {
      return json3({ error: "Invalid request" }, 400);
    }
    if (typeof input.order_id !== "string" || input.order_id.length > 100) return json3({ error: "Invalid order" }, 400);
    const order = await db.prepare(`SELECT o.id,SUM(i.price_minor*i.quantity) AS total
      FROM cnc_orders o JOIN cnc_order_items i ON i.order_id=o.id
      WHERE o.id=? AND o.buyer=? AND o.status='awaiting_payment' GROUP BY o.id`).bind(input.order_id, buyer.id).first();
    if (!order || !Number.isSafeInteger(order.total) || order.total <= 0) return json3({ error: "Order unavailable" }, 404);
    const created = await db.prepare(`INSERT INTO cnc_flutterwave_payments (order_id,reference,amount_minor)
      SELECT id,?,? FROM cnc_orders WHERE id=? AND buyer=? AND status='awaiting_payment'
      ON CONFLICT(order_id) DO NOTHING RETURNING reference`).bind("cnc-test-" + crypto.randomUUID(), order.total, order.id, buyer.id).first();
    if (!created) {
      const previous = await db.prepare("SELECT checkout_url,transaction_id FROM cnc_flutterwave_payments WHERE order_id=?").bind(order.id).first();
      if (previous?.checkout_url && !previous.transaction_id) return json3({ checkout_url: previous.checkout_url });
      return json3({ error: "Payment already initiated or awaiting reconciliation" }, 409);
    }
    let checkout;
    try {
      const response3 = await provider("payments", {
        tx_ref: created.reference,
        amount: order.total / 100,
        currency: "NGN",
        redirect_url: url.origin + "/account",
        customer: { email: buyer.email }
      });
      if (!response3.ok) return json3({ error: "Sandbox checkout unavailable" }, 502);
      const result = await response3.json();
      if (result?.status !== "success" || typeof result.data?.link !== "string") return json3({ error: "Sandbox checkout unavailable" }, 502);
      checkout = new URL(result.data.link);
    } catch {
      return json3({ error: "Sandbox checkout unavailable" }, 502);
    }
    if (checkout.origin !== "https://checkout.flutterwave.com" || checkout.username || checkout.password) return json3({ error: "Invalid checkout URL" }, 502);
    await db.prepare("UPDATE cnc_flutterwave_payments SET checkout_url=? WHERE reference=?").bind(checkout.href, created.reference).run();
    return json3({ checkout_url: checkout.href });
  }
  const reader = request.body?.getReader();
  if (!reader) return json3({ error: "Missing callback" }, 400);
  const raw = new Uint8Array(65536);
  let size = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size + value.byteLength > raw.length) {
      await reader.cancel();
      return json3({ error: "Callback too large" }, 413);
    }
    raw.set(value, size);
    size += value.byteLength;
  }
  const bytes = raw.subarray(0, size);
  if (!await verifyFlutterwaveSignature(bytes, request.headers.get("flutterwave-signature") ?? "", env.FLW_WEBHOOK_HASH)) {
    return json3({ error: "Invalid signature" }, 401);
  }
  let event;
  try {
    event = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json3({ error: "Invalid callback" }, 400);
  }
  if (event?.event !== "charge.completed") return json3({ received: true });
  const id = String(event.data?.id), ref = event.data?.tx_ref;
  if (!/^[1-9]\d{0,15}$/.test(id) || typeof ref !== "string" || ref.length > 100) return json3({ error: "Invalid transaction" }, 400);
  const payment = await db.prepare("SELECT reference,amount_minor,transaction_id FROM cnc_flutterwave_payments WHERE reference=?").bind(ref).first();
  if (!payment) return json3({ received: true });
  if (payment.transaction_id === id) return json3({ received: true });
  if (payment.transaction_id) return json3({ error: "Payment already reconciled" }, 409);
  let response2;
  try {
    const verified = await provider("transactions/" + id + "/verify");
    if (!verified.ok) return json3({ error: "Verification unavailable" }, 502);
    response2 = await verified.json();
  } catch {
    return json3({ error: "Verification unavailable" }, 502);
  }
  if (response2?.status !== "success" || !response2.data || !verifiedAmount(response2.data, id, payment)) return json3({ error: "Payment mismatch" }, 409);
  const updated = await db.prepare(`UPDATE cnc_flutterwave_payments SET transaction_id=?,paid_at=unixepoch()
    WHERE reference=? AND transaction_id IS NULL AND EXISTS (SELECT 1 FROM cnc_orders WHERE id=order_id AND status='awaiting_payment') RETURNING reference`).bind(id, ref).first();
  if (updated) return json3({ received: true });
  const replay = await db.prepare("SELECT transaction_id FROM cnc_flutterwave_payments WHERE reference=?").bind(ref).first();
  return replay?.transaction_id === id ? json3({ received: true }) : json3({ error: "Payment state changed" }, 409);
}

// deploy/chatgpt-sites/stream.ts
function validEndpoint(raw, operation) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.port && !url.username && !url.password && !url.hash && url.hostname.endsWith(".cloudflarestream.com") && url.pathname.endsWith("/" + operation) ? url.href : null;
  } catch {
    return null;
  }
}
var reply = (value, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
async function streamRoute(request, env) {
  const path = new URL(request.url).pathname;
  if (path !== "/api/live/cloudflare/publish" && path !== "/api/live/cloudflare/play") return null;
  const publish = path.endsWith("/publish");
  if (request.method !== (publish ? "POST" : "GET")) return reply({ error: "Method not allowed" }, 405);
  if (publish && (!env.AUTH_ORIGIN || request.headers.get("origin") !== env.AUTH_ORIGIN)) return reply({ error: "Invalid request origin" }, 403);
  const account = await currentAccount(request, env);
  if (!account) return reply({ error: "Sign-in required" }, 401);
  if (publish && (account.role !== "seller" || !env.STREAM_SELLER_ID || account.id !== env.STREAM_SELLER_ID)) {
    return reply({ error: "Broadcast access denied" }, 403);
  }
  const endpoint = publish ? validEndpoint(env.STREAM_WHIP_URL, "publish") : validEndpoint(env.STREAM_WHEP_URL, "play");
  if (!endpoint) return reply({ error: "Cloudflare Stream unavailable" }, 503);
  return reply(publish ? { whipUrl: endpoint } : { whepUrl: endpoint });
}

// src/lib/kyc-https-scanner.ts
async function scanDocumentOverHttps(file, endpoint, token) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !token.trim()) {
    throw new Error("KYC scanner configuration is invalid");
  }
  const response2 = await fetch(url, {
    method: "POST",
    body: new Uint8Array(file),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/pdf",
      "cache-control": "no-store"
    },
    redirect: "manual",
    signal: AbortSignal.timeout(1e4)
  });
  const verdict = response2.headers.get("x-cnc-scan-verdict");
  await response2.body?.cancel();
  if (response2.status === 204 && (verdict === "clean" || verdict === "infected")) return verdict;
  throw new Error("KYC scanner did not return a verified verdict");
}

// deploy/chatgpt-sites/kyc.ts
var maxBytes = 5 * 1024 * 1024;
var json4 = (data, status) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
async function kycRoute(request, env) {
  if (new URL(request.url).pathname !== "/api/sellers/kyc") return null;
  const uploadsEnabled = env.KYC_UPLOADS_ENABLED === "true" && Boolean(env.KYC_PRIVATE);
  if (request.method === "GET") {
    return json4({
      uploadsEnabled,
      r2Configured: Boolean(env.KYC_PRIVATE),
      reason: uploadsEnabled ? null : "KYC document uploads are temporarily unavailable until private R2 storage is provisioned in staging."
    }, 200);
  }
  if (request.method !== "POST") return json4({ error: "Method not allowed" }, 405);
  if (env.KYC_UPLOADS_ENABLED !== "true") {
    return json4({
      error: "KYC document uploads are temporarily unavailable until private R2 storage is configured.",
      code: "KYC_UPLOADS_DISABLED",
      uploadsEnabled: false
    }, 503);
  }
  const { AUTH_DB, KYC_PRIVATE, KYC_SCANNER_HTTPS_URL, KYC_SCANNER_BEARER_TOKEN, KYC_DOCUMENT_KEY } = env;
  if (!AUTH_DB || !KYC_PRIVATE || !KYC_SCANNER_HTTPS_URL || !KYC_SCANNER_BEARER_TOKEN || !KYC_DOCUMENT_KEY || !/^[a-f0-9]{64}$/i.test(KYC_DOCUMENT_KEY)) return json4({ error: "Private verification unavailable" }, 503);
  if (!env.AUTH_ORIGIN || request.headers.get("origin") !== env.AUTH_ORIGIN) return json4({ error: "Invalid request origin" }, 403);
  const seller = await currentAccount(request, env);
  if (!seller) return json4({ error: "Sign-in required" }, 401);
  if (seller.role !== "seller") return json4({ error: "Seller access required" }, 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/pdf") return json4({ error: "Submit a PDF" }, 415);
  if (Number(request.headers.get("content-length")) > maxBytes) return json4({ error: "File too large" }, 413);
  const reader = request.body?.getReader();
  if (!reader) return json4({ error: "Document required" }, 400);
  const chunks = [];
  let size = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      return json4({ error: "File too large" }, 413);
    }
    chunks.push(value);
  }
  const pdf = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, offset);
    offset += chunk.length;
  }
  if (new TextDecoder().decode(pdf.subarray(0, 5)) !== "%PDF-") return json4({ error: "Invalid PDF" }, 415);
  const audit = async (outcome) => AUTH_DB.prepare("INSERT INTO cnc_kyc_audit (seller,outcome) VALUES (?,?)").bind(seller.id, outcome).run();
  let verdict;
  try {
    verdict = await scanDocumentOverHttps(pdf, KYC_SCANNER_HTTPS_URL, KYC_SCANNER_BEARER_TOKEN);
  } catch {
    await audit("scanner_unavailable");
    return json4({ error: "Scanner unavailable" }, 503);
  }
  if (verdict !== "clean") {
    await audit("rejected");
    return json4({ error: "Document rejected" }, 422);
  }
  const id = crypto.randomUUID();
  const bytes = Uint8Array.from(KYC_DOCUMENT_KEY.match(/../g), (item) => Number.parseInt(item, 16));
  const key = await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const additionalData = new TextEncoder().encode(JSON.stringify([seller.id, id]));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, key, pdf);
  const envelope = new Uint8Array(iv.length + sealed.byteLength);
  envelope.set(iv);
  envelope.set(new Uint8Array(sealed), iv.length);
  const objectKey = "kyc/" + id;
  await KYC_PRIVATE.put(objectKey, envelope.buffer);
  try {
    await AUTH_DB.batch([
      AUTH_DB.prepare("INSERT INTO cnc_kyc_submissions (id,seller,object_key) VALUES (?,?,?)").bind(id, seller.id, objectKey),
      AUTH_DB.prepare("INSERT INTO cnc_kyc_audit (seller,outcome) VALUES (?,'stored')").bind(seller.id)
    ]);
  } catch (error) {
    await KYC_PRIVATE.delete(objectKey);
    throw error;
  }
  return json4({ id, status: "pending_review" }, 201);
}

// deploy/chatgpt-sites/newsletter.ts
var nEmail = (v) => typeof v === "string" && v.length <= 254 && /^[^\s@<>]{1,64}@[^\s@<>]{1,180}\.[a-z]{2,}$/i.test(v);
var nResponse = (data, status = 200) => Response.json(data, {
  status,
  headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" }
});
var nToken = () => Array.from(
  crypto.getRandomValues(new Uint8Array(32)),
  (x) => x.toString(16).padStart(2, "0")
).join("");
var nHash = async (str) => Array.from(
  new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
  ),
  (x) => x.toString(16).padStart(2, "0")
).join("");
var nEscape = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
function nPage(title, content, status = 200) {
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + nEscape(title) + ' \xB7 Cash N Carry</title><style>body{margin:0;background:#f7faf8;font:16px Arial,Helvetica,sans-serif;color:#142a1e}main{max-width:480px;margin:9vh auto;padding:30px;background:#fff;border:1px solid #dfebe4;border-radius:20px;box-shadow:0 12px 30px #112a2011}h1{font-size:26px;line-height:1.2;margin:0 0 14px}p{color:#476053;line-height:1.6}button,.n-btn{background:#075a37;color:#fff;border:0;border-radius:11px;padding:14px 20px;font-size:16px;font-weight:700;text-decoration:none;display:inline-block;cursor:pointer}a{color:#075a37}button:focus-visible,a:focus-visible{outline:3px solid #f80;outline-offset:3px}</style></head><body><main><p style="font-weight:bold;color:#075a37">Cash N Carry Nigeria</p><h1>' + nEscape(title) + "</h1>" + content + '<p><a href="/">Return to marketplace</a></p></main></body></html>';
  return new Response(html, { status, headers: {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none';style-src 'unsafe-inline';form-action 'self';base-uri 'none';frame-ancestors 'none'",
    "x-robots-tag": "noindex, nofollow, noarchive"
  } });
}
function nSameSite(req) {
  const origin = new URL(req.url).origin;
  const provided = req.headers.get("origin");
  const ref = req.headers.get("referer");
  if (provided && provided !== origin) return false;
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  if (ref) {
    try {
      if (new URL(ref).origin !== origin) return false;
    } catch {
      return false;
    }
  }
  return true;
}
async function newsletterRoute(request, env) {
  const url = new URL(request.url);
  if (!/^\/api\/newsletter\/(?:subscribe|confirm|unsubscribe)$/.test(url.pathname)) return null;
  if (!/staging/i.test(env.AUTH_ORIGIN || url.hostname)) return nResponse({ error: "Not found" }, 404);
  if (!env.AUTH_DB) return nResponse({ error: "Newsletter temporarily unavailable" }, 503);
  const db = env.AUTH_DB;
  if (url.pathname === "/api/newsletter/subscribe") {
    if (request.method !== "POST") return nResponse({ error: "Method not allowed" }, 405);
    if (!nSameSite(request)) return nResponse({ error: "Invalid request origin" }, 403);
    let body;
    try {
      if (!(request.headers.get("content-type") || "").includes("application/json")) throw Error("type");
      body = await request.json();
    } catch {
      return nResponse({ error: "Invalid signup form" }, 400);
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!nEmail(email) || body.consent !== true) return nResponse({ error: "Enter a valid email and agree to receive updates" }, 400);
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const topics = Array.isArray(body.topics) ? body.topics.filter((x) => ["deals", "livestreams", "news"].includes(x)).slice(0, 3) : [];
    const source = ["footer", "modal"].includes(body.source) ? body.source : "footer";
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const bucket = await nHash("newsletter-ip:" + ip);
    const window = Math.floor(Date.now() / 6e5);
    const rate = await db.prepare(
      "INSERT INTO cnc_newsletter_rate(bucket,window,attempts) VALUES (?,?,1) ON CONFLICT(bucket) DO UPDATE SET window=excluded.window, attempts=CASE WHEN cnc_newsletter_rate.window=excluded.window THEN cnc_newsletter_rate.attempts+1 ELSE 1 END WHERE cnc_newsletter_rate.window<excluded.window OR cnc_newsletter_rate.attempts<5 RETURNING attempts"
    ).bind(bucket, window).first();
    if (!rate) return nResponse({ error: "Too many requests. Try again later." }, 429);
    const token = nToken(), unsubscribe2 = nToken();
    const hashed2 = await nHash(token), unhash = await nHash(unsubscribe2);
    const now2 = Math.floor(Date.now() / 1e3);
    const inserted = await db.prepare(
      "INSERT INTO cnc_newsletter_subscribers (email,display_name,topics,status,confirmation_hash,unsubscribe_hash,source,consent_at,last_requested_at) VALUES (?,?,?,'pending',?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name,topics=excluded.topics,status='pending',confirmation_hash=excluded.confirmation_hash,unsubscribe_hash=excluded.unsubscribe_hash,source=excluded.source,consent_at=excluded.consent_at,last_requested_at=excluded.last_requested_at,unsubscribed_at=NULL WHERE cnc_newsletter_subscribers.status!='confirmed' AND cnc_newsletter_subscribers.last_requested_at<=? RETURNING email"
    ).bind(email, name, JSON.stringify(topics), hashed2, unhash, source, now2, now2, now2 - 600).first();
    if (!inserted) return nResponse({ ok: true, message: "If this address needs confirmation, check your inbox shortly." }, 202);
    if (!env.AUTH_RESEND_API_KEY) return nResponse({ error: "Email delivery is not configured" }, 503);
    const link = url.origin + "/api/newsletter/confirm?token=" + encodeURIComponent(token);
    const safeLink = nEscape(link);
    const text4 = "Confirm your Cash N Carry newsletter subscription: " + link + "\n\nIf you did not request this email, you can ignore it. No marketing updates will be sent without confirmation.";
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body style="background:#f7faf8;font-family:Arial,sans-serif;color:#173427;padding:20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:550px;background:#fff;border:1px solid #e2ece5;border-radius:14px"><tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:18px 26px;border-bottom:3px solid #075a37"><img src="https://cdn.jsdelivr.net/gh/deeonejosh/cashncarry-source@7191c33393d67cd344cbb2b48cf6743a82352a38/web/public/brand/logo.png" width="180" height="60" border="0" alt="Cash N Carry Nigeria" style="display:block;width:180px;height:60px;border:0"></td></tr><tr><td style="padding:26px"><h1 style="font-size:24px">Confirm your email</h1><p style="line-height:1.6;color:#46564e">Please confirm your email address before receiving marketplace news, offers and livestream updates.</p><p><a href="' + safeLink + '" style="display:inline-block;padding:14px 22px;background:#075a37;color:white;text-decoration:none;border-radius:10px">Confirm subscription</a></p><p style="font-size:13px;color:#647269">If you did not request this, ignore this email. The confirmation link is valid for 24 hours.</p></td></tr></table></td></tr></table></body></html>';
    let sent = false;
    try {
      const mail = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.AUTH_RESEND_API_KEY,
          "Content-Type": "application/json",
          "Idempotency-Key": "cnc-newsletter-confirm-" + hashed2.slice(0, 40)
        },
        body: JSON.stringify({
          from: "Cash N Carry <newsletter@cashncarryng.com>",
          to: [email],
          subject: "Confirm your Cash N Carry updates",
          text: text4,
          html
        })
      });
      sent = mail.ok;
    } catch {
      sent = false;
    }
    if (!sent) {
      await db.prepare("DELETE FROM cnc_newsletter_subscribers WHERE email=? AND status='pending' AND confirmation_hash=?").bind(email, hashed2).run();
      return nResponse({ error: "Could not send the confirmation email. Please try again later." }, 503);
    }
    return nResponse({ ok: true, message: "Check your inbox to confirm your subscription." }, 202);
  }
  const key = url.searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/.test(key)) return nPage("Link unavailable", "<p>This newsletter link is invalid or expired.</p>", 400);
  const hashed = await nHash(key);
  const unsubscribe = url.pathname.endsWith("/unsubscribe");
  if (request.method === "GET") {
    const found = await db.prepare("SELECT email,status,last_requested_at FROM cnc_newsletter_subscribers WHERE " + (unsubscribe ? "unsubscribe_hash" : "confirmation_hash") + "=?").bind(hashed).first();
    if (!found) return nPage("Link unavailable", "<p>This newsletter link is invalid or expired.</p>", 404);
    if (!unsubscribe && (found.status !== "pending" || Date.now() / 1e3 - found.last_requested_at > 86400))
      return nPage("Link expired", "<p>Request a fresh newsletter confirmation from the website.</p>", 410);
    const action = unsubscribe ? "Unsubscribe" : "Confirm subscription";
    return nPage(action, "<p>" + (unsubscribe ? "Stop newsletter emails to this address?" : "Confirm that you want marketplace updates from Cash N Carry?") + '</p><form action="' + url.pathname + "?token=" + encodeURIComponent(key) + '" method="post"><input type="hidden" name="token" value="' + nEscape(key) + '"><button type="submit">' + action + "</button></form>");
  }
  if (request.method !== "POST") return nResponse({ error: "Method not allowed" }, 405);
  if (!nSameSite(request)) return nPage("Request blocked", "<p>Please open your email link and try again.</p>", 403);
  let submitted;
  try {
    submitted = (await request.formData()).get("token");
  } catch {
    return nPage("Invalid form", "<p>Try again.</p>", 400);
  }
  if (submitted !== key) return nPage("Request blocked", "<p>Form verification failed.</p>", 403);
  const now = Math.floor(Date.now() / 1e3);
  if (unsubscribe) {
    const changed = await db.prepare("UPDATE cnc_newsletter_subscribers SET status='unsubscribed',confirmation_hash=NULL,unsubscribed_at=? WHERE unsubscribe_hash=? RETURNING email").bind(now, hashed).first();
    return changed ? nPage("Unsubscribed", "<p>You will no longer receive Cash N Carry newsletter updates.</p>") : nPage("Link unavailable", "<p>This link is no longer valid.</p>", 404);
  }
  const activated = await db.prepare("UPDATE cnc_newsletter_subscribers SET status='confirmed',confirmed_at=?,confirmation_hash=NULL WHERE confirmation_hash=? AND status='pending' AND last_requested_at>=? RETURNING email").bind(now, hashed, now - 86400).first();
  return activated ? nPage("Subscription confirmed", "<p>Thanks for subscribing. You can unsubscribe from any newsletter email.</p>") : nPage("Link expired", "<p>Please request another confirmation email.</p>", 410);
}

// deploy/chatgpt-sites/seller-application.ts
var route = "/api/seller/application";
var reply2 = (payload, status = 200) => Response.json(payload, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
var text = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit + 1) : "";
async function sellerApplicationRoute(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== route) return null;
  if (!env.AUTH_DB || env.AUTH_ORIGIN !== url.origin || url.protocol !== "https:") {
    return reply2({ error: "Seller applications unavailable" }, 503);
  }
  const account = await currentAccount(request, env);
  if (!account) return reply2({ error: "Sign-in required" }, 401);
  if (account.role === "admin") return reply2({ error: "Use the administrator console" }, 403);
  const db = env.AUTH_DB;
  const accountApplication = () => db.prepare(
    "SELECT a.id,a.user_id,a.business_name,a.cac_number,a.business_type,a.state_location,a.phone,a.description,a.status,a.reviewer_notes,a.reviewed_at,a.created,a.updated,u.role,u.email,u.suspended,CASE WHEN a.status='approved' AND u.role='seller' AND u.suspended=0 THEN 'approved' ELSE a.status END AS user_seller_status FROM cnc_seller_applications a JOIN cnc_auth_users u ON u.id=a.user_id WHERE a.user_id=?"
  ).bind(account.id).first();
  if (request.method === "GET") {
    const application2 = await accountApplication();
    return reply2({ sellerStatus: application2?.user_seller_status || "none", application: application2 || null });
  }
  if (request.method !== "POST") return reply2({ error: "Method not allowed" }, 405);
  if (!hasValidMutationOrigin(request, env)) return reply2({ error: "Invalid request origin" }, 403);
  if (account.role !== "buyer") return reply2({ error: "This account is not eligible to apply" }, 403);
  let body;
  try {
    body = await readBody(request);
  } catch {
    return reply2({ error: "Invalid application form" }, 400);
  }
  const businessName = text(body.businessName, 100);
  const cacNumber = text(body.cacNumber, 60);
  const businessType = text(body.businessType, 80);
  const stateLocation = text(body.stateLocation, 80);
  const phone = text(body.phone, 30);
  const description = text(body.description, 500);
  if (businessName.length < 2 || businessName.length > 100 || cacNumber.length > 60 || businessType.length > 80 || stateLocation.length < 2 || stateLocation.length > 80 || !/^[+()\-\d\s]{6,30}$/.test(phone) || description.length < 5 || description.length > 500) {
    return reply2({ error: "Enter valid business details, phone and description" }, 400);
  }
  const id = crypto.randomUUID();
  const submitted = await db.prepare(
    "INSERT INTO cnc_seller_applications (id,user_id,business_name,cac_number,business_type,state_location,phone,description) SELECT ?,u.id,?,?,?,?,?,? FROM cnc_auth_users u WHERE u.id=? AND u.verified=1 AND u.suspended=0 AND u.role='buyer' ON CONFLICT(user_id) DO UPDATE SET business_name=excluded.business_name,cac_number=excluded.cac_number,business_type=excluded.business_type,state_location=excluded.state_location,phone=excluded.phone,description=excluded.description,status='pending',reviewer_id=NULL,reviewer_notes='',reviewed_at=NULL,updated=unixepoch() WHERE cnc_seller_applications.status='rejected' RETURNING id"
  ).bind(id, businessName, cacNumber, businessType, stateLocation, phone, description, account.id).first();
  if (!submitted) {
    const existing = await accountApplication();
    return reply2({
      error: existing?.status === "pending" ? "Application already submitted and awaiting review" : "Application cannot be submitted for this account",
      sellerStatus: existing?.status || "none",
      application: existing || null
    }, 409);
  }
  const application = await accountApplication();
  return reply2({
    submitted: true,
    sellerStatus: "pending",
    application,
    verificationNote: "Business details are self-declared. Document review requires an authorised administrator."
  }, 201);
}

// deploy/chatgpt-sites/admin.ts
async function adminRoute(request, env) {
  const url = new URL(request.url);
  if (!["/admin", "/api/admin/moderation", "/api/admin/overview", "/api/admin/seller-applications", "/api/admin/seller-applications/review"].includes(url.pathname)) return null;
  if (!env.AUTH_DB || !env.ADMIN_ACCOUNT_ID || !env.ADMIN_TOTP_SECRET_HEX) return null;
  const account = await currentAccount(request, env, true);
  if (!account) return new Response(null, { status: 403, headers: { "cache-control": "no-store" } });
  const db = env.AUTH_DB;
  if (url.pathname === "/api/admin/overview") {
    if (request.method !== "GET") return new Response(null, { status: 405, headers: { allow: "GET" } });
    const counts = await db.prepare(
      "SELECT (SELECT COUNT(*) FROM cnc_auth_users) AS totalUsers,(SELECT COUNT(*) FROM cnc_auth_users WHERE role='seller' AND verified=1 AND suspended=0) AS approvedSellers,(SELECT COUNT(*) FROM cnc_seller_applications WHERE status='pending') AS pendingApplications,(SELECT COUNT(*) FROM cnc_seller_products WHERE publication='pending' AND archived=0) AS pendingProducts,(SELECT COUNT(*) FROM cnc_seller_products WHERE publication='published' AND archived=0) AS publishedProducts,(SELECT COUNT(*) FROM cnc_orders) AS totalOrders,(SELECT COUNT(*) FROM cnc_short_videos) AS totalVideos"
    ).first();
    const events = await db.prepare(
      "SELECT a.id,a.user_id AS actor_id,u.role AS actor_role,a.event AS action,'account' AS target_type,a.user_id AS target_id,'' AS detail,datetime(a.created,'unixepoch') AS created FROM cnc_auth_audit a JOIN cnc_auth_users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 20"
    ).all();
    return Response.json({
      counts: { ...counts, openVideoReports: 0 },
      auditLogs: events.results,
      capabilities: { sellerApplications: true, videoReports: false },
      warnings: [env.KYC_UPLOADS_ENABLED === "true" ? "Seller document review requires manual administrator verification." : "KYC document uploads are disabled. Verify applicant documents outside this staging environment before approving."]
    }, { headers: { "cache-control": "no-store" } });
  }
  if (url.pathname === "/api/admin/seller-applications") {
    if (request.method !== "GET") return new Response(null, { status: 405, headers: { allow: "GET" } });
    const applications = await db.prepare(
      "SELECT a.id,a.user_id,a.business_name,a.cac_number,a.business_type,a.state_location,a.phone,a.description,a.status,a.reviewer_notes,a.reviewed_at,a.created,a.updated,u.email,u.role,u.suspended,a.status AS user_seller_status FROM cnc_seller_applications a JOIN cnc_auth_users u ON u.id=a.user_id ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END,a.updated DESC LIMIT 100"
    ).all();
    return Response.json({
      applications: applications.results,
      available: true,
      warning: env.KYC_UPLOADS_ENABLED === "true" ? null : "Uploaded KYC documents are unavailable. Independently verify business details before approval."
    }, { headers: { "cache-control": "no-store" } });
  }
  if (url.pathname === "/api/admin/seller-applications/review") {
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST" } });
    if (request.headers.get("origin") !== env.AUTH_ORIGIN) return Response.json({ error: "Invalid request origin" }, { status: 403 });
    let body2;
    try {
      body2 = await readBody(request);
    } catch {
      return Response.json({ error: "Invalid review request" }, { status: 400 });
    }
    const id = typeof body2.applicationId === "string" ? body2.applicationId.trim() : "";
    const userId = typeof body2.userId === "string" ? body2.userId.trim() : "";
    const action = body2.decision;
    const notes = typeof body2.notes === "string" ? body2.notes.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(id) || !userId || userId.length > 128 || !["approve", "reject", "suspend"].includes(String(action)) || notes.length > 1e3) {
      return Response.json({ error: "Invalid application review" }, { status: 400 });
    }
    const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended";
    const from = action === "approve" ? "('pending','suspended')" : action === "reject" ? "('pending')" : "('approved')";
    const changed = await db.prepare(
      "UPDATE cnc_seller_applications SET status=?,reviewer_id=?,reviewer_notes=?,reviewed_at=unixepoch(),updated=unixepoch() WHERE id=? AND user_id=? AND status IN " + from + " AND EXISTS (SELECT 1 FROM cnc_auth_users u WHERE u.id=? AND u.verified=1 AND u.role IN ('buyer','seller')) RETURNING id,user_id,status"
    ).bind(status, account.id, notes, id, userId, userId).first();
    if (!changed) return Response.json({ error: "Application changed or is ineligible" }, { status: 409 });
    return Response.json({
      updated: true,
      sellerStatus: status,
      applicationId: changed.id,
      signInRequired: status !== "rejected"
    }, { headers: { "cache-control": "no-store" } });
  }
  if (request.method === "GET") {
    const columns = await db.prepare("PRAGMA table_info(cnc_seller_products)").all();
    const categoryField = columns.results.some((column) => column.name === "category") ? "p.category" : "'' AS category";
    const { results } = await db.prepare(`SELECT p.id,p.name,${categoryField},p.price_minor,p.stock,p.revision,p.publication,s.email AS seller_email,COALESCE(st.name,'') AS store_name FROM cnc_seller_products p JOIN cnc_auth_users s ON s.id=p.owner LEFT JOIN cnc_seller_stores st ON st.owner=p.owner
      WHERE p.publication='pending' AND p.archived=0 AND s.verified=1 AND s.suspended=0 AND s.role='seller' ORDER BY p.id LIMIT 50`).all();
    if (url.pathname.startsWith("/api/")) return Response.json({ products: results }, { headers: { "cache-control": "no-store" } });
    return page("Product moderation", `<h1>Product moderation</h1>${results.map((product) => `<section class="card"><h2>${escape(product.name)}</h2><form method="post"><input type="hidden" name="id" value="${escape(product.id)}">
      <input type="hidden" name="revision" value="${product.revision}"><button name="decision" value="approve">Approve</button>
      <button name="decision" value="reject">Return to draft</button></form></section>`).join("") || "<p>No products awaiting review.</p>"}`);
  }
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "GET, POST" } });
  if (request.headers.get("origin") !== env.AUTH_ORIGIN) return new Response(null, { status: 403 });
  let body;
  try {
    body = await readBody(request);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof body.id !== "string" || body.id.length > 100 || !["approve", "reject"].includes(String(body.decision)) || !Number.isSafeInteger(Number(body.revision)) || Number(body.revision) < 1) return new Response(null, { status: 400 });
  const reviewed = await db.prepare(`INSERT INTO cnc_product_reviews (id,product_id,admin_id,revision,decision)
    SELECT ?,p.id,?,p.revision,? FROM cnc_seller_products p JOIN cnc_auth_users s ON s.id=p.owner
    WHERE p.id=? AND p.revision=? AND p.publication='pending' AND p.archived=0 AND s.role='seller' AND s.verified=1 AND s.suspended=0 RETURNING id`).bind(crypto.randomUUID(), account.id, String(body.decision), body.id, Number(body.revision)).first();
  if (!reviewed) return new Response(null, { status: 409 });
  return url.pathname.startsWith("/api/") ? Response.json({ review: reviewed }, { headers: { "cache-control": "no-store" } }) : new Response(null, { status: 303, headers: { location: "/admin", "cache-control": "no-store" } });
}

// deploy/chatgpt-sites/owner-setup.ts
function response(contents, status = 200) {
  const markup = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cash N Carry \u2014 Owner setup</title><style>body{background:#f8fafc;color:#0f172a;font:16px system-ui,sans-serif;margin:0;padding:28px 16px}main{max-width:480px;margin:5vh auto;background:#fff;padding:28px;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 9px 30px #0206170c}h1{font-size:23px;margin:0 0 14px}p{line-height:1.55;color:#334155}label{display:block;font-size:14px;font-weight:700;margin:18px 0 7px}input{box-sizing:border-box;width:100%;min-height:44px;border:1px solid #94a3b8;border-radius:10px;padding:10px 12px;font-size:16px}button{min-height:44px;margin-top:18px;border:0;background:#0e6b38;color:#fff;border-radius:10px;padding:10px 18px;font-weight:700;cursor:pointer}a{color:#0e6b38;font-weight:650}a:focus-visible,input:focus-visible,button:focus-visible{outline:3px solid #0e6b38;outline-offset:2px}code{display:block;overflow-wrap:anywhere;background:#f1f5f9;border-radius:10px;padding:15px;font-size:16px;letter-spacing:1px}small{color:#475569}</style></head><body><main>' + contents + "</main></body></html>";
  return new Response(markup, { status, headers: {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-robots-tag": "noindex,nofollow,noarchive",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  } });
}
function base32FromHex(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = Uint8Array.from(secret.match(/../g) || [], (pair) => Number.parseInt(pair, 16));
  let value = 0, bits = 0, result = "";
  for (const byte of bytes) {
    value = value << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[value >>> (bits -= 5) & 31];
    }
  }
  if (bits) result += alphabet[value << 5 - bits & 31];
  return result;
}
async function permitOwnerAttempt(env, id) {
  const bucket = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("owner-setup:" + id)));
  const key = Array.from(bucket, (b) => b.toString(16).padStart(2, "0")).join("");
  const window = Math.floor(Date.now() / 6e5);
  const row = await env.AUTH_DB.prepare(
    "INSERT INTO cnc_auth_rate VALUES (?,?,1) ON CONFLICT(bucket) DO UPDATE SET window=excluded.window, attempts=CASE WHEN cnc_auth_rate.window=excluded.window THEN cnc_auth_rate.attempts+1 ELSE 1 END WHERE cnc_auth_rate.window<excluded.window OR (cnc_auth_rate.window=excluded.window AND cnc_auth_rate.attempts<8) RETURNING attempts"
  ).bind(key, window).first();
  return Boolean(row);
}
async function ownerSetupRoute(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/auth/owner-setup") return response("<h1>Not found</h1>", 404);
  if (!env.AUTH_DB || !env.ADMIN_ACCOUNT_ID || !env.ADMIN_TOTP_SECRET_HEX || !/^[a-f0-9]{40,128}$/i.test(env.ADMIN_TOTP_SECRET_HEX) || request.headers.has("authorization") || request.headers.get("x-client-type")) {
    return response("<h1>Owner setup unavailable</h1><p>Sign in through the private staging website first.</p>", 403);
  }
  if (!["GET", "POST"].includes(request.method)) return response("<h1>Method not allowed</h1>", 405);
  const active = await currentAccount(request, env);
  if (!active || active.id !== env.ADMIN_ACCOUNT_ID || active.role !== "seller") {
    return response("<h1>Access denied</h1><p>Only the verified staging owner account can activate administration.</p>", 403);
  }
  if (request.method === "GET") {
    return response('<h1>Activate owner access</h1><p>Confirm your existing account password, then enrol a six-digit authenticator app. Your current seller role changes only when the authenticator code is verified.</p><form action="/api/auth/owner-setup" method="post"><input type="hidden" name="step" value="start"><label for="password">Current account password</label><input id="password" name="password" type="password" autocomplete="current-password" minlength="12" required><button type="submit">Continue</button></form>');
  }
  if (!hasValidMutationOrigin(request, env)) return response("<h1>Invalid request origin</h1>", 403);
  if (!await permitOwnerAttempt(env, active.id)) {
    return response("<h1>Too many attempts</h1><p>Try again later.</p>", 429);
  }
  let body;
  try {
    body = await readBody(request);
  } catch {
    return response("<h1>Invalid form</h1>", 400);
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 12 || password.length > 128) return response("<h1>Invalid password length</h1>", 400);
  const owner = await env.AUTH_DB.prepare(
    "SELECT id,email,credential FROM cnc_auth_users WHERE id=? AND email=? AND role='seller' AND verified=1 AND suspended=0"
  ).bind(active.id, active.email).first();
  if (!owner || !await passwordMatches(password, owner.credential)) {
    return response('<h1>Password not recognised</h1><p>Check your existing account password.</p><a href="/api/auth/owner-setup">Return to setup</a>', 401);
  }
  if (body.step === "start") {
    const key = base32FromHex(env.ADMIN_TOTP_SECRET_HEX);
    const issuer = encodeURIComponent("Cash N Carry Staging");
    const uri = "otpauth://totp/" + encodeURIComponent("Cash N Carry Staging:Owner") + "?secret=" + key + "&issuer=" + issuer + "&algorithm=SHA1&digits=6&period=30";
    return response('<h1>Set up your authenticator</h1><p>In Google Authenticator, Microsoft Authenticator or another TOTP app, choose <strong>Add account</strong> and enter this key. Keep it private.</p><p><a href="' + uri + '">Open authenticator app</a></p><code>' + key + '</code><form action="/api/auth/owner-setup" method="post"><input type="hidden" name="step" value="confirm"><label for="password">Confirm account password</label><input id="password" name="password" type="password" autocomplete="current-password" minlength="12" required><label for="code">Current six-digit authenticator code</label><input id="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required><button type="submit">Activate Admin</button></form><p><small>The account is not promoted until a valid code is submitted.</small></p>');
  }
  if (body.step !== "confirm") return response("<h1>Invalid setup step</h1>", 400);
  const code = typeof body.code === "string" ? body.code : "";
  if (await verifyTotp(env.ADMIN_TOTP_SECRET_HEX, code, Date.now()) === null) {
    return response('<h1>Authenticator code not accepted</h1><p>Check your phone time and repeat setup.</p><a href="/api/auth/owner-setup">Restart setup</a>', 400);
  }
  const changed = await env.AUTH_DB.prepare(
    "UPDATE cnc_auth_users SET role='admin' WHERE id=? AND email=? AND role='seller' AND verified=1 AND suspended=0 RETURNING id"
  ).bind(owner.id, owner.email).first();
  if (!changed) return response("<h1>Owner activation unavailable</h1>", 409);
  await env.AUTH_DB.prepare("DELETE FROM cnc_auth_sessions WHERE user_id=?").bind(owner.id).run();
  return response('<h1>Owner access activated</h1><p>Your account is now the sole staging administrator. You have been signed out of the seller session.</p><p>Return to Cash N Carry, choose <strong>Admin sign-in</strong>, and enter your password and six-digit authenticator code.</p><a href="/">Open Cash N Carry staging</a>');
}

// deploy/chatgpt-sites/marketplace.ts
var routes2 = /* @__PURE__ */ new Set(["/seller/store", "/seller/products", "/cart", "/api/seller/store", "/api/seller/products", "/api/cart"]);
var redirect = (path) => new Response(null, { status: 303, headers: { location: path, "cache-control": "no-store" } });
var text2 = (value) => typeof value === "string" ? value.trim() : "";
function integer(value, min, max) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}
async function marketplaceRoute(request, env) {
  const url = new URL(request.url);
  if (!routes2.has(url.pathname)) return null;
  const api = url.pathname.startsWith("/api/");
  const path = api ? url.pathname.slice(4) : url.pathname;
  const respond = (status, message) => api ? Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } }) : page(message, `<h1>${escape(message)}</h1><p><a href="${path}">Return</a></p>`, status);
  const result = (value) => Response.json(value, { headers: { "cache-control": "no-store" } });
  if (!env.AUTH_DB || env.AUTH_ORIGIN !== url.origin || url.protocol !== "https:") return respond(503, "Marketplace service unavailable");
  const account = await currentAccount(request, env);
  if (!account) return api ? respond(401, "Sign-in required") : redirect("/sign-in");
  if (path === "/cart" ? !["buyer", "seller"].includes(account.role) : account.role !== "seller") return respond(403, "Access denied");
  if (request.method !== "GET" && request.method !== "POST") return respond(405, "Method not allowed");
  const db = env.AUTH_DB;
  const owner = account.id;
  if (path !== "/cart") {
    const approved = await db.prepare("SELECT 1 AS ok FROM cnc_seller_applications WHERE user_id=? AND status='approved'").bind(owner).first();
    if (!approved) return respond(403, "Seller approval required");
  }
  async function cartProduct(id, source) {
    if (source === "replacement") {
      if (env.ORDER_RESERVATIONS !== "enabled") return null;
      const product = await db.prepare(`SELECT p.name,p.stock,p.price_minor / 100.0 AS price FROM cnc_seller_products p
        JOIN cnc_auth_users u ON u.id=p.owner WHERE p.id=? AND p.publication='published' AND p.archived=0
          AND u.role='seller' AND u.verified=1 AND u.suspended=0`).bind(id).first();
      return product;
    }
    return env.DB ? await readProduct(env.DB, id) : null;
  }
  if (request.method === "POST") {
    if (!hasValidMutationOrigin(request, env)) return respond(403, "Invalid request origin");
    let body;
    try {
      body = await readBody(request);
    } catch {
      return respond(400, "Invalid request");
    }
    if (path === "/seller/store") {
      const name = text2(body.name), description = text2(body.description);
      const category = text2(body.category) || "fashion", location = text2(body.location) || "Lagos";
      const phone = text2(body.phone);
      if (!name || name.length > 100 || description.length > 500 || category.length > 80 || location.length > 80 || phone.length > 30) return respond(400, "Invalid store details");
      await db.prepare(
        "INSERT INTO cnc_seller_stores (owner,name,description,category,location,phone) VALUES (?,?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,description=excluded.description,category=excluded.category,location=excluded.location,phone=excluded.phone"
      ).bind(owner, name, description, category, location, phone).run();
      const storefront = await db.prepare("SELECT owner AS id,owner AS owner_id,name,description,category,location,phone,1 AS verified,0 AS followers_count FROM cnc_seller_stores WHERE owner=?").bind(owner).first();
      return api ? result({ saved: true, storefront }) : redirect(path);
    } else if (path === "/seller/products") {
      const id = text2(body.id);
      const revision = integer(body.revision, 1, Number.MAX_SAFE_INTEGER);
      if (body.action === "submit" || body.action === "unpublish") {
        if (!id || revision === null) return respond(400, "Invalid product revision");
        const submit = body.action === "submit";
        const changed = await db.prepare(`UPDATE cnc_seller_products SET publication=?,revision=revision+1
          WHERE id=? AND owner=? AND revision=? AND archived=0 AND publication=? RETURNING id`).bind(submit ? "pending" : "draft", id, owner, revision, submit ? "draft" : "published").first();
        if (!changed) return respond(409, "Product unavailable or changed");
      } else if (body.action === "archive") {
        if (!id || revision === null) return respond(400, "Invalid product revision");
        const changed = await db.prepare(`UPDATE cnc_seller_products SET archived=1,revision=revision+1
          WHERE id=? AND owner=? AND revision=? AND archived=0 RETURNING id`).bind(id, owner, revision).first();
        if (!changed) return respond(409, "Product unavailable or changed");
      } else {
        const name = text2(body.name);
        const price2 = integer(body.priceMinor ?? body.price_minor, 1, 1e9);
        const stock = integer(body.stock, 0, 1e6);
        const categoryInput = typeof body.category === "string" ? text2(body.category) : null;
        const descriptionInput = typeof body.description === "string" ? text2(body.description) : null;
        const imageInput = typeof body.imageUrl === "string" ? text2(body.imageUrl) : typeof body.image === "string" ? text2(body.image) : null;
        const brandInput = typeof body.brand === "string" ? text2(body.brand) : null;
        const compareInput = body.compareAtMinor ?? body.compare_at_minor;
        const compare = compareInput === void 0 || compareInput === null ? null : integer(compareInput, 0, 1e9);
        if (!name || name.length > 160 || price2 === null || stock === null || categoryInput !== null && categoryInput.length > 80 || descriptionInput !== null && descriptionInput.length > 2e3 || brandInput !== null && brandInput.length > 100 || imageInput !== null && (imageInput.length > 1e3 || imageInput && !/^https:\/\/[a-z\d.-]+(?:\/|$)/i.test(imageInput)) || compareInput !== void 0 && compareInput !== null && compare === null) {
          return respond(400, "Invalid product details");
        }
        if (body.action === "create") {
          if (!/^[a-f0-9-]{36}$/i.test(id)) return respond(400, "Invalid product request ID");
          const created = await db.prepare(
            "INSERT INTO cnc_seller_products (id,owner,name,price_minor,stock,category,description,image,brand,compare_at_minor,featured,created) SELECT ?,owner,?,?,?,?,?,?,?,?,0,unixepoch() FROM cnc_seller_stores WHERE owner=? ON CONFLICT(id) DO NOTHING RETURNING id"
          ).bind(
            id,
            name,
            price2,
            stock,
            categoryInput || "uncategorized",
            descriptionInput || "",
            imageInput || "",
            brandInput || "",
            compare ?? price2,
            owner
          ).first();
          if (!created) return respond(409, "Create a store first or reload before retrying");
        } else {
          if (body.action !== "update" || !id || revision === null) return respond(400, "Invalid product revision");
          const changed = await db.prepare(
            "UPDATE cnc_seller_products SET name=?,price_minor=?,stock=?,category=COALESCE(?,category),description=COALESCE(?,description),image=COALESCE(?,image),brand=COALESCE(?,brand),compare_at_minor=COALESCE(?,compare_at_minor),publication='draft',revision=revision+1 WHERE id=? AND owner=? AND revision=? AND archived=0 AND ? + COALESCE((SELECT SUM(i.quantity) FROM cnc_order_items i JOIN cnc_orders o ON o.id=i.order_id WHERE i.product_id=cnc_seller_products.id AND o.status='awaiting_payment'),0)<=1000000 RETURNING id"
          ).bind(
            name,
            price2,
            stock,
            categoryInput,
            descriptionInput,
            imageInput,
            brandInput,
            compare,
            id,
            owner,
            revision,
            stock
          ).first();
          if (!changed) return respond(409, "Product unavailable or changed");
        }
      }
    } else {
      const id = text2(body.id), quantity = integer(body.quantity, 0, 99);
      const source = body.source === "replacement" ? "replacement" : "legacy";
      if (!id || id.length > 100 || quantity === null) return respond(400, "Invalid cart item");
      if (quantity === 0) await db.prepare("DELETE FROM cnc_buyer_cart WHERE buyer=? AND product=?").bind(owner, id).run();
      else {
        if (!env.DB && env.ORDER_RESERVATIONS !== "enabled") return respond(503, "Catalog unavailable");
        const product = await cartProduct(id, source);
        if (!product || product.stock < quantity) return respond(409, "Requested stock unavailable");
        const saved = await db.prepare(`INSERT INTO cnc_buyer_cart (buyer,product,quantity,source)
          SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM cnc_buyer_cart WHERE buyer=?)<40
            OR EXISTS (SELECT 1 FROM cnc_buyer_cart WHERE buyer=? AND product=?)
          ON CONFLICT(buyer,product) DO UPDATE SET quantity=excluded.quantity,source=excluded.source RETURNING product`).bind(owner, id, quantity, source, owner, owner, id).first();
        if (!saved) return respond(409, "Cart item limit reached");
      }
    }
    return api ? result({ updated: true }) : redirect(path);
  }
  if (path === "/seller/store") {
    const store = await db.prepare("SELECT owner AS id,owner AS owner_id,name,description,category,location,phone,1 AS verified,0 AS followers_count FROM cnc_seller_stores WHERE owner=?").bind(owner).first();
    return api ? result({ storefront: store || null }) : page("Store profile", `<h1>Store profile</h1><form method="post" class="account-form">
      <label for="name">Store name</label><input id="name" name="name" maxlength="100" required value="${escape(store?.name)}">
      <label for="description">Description</label><input id="description" name="description" maxlength="500" value="${escape(store?.description)}">
      <button>Save store profile</button></form><p><a href="/seller/products">Manage product drafts</a></p>`);
  }
  if (path === "/seller/products") {
    const { results: items2 } = await db.prepare(`SELECT id,owner,name,description,category,brand,price_minor,compare_at_minor,stock,image AS image_url,featured,revision,publication,created FROM cnc_seller_products
      WHERE owner=? AND archived=0 ORDER BY rowid DESC LIMIT 50`).bind(owner).all();
    if (api) return result({ items: items2 });
    const fields2 = (item) => `<label>Product name <input name="name" maxlength="160" required value="${escape(item?.name)}"></label>
      <label>Price in kobo <input type="number" name="price_minor" min="1" max="1000000000" required value="${escape(item?.price_minor)}"></label>
      <label>Stock <input type="number" name="stock" min="0" max="1000000" required value="${escape(item?.stock)}"></label>`;
    return page("Product drafts", `<h1>Product drafts</h1><p>Drafts are visible only to your seller account.</p>
      <form method="post" class="account-form"><input type="hidden" name="id" value="${crypto.randomUUID()}">${fields2()}<button name="action" value="create">Create draft</button></form>
      ${items2.map((item) => `<section class="card"><h2>${escape(item.name)}</h2><p>Status: ${escape(item.publication)}</p><form method="post" class="account-form">
      <input type="hidden" name="id" value="${escape(item.id)}"><input type="hidden" name="revision" value="${item.revision}">${fields2(item)}
      <button name="action" value="update">Save changes</button><button name="action" value="archive">Archive</button>
      ${item.publication === "draft" ? '<button name="action" value="submit">Submit for review</button>' : item.publication === "published" ? '<button name="action" value="unpublish">Unpublish</button>' : ""}</form></section>`).join("")}`);
  }
  if (!env.DB && env.ORDER_RESERVATIONS !== "enabled") return respond(503, "Catalog unavailable");
  const { results: rows } = await db.prepare("SELECT product,quantity,source FROM cnc_buyer_cart WHERE buyer=? ORDER BY rowid LIMIT 40").bind(owner).all();
  const items = await Promise.all(rows.map(async (row) => ({ ...row, details: await cartProduct(row.product, row.source) })));
  return api ? result({ items }) : page("Your cart", `<h1>Your cart</h1>
    ${items.map((row) => `<article class="card"><h2>${escape(row.details?.name ?? "Unavailable product")}</h2>
    <p>Quantity: ${row.quantity}. ${row.details && row.details.stock >= row.quantity ? "Currently in stock" : "Stock unavailable"}</p>
    <form method="post"><input type="hidden" name="id" value="${escape(row.product)}"><button name="quantity" value="0">Remove</button></form></article>`).join("") || "<p>Your cart is empty.</p>"}
    ${env.ORDER_RESERVATIONS === "enabled" ? '<p><a href="/checkout">Checkout</a> \xB7 <a href="/orders">Order history</a></p>' : "<p>Checkout is unavailable.</p>"}<a href="/shop">Continue shopping</a>`);
}

// deploy/chatgpt-sites/account-pages.ts
var fields = {
  email: '<label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" required>',
  password: '<label for="password">Password</label><input id="password" name="password" type="password" minlength="12" maxlength="128" required>',
  token: '<label for="token">Email verification or reset code</label><input id="token" name="token" minlength="64" maxlength="64" required>'
};
var flows = {
  "/admin/sign-in": { title: "Administrator sign in", action: "admin-login", fields: fields.email + fields.password + '<label for="code">Authenticator code</label><input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required>' },
  "/sign-in": { title: "Sign in", action: "login", fields: fields.email + fields.password.replace("required", 'autocomplete="current-password" required') },
  "/register": { title: "Create an account", action: "register", fields: fields.email },
  "/verify-account": { title: "Verify your account", action: "verify", fields: fields.token + fields.password.replace("required", 'autocomplete="new-password" required') + '<label for="role">Account type</label><select id="role" name="role"><option value="buyer">Buyer</option><option value="seller">Seller</option></select>' },
  "/forgot-password": { title: "Reset your password", action: "request-reset", fields: fields.email },
  "/reset-password": { title: "Choose a new password", action: "reset", fields: fields.token + fields.password.replace("required", 'autocomplete="new-password" required') }
};
var links = '<nav aria-label="Account links"><a href="/sign-in">Sign in</a><a href="/register">Register</a><a href="/verify-account">Verify account</a><a href="/forgot-password">Forgot password</a><a href="/reset-password">Enter reset code</a></nav>';
var redirect2 = (path, cookie2) => new Response(null, {
  status: 303,
  headers: { location: path, "cache-control": "no-store", ...cookie2 ? { "set-cookie": cookie2 } : {} }
});
function form(title, inputs, action, message = "", status = 200) {
  return page(title, `<section class="hero"><h1>${title}</h1></section><section class="card">
${message ? `<p role="status">${escape(message)}</p>` : ""}
<form class="account-form" method="post" action="${action}">${inputs}<button>${title}</button></form></section>${links}`, status);
}
async function accountPage(request, env) {
  const url = new URL(request.url);
  const path = url.pathname === "/login" ? "/sign-in" : url.pathname;
  if (!env.AUTH_DB || env.AUTH_ORIGIN !== url.origin || url.protocol !== "https:") return null;
  const flow = flows[path];
  if (path === "/admin/sign-in") return redirect2("/sign-in");
  if (path === "/sign-in") {
    const unifiedFlow = flows["/sign-in"];
    const unifiedForm = (message = "", status = 200) => {
      const nonce = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (byte) => byte.toString(16).padStart(2, "0")
      ).join("");
      const adminCodeField = '<details><summary>Administrator? Enter authenticator code</summary><label for="code">Six-digit authenticator code</label><input id="code" name="code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code"></details>';
      const inputs = unifiedFlow.fields + adminCodeField + '<input type="hidden" name="admin_csrf" value="' + nonce + '">';
      const res = form(unifiedFlow.title, inputs, path, message, status);
      res.headers.append(
        "set-cookie",
        "__Host-cnc_admin_csrf=" + nonce + "; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=900"
      );
      res.headers.set("cache-control", "no-store");
      return res;
    };
    if (request.method === "GET") return unifiedForm();
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "GET, POST" } });
    let values;
    try {
      values = await readBody(request);
    } catch {
      return unifiedForm("Invalid sign-in form. Please try again.", 400);
    }
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    if (origin && origin !== "null" && origin !== env.AUTH_ORIGIN || request.headers.get("sec-fetch-site") === "cross-site") {
      return unifiedForm("Sign in using this staging website.", 403);
    }
    if (referer) {
      try {
        if (new URL(referer).origin !== env.AUTH_ORIGIN)
          return unifiedForm("Sign in using this staging website.", 403);
      } catch {
        return unifiedForm("Invalid sign-in source.", 403);
      }
    }
    const supplied = typeof values.admin_csrf === "string" ? values.admin_csrf : "";
    const stored = (request.headers.get("cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith("__Host-cnc_admin_csrf="))?.slice("__Host-cnc_admin_csrf=".length) || "";
    if (!/^[a-f0-9]{64}$/.test(supplied) || !/^[a-f0-9]{64}$/.test(stored))
      return unifiedForm("Security check expired. Please submit the new form.", 403);
    let difference = 0;
    for (let i = 0; i < 64; i++)
      difference |= supplied.charCodeAt(i) ^ stored.charCodeAt(i);
    if (difference !== 0)
      return unifiedForm("Security check expired. Please submit the new form.", 403);
    const email = typeof values.email === "string" ? values.email.trim() : "";
    const password = typeof values.password === "string" ? values.password : "";
    const code = typeof values.code === "string" ? values.code : "";
    const canonicalEmail = email.trim().toLowerCase();
    const accountRole = canonicalEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(canonicalEmail) ? await env.AUTH_DB.prepare("SELECT role FROM cnc_auth_users WHERE email=?").bind(canonicalEmail).first() : null;
    const isAdmin = accountRole?.role === "admin";
    const headers = new Headers(request.headers);
    headers.set("origin", env.AUTH_ORIGIN);
    headers.set("content-type", "application/x-www-form-urlencoded");
    headers.delete("content-length");
    headers.delete("authorization");
    headers.delete("x-client-type");
    const apiUrl = new URL(isAdmin ? "/api/auth/admin-login" : "/api/auth/login", url);
    const forwarded = new Request(apiUrl, {
      method: "POST",
      headers,
      body: new URLSearchParams({ email, password, code }).toString()
    });
    const signedIn = await authRoute(forwarded, env);
    if (!signedIn.ok) {
      const message = signedIn.status === 429 ? "Too many attempts. Please try again later." : signedIn.status === 503 ? "Sign-in temporarily unavailable." : "Sign-in failed. Check your password and, if you are an Admin, your authenticator code.";
      return unifiedForm(message, signedIn.status);
    }
    const sessionCookie2 = signedIn.headers.get("set-cookie");
    if (!sessionCookie2) return unifiedForm("Unable to start a session.", 503);
    return redirect2(isAdmin ? "/admin" : accountRole?.role === "seller" ? "/seller-centre" : "/shop", sessionCookie2);
  }
  if (flow || path === "/sign-out") {
    if (request.method === "GET" && flow) return form(flow.title, flow.fields, path);
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST" } });
    const apiUrl = new URL("/api/auth/" + (flow?.action ?? "logout"), url);
    const result = await authRoute(new Request(apiUrl, request), env);
    if (!flow) return result.ok ? redirect2("/sign-in", result.headers.get("set-cookie")) : result;
    if (!result.ok) {
      const data = await result.json();
      return form(flow.title, flow.fields, path, data.error ?? "Account service unavailable.", result.status);
    }
    if (flow.action === "admin-login") return redirect2("/admin", result.headers.get("set-cookie"));
    if (flow.action === "login") return redirect2("/account", result.headers.get("set-cookie"));
    if (flow.action === "register" || flow.action === "request-reset") {
      const next = flow.action === "register" ? "/verify-account" : "/reset-password";
      return page(flow.title, `<h1>${flow.title}</h1><p>If the address is eligible, a code will be sent.</p><a href="${next}">Enter your code</a>`, 202);
    }
    return redirect2("/sign-in");
  }
  if (!["/account", "/profile", "/addresses", "/seller/dashboard"].includes(path)) return null;
  const account = await currentAccount(request, env);
  if (!account) return redirect2("/sign-in");
  if (path === "/seller/dashboard" && account.role !== "seller") return page("Access denied", "<h1>Seller access required</h1>", 403);
  if (path === "/addresses") return addresses(request, env, account.id);
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { allow: "GET" } });
  const seller = path === "/seller/dashboard";
  const title = seller ? "Seller Centre" : "My account";
  return page(title, `<section class="hero"><h1>${title}</h1></section><section class="card">
<p>${escape(account.email)}</p><p>Account type: ${escape(account.role)}</p>
<a href="/addresses">Manage delivery addresses</a>${account.role === "buyer" ? ' \xB7 <a href="/cart">Cart</a>' : ""}${account.role === "seller" && !seller ? ' \xB7 <a href="/seller/dashboard">Seller Centre</a>' : ""}
${seller ? '<nav aria-label="Seller management"><a href="/seller/store">Store profile</a><a href="/seller/products">Product drafts</a></nav>' : ""}
<form method="post" action="/sign-out"><button>Sign out</button></form></section>`);
}
async function addresses(request, env, userId) {
  const db = env.AUTH_DB;
  if (request.method === "POST") {
    if (request.headers.get("origin") !== env.AUTH_ORIGIN) return page("Addresses", "<h1>Invalid request origin</h1>", 403);
    let body;
    try {
      body = await readBody(request);
    } catch {
      return page("Addresses", "<h1>Invalid request</h1>", 400);
    }
    if (body.action === "delete" && typeof body.id === "string" && /^[a-f\d-]{36}$/.test(body.id)) {
      await db.prepare("DELETE FROM cnc_buyer_addresses WHERE id=? AND user_id=?").bind(body.id, userId).run();
      return redirect2("/addresses");
    }
    const parts = ["recipient", "line", "city", "state"].map((key) => typeof body[key] === "string" ? body[key].trim() : "");
    if (body.action !== "add" || parts.some((value, index) => !value || value.length > (index === 1 ? 240 : 100))) {
      return page("Addresses", '<h1>Invalid address</h1><p>Complete all address fields.</p><a href="/addresses">Try again</a>', 400);
    }
    const results2 = await db.prepare(`INSERT INTO cnc_buyer_addresses (id,user_id,recipient,line,city,state)
      SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM cnc_buyer_addresses WHERE user_id=?)<20 RETURNING id`).bind(crypto.randomUUID(), userId, ...parts, userId).first();
    return results2 ? redirect2("/addresses") : page("Addresses", "<h1>Address limit reached</h1>", 409);
  }
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { allow: "GET, POST" } });
  const { results } = await db.prepare("SELECT id,recipient,line,city,state FROM cnc_buyer_addresses WHERE user_id=? ORDER BY rowid DESC LIMIT 20").bind(userId).all();
  return page("Addresses", `<section class="hero"><h1>Delivery addresses</h1></section>
<section class="grid">${results.map((row) => `<article class="card"><h2>${escape(row.recipient)}</h2><p>${escape(row.line)}, ${escape(row.city)}, ${escape(row.state)}</p>
<form method="post"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${escape(row.id)}"><button>Remove address</button></form></article>`).join("") || "<p>No saved addresses.</p>"}</section>
<form class="account-form" method="post"><input type="hidden" name="action" value="add">
<label for="recipient">Recipient</label><input id="recipient" name="recipient" maxlength="100" required>
<label for="line">Street address</label><input id="line" name="line" maxlength="240" required>
<label for="city">City</label><input id="city" name="city" maxlength="100" required>
<label for="state">State</label><input id="state" name="state" maxlength="100" required><button>Add address</button></form>`);
}

// deploy/chatgpt-sites/auctions.ts
var json5 = (data, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
async function auctionsRoute(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/auctions") return null;
  const db = env.AUTH_DB;
  if (!db) return json5({ error: "Database unavailable" }, 503);
  const account = await currentAccount(request, env);
  if (request.method === "GET") {
    const viewerId = account?.id ?? null;
    const now = Math.floor(Date.now() / 1e3);
    const { results } = await db.prepare(
      `SELECT a.id, a.seller, a.product_id, a.title, a.starting_bid_kobo, a.current_bid_kobo,
                a.winner_id, a.ends_at, a.closed_at, a.order_id, a.created,
                s.name AS store_name, p.image AS image_url,
                (SELECT COUNT(*) FROM cnc_bids b WHERE b.auction_id=a.id) AS bids_count
         FROM cnc_auctions a
         LEFT JOIN cnc_seller_stores s ON s.owner=a.seller
         LEFT JOIN cnc_seller_products p ON p.id=a.product_id
         WHERE a.closed_at IS NULL OR a.winner_id = ?
         ORDER BY a.ends_at DESC LIMIT 50`
    ).bind(viewerId ?? "").all();
    return json5({
      paymentsEnabled: env.PAYMENTS_ENABLED === "true",
      auctions: (results || []).map((a) => ({
        id: a.id,
        sellerId: a.seller,
        productId: a.product_id,
        image: a.image_url || "",
        bidsCount: a.bids_count || 0,
        title: a.title,
        startingBid: (a.starting_bid_kobo / 100).toFixed(2),
        currentBid: a.current_bid_kobo ? (a.current_bid_kobo / 100).toFixed(2) : null,
        endsAt: new Date(a.ends_at * 1e3).toISOString(),
        closedAt: a.closed_at ? new Date(a.closed_at * 1e3).toISOString() : null,
        storefrontName: a.store_name || "Verified Seller",
        own: viewerId !== null && a.seller === viewerId,
        // Do not expose another buyer's account identifier or imply the auction has settled.
        winnerId: viewerId !== null && a.winner_id === viewerId ? viewerId : null,
        ended: Boolean(a.closed_at) || now >= a.ends_at,
        winning: viewerId !== null && a.winner_id === viewerId && (Boolean(a.closed_at) || now >= a.ends_at),
        orderId: viewerId !== null && a.winner_id === viewerId ? a.order_id : null
      }))
    });
  }
  if (request.method === "POST") {
    if (!hasValidMutationOrigin(request, env)) {
      return json5({ error: "Invalid request origin" }, 403);
    }
    if (!account) return json5({ error: "Sign-in required" }, 401);
    if (account.role !== "seller") return json5({ error: "Seller role required" }, 403);
    const approval = await db.prepare(
      `SELECT a.user_id FROM cnc_seller_applications a
       JOIN cnc_auth_users u ON u.id=a.user_id
       WHERE a.user_id=? AND a.status='approved'
         AND u.role='seller' AND u.verified=1 AND u.suspended=0`
    ).bind(account.id).first();
    if (!approval) {
      return json5({ error: "Administrator-approved seller account required", code: "SELLER_APPROVAL_REQUIRED" }, 403);
    }
    let body;
    try {
      body = await readBody(request);
    } catch {
      return json5({ error: "Invalid JSON" }, 400);
    }
    const { productId, startingBidKobo } = body || {};
    const durationMinutes = body?.durationMinutes ?? Number(body?.durationHours) * 60;
    if (typeof productId !== "string" || productId.length > 128 || !Number.isSafeInteger(startingBidKobo) || startingBidKobo < 100 || startingBidKobo > 1e11 || !Number.isSafeInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080) {
      return json5({ error: "Valid product, amount and auction duration (1 minute to 7 days) required" }, 400);
    }
    const guard = await db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='cnc_auction_reserve_product'").first();
    if (!guard) return json5({ error: "Auction stock protection unavailable", code: "AUCTION_GUARD_MISSING" }, 503);
    const product = await db.prepare(`SELECT id, name, stock, publication, archived FROM cnc_seller_products WHERE id = ? AND owner = ?`).bind(productId, account.id).first();
    if (!product || product.archived !== 0 || product.publication !== "published" || product.stock < 1) {
      return json5({ error: "Published product with available stock required" }, 409);
    }
    const auctionId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1e3);
    const endsAt = now + durationMinutes * 60;
    try {
      await db.prepare(
        `INSERT INTO cnc_auctions (id, seller, product_id, title, starting_bid_kobo, current_bid_kobo, ends_at, created)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`
      ).bind(auctionId, account.id, productId, product.name, startingBidKobo, endsAt, now).run();
    } catch (error) {
      if (error instanceof Error && /CNC_AUCTION_(?:STOCK|PRODUCT)_UNAVAILABLE|CHECK constraint failed/.test(error.message))
        return json5({ error: "Product is no longer eligible or in stock", code: "AUCTION_STOCK_UNAVAILABLE" }, 409);
      throw error;
    }
    return json5({ success: true, auctionId, id: auctionId }, 201);
  }
  if (request.method === "PATCH") {
    if (!hasValidMutationOrigin(request, env)) {
      return json5({ error: "Invalid request origin" }, 403);
    }
    if (!account) return json5({ error: "Sign-in required" }, 401);
    let body;
    try {
      body = await readBody(request);
    } catch {
      return json5({ error: "Invalid JSON" }, 400);
    }
    const { action, id } = body || {};
    if (!id || !["bid", "close", "checkout"].includes(action)) {
      return json5({ error: "Valid action and id required" }, 400);
    }
    if (action === "checkout" && env.PAYMENTS_ENABLED !== "true") {
      return json5({
        error: "Payments temporarily unavailable \u2014 auction checkout settlement is disabled in staging",
        code: "PAYMENTS_DISABLED",
        paymentsEnabled: false
      }, 503);
    }
    const auction = await db.prepare(`SELECT * FROM cnc_auctions WHERE id = ?`).bind(id).first();
    if (!auction) return json5({ error: "Auction not found" }, 404);
    const now = Math.floor(Date.now() / 1e3);
    if (action === "bid") {
      if (account.role !== "buyer") return json5({ error: "Only buyers can place bids" }, 403);
      if (auction.seller === account.id) return json5({ error: "Cannot bid on your own auction" }, 403);
      if (auction.closed_at || now >= auction.ends_at) return json5({ error: "Auction is ended" }, 409);
      const shippingSetup = await db.prepare(
        `SELECT id FROM cnc_buyer_addresses WHERE user_id=? LIMIT 1`
      ).bind(account.id).first();
      if (!shippingSetup)
        return json5({
          error: "Save a delivery address in your Profile before bidding",
          code: "BUYER_ADDRESS_REQUIRED"
        }, 409);
      const amountKobo = body.amountKobo;
      const minRequired = auction.current_bid_kobo ? auction.current_bid_kobo + 100 : auction.starting_bid_kobo;
      if (!Number.isSafeInteger(amountKobo) || amountKobo < 100 || amountKobo > 1e11)
        return json5({ error: "Bid must be a valid whole-kobo amount", code: "INVALID_BID_AMOUNT" }, 400);
      if (amountKobo < minRequired)
        return json5({ error: `Bid is too low: minimum ${(minRequired / 100).toFixed(2)} NGN`, code: "BID_CONFLICT" }, 409);
      const bidGuard = await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger' AND name IN ('cnc_bid_validate','cnc_bid_update_auction')").first();
      if (bidGuard?.n !== 2) return json5({ error: "Atomic bidding unavailable", code: "BID_GUARD_MISSING" }, 503);
      const bidId = crypto.randomUUID();
      try {
        await db.prepare(
          `INSERT INTO cnc_bids (id, auction_id, bidder_id, amount_kobo, created) VALUES (?, ?, ?, ?, unixepoch())`
        ).bind(bidId, auction.id, account.id, amountKobo).run();
      } catch (error) {
        if (error instanceof Error && /CNC_BID_REJECTED|constraint failed/i.test(error.message))
          return json5({ error: "Bid rejected: auction ended or a higher bid was already accepted", code: "BID_CONFLICT" }, 409);
        throw error;
      }
      return json5({ success: true, bidId, currentBidKobo: amountKobo });
    }
    if (action === "close") {
      if (auction.seller !== account.id && account.role !== "admin")
        return json5({ error: "Unauthorized to close auction" }, 403);
      if (!auction.closed_at && now < auction.ends_at && account.role !== "admin")
        return json5({ error: "Auction cannot close before its scheduled end", code: "AUCTION_NOT_ENDED" }, 409);
      const closeGuard = await db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='cnc_auction_close_no_bid'").first();
      if (!closeGuard) return json5({ error: "Auction release protection unavailable", code: "AUCTION_GUARD_MISSING" }, 503);
      const updated = await db.prepare(
        `UPDATE cnc_auctions SET closed_at=unixepoch()
         WHERE id=? AND closed_at IS NULL AND (ends_at<=unixepoch() OR ?='admin') RETURNING id`
      ).bind(auction.id, account.role).first();
      return updated || auction.closed_at ? json5({ success: true, closed: true, alreadyClosed: !updated }) : json5({ error: "Auction has not ended", code: "AUCTION_NOT_ENDED" }, 409);
    }
    if (action === "checkout") {
      if (account.role !== "buyer" || auction.winner_id !== account.id)
        return json5({ error: "Only the winning bidder can checkout" }, 403);
      if (!auction.closed_at && now < auction.ends_at)
        return json5({ error: "Auction is still running" }, 409);
      return json5({
        error: "Auction winner checkout requires a dedicated order reservation and verified shipping quote",
        code: "AUCTION_SETTLEMENT_NOT_CONFIGURED",
        paymentsEnabled: false
      }, 503);
    }
    return json5({ error: "Unsupported auction action" }, 400);
  }
  return json5({ error: "Method not allowed" }, 405);
}

// deploy/chatgpt-sites/coins.ts
var gifts = { rose: 10, star: 100, lion: 1e3 };
var json6 = (data, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
async function coinsRoute(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/coins") return null;
  const db = env.AUTH_DB;
  if (!db) return json6({ error: "Database unavailable" }, 503);
  const account = await currentAccount(request, env);
  if (!account) return json6({ error: "Sign-in required" }, 401);
  const purchasesEnabled = false;
  if (request.method === "GET") {
    const balanceRow = await db.prepare(`SELECT COALESCE(SUM(delta), 0) as balance FROM cnc_coin_ledger WHERE user_id = ?`).bind(account.id).first();
    const { results } = await db.prepare(`SELECT id, delta, reason, created FROM cnc_coin_ledger WHERE user_id = ? ORDER BY created DESC LIMIT 50`).bind(account.id).all();
    return json6({
      balance: balanceRow?.balance ?? 0,
      purchasesEnabled,
      activity: (results || []).map((r) => ({
        id: r.id,
        delta: r.delta,
        reason: r.reason,
        createdAt: new Date(r.created * 1e3).toISOString()
      }))
    });
  }
  if (request.method === "POST") {
    if (!hasValidMutationOrigin(request, env)) {
      return json6({ error: "Invalid request origin" }, 403);
    }
    let body;
    try {
      body = await readBody(request);
    } catch {
      return json6({ error: "Invalid JSON" }, 400);
    }
    const { action, requestId, recipientId } = body || {};
    if (typeof requestId !== "string" || !/^[a-zA-Z0-9_-]{12,100}$/.test(requestId) || typeof recipientId !== "string" || recipientId.length < 1 || recipientId.length > 128 || !["credit", "gift"].includes(action)) {
      return json6({ error: "Valid action (credit/gift), requestId and recipientId required" }, 400);
    }
    if (action === "credit") {
      return json6({
        error: "Direct coin credits are unavailable: verified payment or owner-approved promotion required",
        code: "COIN_CREDIT_NOT_AUTHORIZED",
        purchasesEnabled: false
      }, 503);
    }
    if (action === "gift" && recipientId === account.id) {
      return json6({ error: "Select another recipient" }, 400);
    }
    const recipient = await db.prepare(`SELECT id, role, suspended FROM cnc_auth_users WHERE id = ?`).bind(recipientId).first();
    if (!recipient || recipient.suspended !== 0 || recipient.role !== "seller") {
      return json6({ error: "Recipient account unavailable" }, 404);
    }
    const now = Math.floor(Date.now() / 1e3);
    const key = `${action}:${account.id}:${requestId}`;
    if (action === "gift") {
      const giftType = body.gift;
      if (!gifts[giftType]) {
        return json6({ error: "Valid gift type required (rose, star, lion)" }, 400);
      }
      const cost = gifts[giftType];
      const existingGift = await db.prepare(`SELECT id, receiver_id, gift_type FROM cnc_gifts WHERE request_key = ?`).bind(key).first();
      if (existingGift) {
        if (existingGift.receiver_id !== recipientId || existingGift.gift_type !== giftType)
          return json6({ error: "Request ID already used for a different gift", code: "GIFT_IDEMPOTENCY_CONFLICT" }, 409);
        return json6({ success: true, giftId: existingGift.id, duplicated: true });
      }
      const coinGuard = await db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='cnc_coin_prevent_overdraft'").first();
      if (!coinGuard) return json6({ error: "Coin wallet protection unavailable", code: "WALLET_GUARD_MISSING" }, 503);
      const giftId = crypto.randomUUID();
      const debitKey = `${key}:debit`;
      const creditKey = `${key}:credit`;
      try {
        await db.batch([
          db.prepare(
            `INSERT INTO cnc_gifts (id, sender_id, receiver_id, gift_type, amount, request_key, created)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(giftId, account.id, recipientId, giftType, cost, key, now),
          db.prepare(
            `INSERT INTO cnc_coin_ledger (id, user_id, delta, reason, idempotency_key, created)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(crypto.randomUUID(), account.id, -cost, `Sent ${giftType} gift`, debitKey, now),
          db.prepare(
            `INSERT INTO cnc_coin_ledger (id, user_id, delta, reason, idempotency_key, created)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(crypto.randomUUID(), recipientId, cost, `Received ${giftType} gift`, creditKey, now)
        ]);
      } catch (error) {
        if (error instanceof Error && /CNC_INSUFFICIENT_COINS/.test(error.message))
          return json6({ error: "Insufficient coin balance", code: "INSUFFICIENT_COINS" }, 409);
        if (error instanceof Error && /UNIQUE constraint failed/.test(error.message)) {
          const existing = await db.prepare("SELECT id,receiver_id,gift_type FROM cnc_gifts WHERE request_key=?").bind(key).first();
          if (existing && existing.receiver_id === recipientId && existing.gift_type === giftType)
            return json6({ success: true, giftId: existing.id, duplicated: true });
          return json6({ error: "Duplicate gift request", code: "GIFT_IDEMPOTENCY_CONFLICT" }, 409);
        }
        throw error;
      }
      return json6({ success: true, giftId, giftType, cost });
    }
    return json6({ error: "Unsupported action" }, 400);
  }
  return json6({ error: "Method not allowed" }, 405);
}

// deploy/chatgpt-sites/edge-seo.ts
var CATEGORY_MAP = {
  tech: {
    label: "Tech & Electronics Deals",
    desc: "Shop authentic gadgets, smartphones, audio gear, and accessories at wholesale prices in Nigeria. Fast dispatch with verified escrow warranty protection."
  },
  fashion: {
    label: "Fashion & Ankara Collections",
    desc: "Discover trending Nigerian fashion, Ankara prints, and ready-to-wear apparel from verified Lagos designers with fast nationwide delivery and escrow."
  },
  beauty: {
    label: "Beauty & Skincare Essentials",
    desc: "Shop genuine skincare, cosmetics, and beauty sets from verified Nigerian sellers. Guaranteed authentic formulas with secure escrow checkout and delivery."
  },
  food: {
    label: "Food & Groceries Fresh Market",
    desc: "Order pantry staples, fresh food, and wholesale groceries in Nigeria. Direct from market vendors with refrigerated handling and express doorstep delivery."
  },
  home: {
    label: "Home & Kitchen Appliances",
    desc: "Shop quality home essentials, cookware, and reliable kitchen appliances with manufacturer warranty, secure payment escrow, and fast delivery in Nigeria."
  },
  services: {
    label: "Verified Services & Logistics",
    desc: "Book verified commercial services, logistics dispatch, and artisan assistance across Lagos and Nigeria with escrow protection and money-back guarantee."
  }
};
async function resolveEdgeSEO({ url, db, baseUrl }) {
  const origin = (baseUrl || url.origin || "https://www.cashncarryng.com").replace(/\/+$/, "");
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const defaultImage = `${origin}/brand/logo.png`;
  const productMatch = /^\/(?:product|products)\/([^/]+)$/.exec(pathname);
  if (productMatch) {
    const rawId = decodeURIComponent(productMatch[1]);
    let product = null;
    if (db) {
      try {
        const record = await readProduct(db, rawId);
        if (record) {
          const item = record;
          const price2 = Number(item.price);
          if (Number.isFinite(price2) && price2 > 0) {
            product = {
              id: String(item.id),
              slug: String(item.id),
              title: String(item.name || ""),
              brand: "Verified seller",
              price: price2,
              description: String(item.description || ""),
              image: String(item.image || ""),
              category: String(item.category || "")
            };
          }
        }
      } catch {
      }
    }
    if (product) {
      const formattedPrice = `\u20A6${product.price.toLocaleString()}`;
      const title = `${product.title} - ${formattedPrice} | Cash N Carry`.slice(0, 60);
      const rawDesc = `${product.title} by ${product.brand}. Buy for ${formattedPrice} on Cash N Carry Nigeria with fast delivery, warranty, and secure escrow.`;
      const description = rawDesc.length > 160 ? `${rawDesc.slice(0, 157)}...` : rawDesc;
      const canonicalUrl2 = `${origin}/product/${encodeURIComponent(product.slug || product.id)}`;
      const breadcrumbs = {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Shop", item: `${origin}/shop` },
          {
            "@type": "ListItem",
            position: 3,
            name: CATEGORY_MAP[product.category]?.label || product.category || "Catalog",
            item: `${origin}/shop?category=${encodeURIComponent(product.category || "all")}`
          },
          { "@type": "ListItem", position: 4, name: product.title, item: canonicalUrl2 }
        ]
      };
      const productSchema = {
        "@type": "Product",
        name: product.title,
        image: [product.image || defaultImage],
        description: product.description,
        sku: product.id,
        brand: { "@type": "Brand", name: product.brand || "Cash N Carry Nigeria" },
        offers: {
          "@type": "Offer",
          url: canonicalUrl2,
          priceCurrency: "NGN",
          price: product.price,
          itemCondition: "https://schema.org/NewCondition",
          availability: "https://schema.org/InStock"
        }
      };
      return {
        title,
        description,
        canonicalUrl: canonicalUrl2,
        ogType: "product",
        image: product.image || defaultImage,
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [productSchema, breadcrumbs]
        }
      };
    }
  }
  if (pathname === "/shop") {
    const categoryQuery = url.searchParams.get("category")?.toLowerCase();
    const catData = categoryQuery ? CATEGORY_MAP[categoryQuery] : null;
    const title = catData ? `${catData.label} | Cash N Carry Nigeria` : "Shop Marketplace Wholesale & Retail | Cash N Carry";
    const description = catData ? catData.desc : "Browse verified Nigerian wholesale and retail products with genuine CAC-verified seller protection, instant delivery, and Flutterwave escrow payments.";
    const canonicalUrl2 = categoryQuery && categoryQuery !== "all" ? `${origin}/shop?category=${encodeURIComponent(categoryQuery)}` : `${origin}/shop`;
    const breadcrumbItems = [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${origin}/shop` }
    ];
    if (catData) {
      breadcrumbItems.push({
        "@type": "ListItem",
        position: 3,
        name: catData.label,
        item: canonicalUrl2
      });
    }
    return {
      title,
      description,
      canonicalUrl: canonicalUrl2,
      ogType: "website",
      image: defaultImage,
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            name: catData ? catData.label : "Cash N Carry Marketplace Catalog",
            description,
            url: canonicalUrl2
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbItems
          }
        ]
      }
    };
  }
  const sectionMap = {
    "/auctions": {
      title: "Live Penny Auctions & Bidding | Cash N Carry Nigeria",
      desc: "Bid in real-time verified auctions starting at \u20A6100. Win premium electronics, phones, and appliances with fast delivery and transparent escrow tracking."
    },
    "/live": {
      title: "Interactive Live Shopping Stream | Cash N Carry",
      desc: "Watch interactive live shopping streams from verified Nigerian vendors, claim exclusive flash vouchers, and buy featured products with 1-click checkout."
    },
    "/flash-deals": {
      title: "Flash Deals & Limited Discounts | Cash N Carry",
      desc: "Grab limited-time flash sales with up to 60% off top electronics, fashion, and daily essentials across Nigeria. Secure escrow protection on every order."
    },
    "/coins": {
      title: "CNC Coins, Gifting & Rewards | Cash N Carry Nigeria",
      desc: "Claim daily CNC reward coins, send stream gifts to verified sellers, and unlock loyalty discounts on your Cash N Carry purchases across Nigeria."
    },
    "/returns": {
      title: "Returns & Escrow Protection | Cash N Carry Nigeria",
      desc: "Cash N Carry 7-day buyer protection: easy returns, dispute resolution, and instant escrow refund protection for all verified marketplace purchases."
    }
  };
  if (sectionMap[pathname]) {
    const info = sectionMap[pathname];
    const canonicalUrl2 = `${origin}${pathname}`;
    return {
      title: info.title,
      description: info.desc,
      canonicalUrl: canonicalUrl2,
      ogType: "website",
      image: defaultImage,
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            name: info.title,
            description: info.desc,
            url: canonicalUrl2
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
              { "@type": "ListItem", position: 2, name: info.title, item: canonicalUrl2 }
            ]
          }
        ]
      }
    };
  }
  const canonicalUrl = `${origin}/`;
  return {
    title: "Cash N Carry Nigeria | Online Shopping & Live Deals",
    description: "Shop Nigeria's premier live commerce marketplace for authentic fashion, tech, groceries, and appliances with fast nationwide delivery and escrow protection.",
    canonicalUrl,
    ogType: "website",
    image: defaultImage,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "Cash N Carry Nigeria",
          url: canonicalUrl,
          description: "Nigeria's premier live commerce marketplace for authentic fashion, tech, groceries, and appliances with fast nationwide delivery and escrow protection."
        }
      ]
    }
  };
}
function escapeSEOText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeSEOAttribute(value) {
  return escapeSEOText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function safeStructuredData(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function injectEdgeSEOMeta(html, seo) {
  let modified = html;
  const titleText = escapeSEOText(seo.title);
  const titleAttr = escapeSEOAttribute(seo.title);
  const descAttr = escapeSEOAttribute(seo.description);
  const canonicalAttr = escapeSEOAttribute(seo.canonicalUrl);
  const imageAttr = escapeSEOAttribute(seo.image);
  if (/<title>[\s\S]*?<\/title>/i.test(modified)) {
    modified = modified.replace(/<title>[\s\S]*?<\/title>/i, () => "<title>" + titleText + "</title>");
  } else {
    modified = modified.replace(/<head>/i, () => "<head>\n    <title>" + titleText + "</title>");
  }
  const descriptionTag = '<meta name="description" content="' + descAttr + '" />';
  if (/<meta\s+name=["']description["'][^>]*>/i.test(modified)) {
    modified = modified.replace(/<meta\s+name=["']description["'][^>]*>/i, () => descriptionTag);
  } else {
    modified = modified.replace(/<\/title>/i, () => "</title>\n    " + descriptionTag);
  }
  const canonicalTag = '<link rel="canonical" href="' + canonicalAttr + '" />';
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(modified)) {
    modified = modified.replace(/<link\s+rel=["']canonical["'][^>]*>/i, () => canonicalTag);
  } else {
    modified = modified.replace(/<\/title>/i, () => "</title>\n    " + canonicalTag);
  }
  const socialTags = [
    '<meta property="og:title" content="' + titleAttr + '" />',
    '<meta property="og:description" content="' + descAttr + '" />',
    '<meta property="og:url" content="' + canonicalAttr + '" />',
    '<meta property="og:type" content="' + seo.ogType + '" />',
    '<meta property="og:image" content="' + imageAttr + '" />',
    '<meta property="og:site_name" content="Cash N Carry Nigeria" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + titleAttr + '" />',
    '<meta name="twitter:description" content="' + descAttr + '" />',
    '<meta name="twitter:image" content="' + imageAttr + '" />',
    '<meta name="twitter:url" content="' + canonicalAttr + '" />',
    '<script id="cnc-seo-structured-data" type="application/ld+json">' + safeStructuredData(seo.jsonLd) + "<\/script>"
  ].join("\n    ");
  modified = modified.replace(/<meta\s+property=["']og:(?:title|description|url|type|image|site_name)["'][^>]*>/gi, "");
  modified = modified.replace(/<meta\s+name=["']twitter:(?:card|title|description|image|url)["'][^>]*>/gi, "");
  modified = modified.replace(/<script id=["']cnc-seo-structured-data["'][^>]*>[\s\S]*?<\/script>/gi, "");
  return modified.replace(/<\/head>/i, () => "\n    " + socialTags + "\n  </head>");
}

// deploy/chatgpt-sites/unified-sync.ts
var json7 = (data, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
var text3 = (v, maxLen = 400) => typeof v === "string" ? v.trim().slice(0, maxLen) : "";
function stripApiPrefix(pathname) {
  if (pathname.startsWith("/api/v1/")) return pathname.slice("/api/v1".length);
  if (pathname.startsWith("/api/")) return pathname.slice("/api".length);
  return pathname;
}
async function unifiedSyncRoute(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  const route2 = stripApiPrefix(url.pathname);
  const supported = /* @__PURE__ */ new Set([
    "/profile",
    "/addresses",
    "/wishlist",
    "/follows",
    "/videos",
    "/videos/like",
    "/videos/comments",
    "/live",
    "/live/comments",
    "/messages",
    "/notifications",
    "/reviews",
    "/seller/orders",
    "/seller/orders/fulfil"
  ]);
  if (!supported.has(route2)) return null;
  const db = env.AUTH_DB;
  if (!db) return json7({ error: "Database unavailable" }, 503);
  const account = await currentAccount(request, env);
  const streamEnv = env;
  const streamingConfigured = Boolean(streamEnv.STREAM_WHIP_URL && streamEnv.STREAM_WHEP_URL);
  if (request.method === "GET") {
    if (route2 === "/videos") {
      const { results } = await db.prepare(
        `SELECT id, seller_id, seller_name, product_id, title, caption, video_url, cover_url, likes_count, comments_count, created
           FROM cnc_short_videos ORDER BY created DESC LIMIT 50`
      ).all();
      return json7({ videos: results ?? [] });
    }
    if (route2 === "/videos/comments") {
      const videoId = text3(url.searchParams.get("video_id"), 128);
      if (!videoId) return json7({ error: "video_id required" }, 400);
      const { results } = await db.prepare(
        `SELECT id, video_id, user_id, author_name, body, created
           FROM cnc_video_comments WHERE video_id = ? ORDER BY created DESC LIMIT 50`
      ).bind(videoId).all();
      return json7({ comments: results ?? [] });
    }
    if (route2 === "/live") {
      const { results } = await db.prepare(
        `SELECT room_id, seller_id, seller_name, title, category, status, viewer_count, hearts_count, pinned_product_id, stream_url, created
           FROM cnc_live_room_state ORDER BY (CASE WHEN status='live' THEN 0 ELSE 1 END), created DESC LIMIT 30`
      ).all();
      return json7({
        rooms: (results ?? []).map((r) => ({ ...r, viewer_count: null })),
        liveStreamingConfigured: streamingConfigured
      });
    }
    if (route2 === "/live/comments") {
      const roomId = text3(url.searchParams.get("room_id") ?? url.searchParams.get("roomId"), 128);
      if (!roomId) return json7({ error: "room_id required" }, 400);
      const { results } = await db.prepare(
        `SELECT id, room_id, user_id, author_name, body, is_reaction, created
           FROM cnc_live_comments WHERE room_id = ? ORDER BY created DESC, rowid DESC LIMIT 60`
      ).bind(roomId).all();
      return json7({ comments: results ?? [] });
    }
    if (route2 === "/reviews") {
      const productId = text3(url.searchParams.get("product_id"), 128);
      if (!productId) return json7({ error: "product_id required" }, 400);
      const { results } = await db.prepare(
        `SELECT id, product_id, user_id, author_name, rating, comment, created
           FROM cnc_product_reviews_buyer WHERE product_id = ? ORDER BY created DESC LIMIT 50`
      ).bind(productId).all();
      return json7({ reviews: results ?? [] });
    }
    if (!account) return json7({ error: "Sign-in required" }, 401);
    if (route2 === "/profile") {
      const profile = await db.prepare(
        `SELECT p.user_id, COALESCE(NULLIF(p.display_name, ''), u.email) AS display_name,
                  p.bio, p.avatar_url, COALESCE(NULLIF(p.selected_state, ''), 'Lagos') AS selected_state,
                  u.email, u.role, p.updated_at
           FROM cnc_auth_users u
           LEFT JOIN cnc_user_profiles p ON p.user_id = u.id
           WHERE u.id = ?`
      ).bind(account.id).first();
      return json7({
        profile: profile ?? {
          user_id: account.id,
          display_name: account.email,
          bio: "",
          avatar_url: "",
          selected_state: "Lagos",
          email: account.email,
          role: account.role
        }
      });
    }
    if (route2 === "/addresses") {
      const { results } = await db.prepare(
        `SELECT id, recipient, line, city, state FROM cnc_buyer_addresses WHERE user_id = ? ORDER BY rowid DESC LIMIT 20`
      ).bind(account.id).all();
      return json7({ addresses: results ?? [] });
    }
    if (route2 === "/wishlist") {
      const { results } = await db.prepare(`SELECT product_id, created FROM cnc_wishlist WHERE user_id = ? ORDER BY created DESC LIMIT 100`).bind(account.id).all();
      return json7({ wishlist: results ?? [] });
    }
    if (route2 === "/follows") {
      const { results } = await db.prepare(`SELECT seller_id, created FROM cnc_seller_follows WHERE follower_id = ? ORDER BY created DESC LIMIT 200`).bind(account.id).all();
      return json7({ following: results ?? [] });
    }
    if (route2 === "/messages") {
      const { results } = await db.prepare(
        `SELECT id, sender_id, receiver_id, order_id, product_id, body, read_at, created
           FROM cnc_messages
           WHERE sender_id = ? OR receiver_id = ?
           ORDER BY created DESC LIMIT 100`
      ).bind(account.id, account.id).all();
      return json7({ messages: results ?? [] });
    }
    if (route2 === "/notifications") {
      const { results } = await db.prepare(
        `SELECT id, user_id, title, body, kind, read_at, created
           FROM cnc_notifications WHERE user_id = ? ORDER BY created DESC LIMIT 60`
      ).bind(account.id).all();
      return json7({ notifications: results ?? [] });
    }
    if (route2 === "/seller/orders") {
      if (account.role !== "seller") return json7({ error: "Seller access required" }, 403);
      const approved = await db.prepare(
        "SELECT 1 AS ok FROM cnc_seller_applications WHERE user_id=? AND status='approved'"
      ).bind(account.id).first();
      if (!approved) return json7({ error: "Approved seller access required" }, 403);
      const { results } = await db.prepare(
        `SELECT o.id,o.buyer,o.status,o.payment_state,o.delivery_address,o.created,
            COALESCE(f.status,'processing') AS fulfilment_status,
            COALESCE(f.carrier,'GIG Logistics') AS carrier,
            COALESCE(f.tracking_number,'') AS tracking_number,
            SUM(i.quantity*i.price_minor) AS total_minor
          FROM cnc_orders o
          JOIN cnc_order_items i ON i.order_id=o.id AND i.seller=?
          JOIN cnc_flutterwave_payments p ON p.order_id=o.id
            AND p.transaction_id IS NOT NULL AND p.paid_at IS NOT NULL
          LEFT JOIN cnc_seller_order_fulfilments f
            ON f.order_id=o.id AND f.seller_id=?
          WHERE o.payment_state='paid' AND o.status='awaiting_payment'
          GROUP BY o.id ORDER BY o.created DESC LIMIT 50`
      ).bind(account.id, account.id).all();
      const { results: lineItems } = await db.prepare(`
        SELECT i.order_id,i.product_id,i.seller AS seller_id,
          i.name,i.quantity,i.price_minor,COALESCE(p.image,'') AS image,
          COALESCE(st.name,'') AS seller_name
        FROM cnc_order_items i
        JOIN cnc_orders o ON o.id=i.order_id
        JOIN cnc_flutterwave_payments pay ON pay.order_id=o.id
          AND pay.transaction_id IS NOT NULL AND pay.paid_at IS NOT NULL
        LEFT JOIN cnc_seller_products p ON p.id=i.product_id
        LEFT JOIN cnc_seller_stores st ON st.owner=i.seller
        WHERE i.seller=? AND o.status='awaiting_payment' AND o.payment_state='paid'
        ORDER BY o.created DESC,i.product_id LIMIT 2000
      `).bind(account.id).all();
      const lineItemsByOrder = /* @__PURE__ */ new Map();
      for (const item of lineItems) {
        const group = lineItemsByOrder.get(item.order_id) || [];
        group.push(item);
        lineItemsByOrder.set(item.order_id, group);
      }
      return json7({ orders: results.map((order) => ({
        ...order,
        items: lineItemsByOrder.get(order.id) || []
      })) });
    }
    return json7({ error: "Method not allowed" }, 405);
  }
  if (!account) return json7({ error: "Sign-in required" }, 401);
  if (!hasValidMutationOrigin(request, env)) {
    return json7({ error: "Invalid request origin" }, 403);
  }
  let body = {};
  try {
    body = await readBody(request);
  } catch {
    return json7({ error: "Invalid JSON body" }, 400);
  }
  const now = Math.floor(Date.now() / 1e3);
  if (route2 === "/profile" && (request.method === "PUT" || request.method === "POST")) {
    const displayName = text3(body.displayName ?? body.display_name, 80);
    const bio = text3(body.bio, 240);
    const avatarUrl = text3(body.avatarUrl ?? body.avatar_url, 400);
    const selectedState = text3(body.selectedState ?? body.selected_state, 60) || "Lagos";
    if (!displayName) return json7({ error: "displayName is required" }, 400);
    await db.prepare(
      `INSERT INTO cnc_user_profiles (user_id, display_name, bio, avatar_url, selected_state, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           display_name = excluded.display_name,
           bio = excluded.bio,
           avatar_url = excluded.avatar_url,
           selected_state = excluded.selected_state,
           updated_at = excluded.updated_at`
    ).bind(account.id, displayName, bio, avatarUrl, selectedState, now).run();
    return json7({
      updated: true,
      profile: {
        user_id: account.id,
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        selected_state: selectedState,
        email: account.email,
        role: account.role
      }
    });
  }
  if (route2 === "/addresses") {
    if (request.method === "POST") {
      const recipient = text3(body.recipient, 100);
      const line = text3(body.line, 240);
      const city = text3(body.city, 100);
      const state = text3(body.state, 100);
      if (!recipient || !line || !city || !state) {
        return json7({ error: "recipient, line, city, and state are required" }, 400);
      }
      const id = crypto.randomUUID();
      await db.prepare(`INSERT INTO cnc_buyer_addresses (id, user_id, recipient, line, city, state) VALUES (?, ?, ?, ?, ?, ?)`).bind(id, account.id, recipient, line, city, state).run();
      return json7({ address: { id, recipient, line, city, state } }, 201);
    }
    if (request.method === "DELETE") {
      const id = text3(body.id, 128);
      if (!id) return json7({ error: "id required" }, 400);
      await db.prepare(`DELETE FROM cnc_buyer_addresses WHERE id = ? AND user_id = ?`).bind(id, account.id).run();
      return json7({ deleted: true });
    }
  }
  if (route2 === "/wishlist" && request.method === "POST") {
    const productId = text3(body.productId ?? body.product_id, 128);
    if (!productId) return json7({ error: "productId required" }, 400);
    const existing = await db.prepare(`SELECT product_id FROM cnc_wishlist WHERE user_id = ? AND product_id = ?`).bind(account.id, productId).first();
    if (existing) {
      await db.prepare(`DELETE FROM cnc_wishlist WHERE user_id = ? AND product_id = ?`).bind(account.id, productId).run();
      return json7({ wishlisted: false, productId });
    }
    await db.prepare(`INSERT INTO cnc_wishlist (user_id, product_id, created) VALUES (?, ?, ?)`).bind(account.id, productId, now).run();
    return json7({ wishlisted: true, productId }, 201);
  }
  if (route2 === "/follows" && request.method === "POST") {
    const sellerId = text3(body.sellerId ?? body.seller_id, 128);
    if (!sellerId) return json7({ error: "sellerId required" }, 400);
    const existing = await db.prepare(`SELECT seller_id FROM cnc_seller_follows WHERE follower_id = ? AND seller_id = ?`).bind(account.id, sellerId).first();
    if (existing) {
      await db.prepare(`DELETE FROM cnc_seller_follows WHERE follower_id = ? AND seller_id = ?`).bind(account.id, sellerId).run();
      return json7({ following: false, sellerId });
    }
    await db.prepare(`INSERT INTO cnc_seller_follows (follower_id, seller_id, created) VALUES (?, ?, ?)`).bind(account.id, sellerId, now).run();
    return json7({ following: true, sellerId }, 201);
  }
  if (route2 === "/videos" && request.method === "POST") {
    const title = text3(body.title, 160);
    const productId = text3(body.productId ?? body.product_id, 128);
    const caption = text3(body.caption, 280);
    const coverUrl = text3(body.coverUrl ?? body.cover_url, 400);
    const videoUrl = text3(body.videoUrl ?? body.video_url, 400);
    if (!title || !productId) return json7({ error: "title and productId required" }, 400);
    return json7({ error: "Verified video upload pipeline unavailable", code: "VIDEO_UPLOAD_UNAVAILABLE" }, 503);
    if (videoUrl && !videoUrl.startsWith("https://")) {
      return json7({ error: "videoUrl must be https://" }, 400);
    }
    const id = crypto.randomUUID();
    const prof = await db.prepare(`SELECT display_name FROM cnc_user_profiles WHERE user_id = ?`).bind(account.id).first();
    const sellerName = prof?.display_name || account.email.split("@")[0];
    await db.prepare(
      `INSERT INTO cnc_short_videos (id, seller_id, seller_name, product_id, title, caption, video_url, cover_url, created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, account.id, sellerName, productId, title, caption, videoUrl, coverUrl, now).run();
    return json7({ success: true, id }, 201);
  }
  if (route2 === "/videos/like" && request.method === "POST") {
    const videoId = text3(body.videoId ?? body.video_id, 128);
    if (!videoId) return json7({ error: "videoId required" }, 400);
    const existing = await db.prepare(`SELECT video_id FROM cnc_video_likes WHERE video_id = ? AND user_id = ?`).bind(videoId, account.id).first();
    if (!existing) {
      await db.batch([
        db.prepare(`INSERT INTO cnc_video_likes (video_id, user_id, created) VALUES (?, ?, ?)`).bind(videoId, account.id, now),
        db.prepare(`UPDATE cnc_short_videos SET likes_count = likes_count + 1 WHERE id = ?`).bind(videoId)
      ]);
    }
    return json7({ liked: true, videoId });
  }
  if (route2 === "/videos/comments" && request.method === "POST") {
    const videoId = text3(body.videoId ?? body.video_id, 128);
    const commentBody = text3(body.body ?? body.text, 300);
    if (!videoId || !commentBody) return json7({ error: "videoId and body required" }, 400);
    const id = crypto.randomUUID();
    const authorName = account.email.split("@")[0];
    await db.batch([
      db.prepare(
        `INSERT INTO cnc_video_comments (id, video_id, user_id, author_name, body, created) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, videoId, account.id, authorName, commentBody, now),
      db.prepare(`UPDATE cnc_short_videos SET comments_count = comments_count + 1 WHERE id = ?`).bind(videoId)
    ]);
    return json7({ success: true, id }, 201);
  }
  if (route2 === "/live") {
    if (request.method === "POST") {
      if (account.role !== "seller") return json7({ error: "Seller role required to broadcast" }, 403);
      return json7({
        error: streamingConfigured ? "Broadcast handshake not yet verified" : "Streaming provider unavailable",
        code: streamingConfigured ? "BROADCAST_HANDSHAKE_REQUIRED" : "BROADCAST_NOT_CONFIGURED"
      }, 503);
    }
    if (request.method === "PATCH") {
      const roomId = text3(body.roomId ?? body.room_id, 128);
      const action = text3(body.action, 40);
      if (!roomId || !["pin", "end", "like", "join"].includes(action)) {
        return json7({ error: "Valid roomId and action required" }, 400);
      }
      if (action === "like") {
        const updated = await db.prepare(
          `UPDATE cnc_live_room_state SET hearts_count=hearts_count+1 WHERE room_id=? AND status='live' RETURNING hearts_count`
        ).bind(roomId).first();
        return updated ? json7({ success: true }) : json7({ error: "Live room unavailable" }, 409);
      }
      if (action === "join") {
        const room2 = await db.prepare(`SELECT room_id FROM cnc_live_room_state WHERE room_id=? AND status='live'`).bind(roomId).first();
        return room2 ? json7({ success: true, presenceTracked: false }) : json7({ error: "Live room unavailable" }, 409);
      }
      const room = await db.prepare(`SELECT seller_id FROM cnc_live_room_state WHERE room_id = ?`).bind(roomId).first();
      if (!room || room.seller_id !== account.id) return json7({ error: "Host authorization required" }, 403);
      if (action === "pin") {
        const pinnedId = text3(body.pinnedProductId ?? body.pinned_product_id, 128);
        if (pinnedId) {
          const eligible = await db.prepare(
            `SELECT id FROM cnc_seller_products WHERE id=? AND owner=? AND publication='published' AND archived=0 AND stock>0`
          ).bind(pinnedId, account.id).first();
          if (!eligible) return json7({ error: "Only your published, in-stock products may be pinned" }, 409);
        }
        const updated = await db.prepare(
          `UPDATE cnc_live_room_state SET pinned_product_id=? WHERE room_id=? AND seller_id=? AND status='live' RETURNING room_id`
        ).bind(pinnedId, roomId, account.id).first();
        return updated ? json7({ success: true }) : json7({ error: "Live room unavailable" }, 409);
      }
      if (action === "end") {
        const updated = await db.prepare(
          `UPDATE cnc_live_room_state SET status='ended', ended_at=unixepoch() WHERE room_id=? AND seller_id=? AND status='live' RETURNING room_id`
        ).bind(roomId, account.id).first();
        return updated ? json7({ success: true, status: "ended" }) : json7({ error: "Live room already ended" }, 409);
      }
    }
  }
  if (route2 === "/live/comments" && request.method === "POST") {
    const roomId = text3(body.roomId ?? body.room_id, 128);
    const commentBody = text3(body.body ?? body.text, 300);
    if (!roomId || !commentBody) return json7({ error: "roomId and body required" }, 400);
    const room = await db.prepare(`SELECT room_id FROM cnc_live_room_state WHERE room_id=? AND status='live'`).bind(roomId).first();
    if (!room) return json7({ error: "Live room unavailable" }, 409);
    const profile = await db.prepare(`SELECT display_name FROM cnc_user_profiles WHERE user_id=?`).bind(account.id).first();
    const authorName = profile?.display_name?.trim().slice(0, 80) || "Member";
    const id = crypto.randomUUID();
    const inserted = await db.prepare(
      `INSERT INTO cnc_live_comments (id,room_id,user_id,author_name,body,is_reaction,created)
       SELECT ?,?,?,?,?,0,unixepoch()
       WHERE (SELECT COUNT(*) FROM cnc_live_comments WHERE room_id=? AND user_id=? AND created>=unixepoch()-10)<5
         AND NOT EXISTS (SELECT 1 FROM cnc_live_comments WHERE room_id=? AND user_id=? AND body=? AND created>=unixepoch()-2)
       RETURNING id`
    ).bind(id, roomId, account.id, authorName, commentBody, roomId, account.id, roomId, account.id, commentBody).first();
    return inserted ? json7({ success: true, id }, 201) : json7({ error: "Please slow down or avoid duplicate comments", code: "CHAT_RATE_LIMITED" }, 429);
  }
  if (route2 === "/messages") {
    if (request.method === "POST") {
      const receiverId = text3(body.receiverId ?? body.receiver_id, 128);
      const msgBody = text3(body.body ?? body.content, 500);
      const orderId = text3(body.orderId ?? body.order_id, 128);
      const productId = text3(body.productId ?? body.product_id, 128);
      if (!receiverId || !msgBody) return json7({ error: "receiverId and body required" }, 400);
      const recipient = await db.prepare(`SELECT id FROM cnc_auth_users WHERE id = ? AND suspended = 0`).bind(receiverId).first();
      if (!recipient) return json7({ error: "Recipient not found" }, 404);
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare(
          `INSERT INTO cnc_messages (id, sender_id, receiver_id, order_id, product_id, body, created) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, account.id, receiverId, orderId, productId, msgBody, now),
        db.prepare(
          `INSERT INTO cnc_notifications (id, user_id, title, body, kind, created) VALUES (?, ?, 'New message', ?, 'system', ?)`
        ).bind(crypto.randomUUID(), receiverId, msgBody.slice(0, 120), now)
      ]);
      return json7({ success: true, id }, 201);
    }
    if (request.method === "PATCH") {
      const id = text3(body.id, 128);
      if (!id) return json7({ error: "id required" }, 400);
      await db.prepare(`UPDATE cnc_messages SET read_at = ? WHERE id = ? AND receiver_id = ?`).bind(now, id, account.id).run();
      return json7({ updated: true });
    }
  }
  if (route2 === "/notifications" && request.method === "PATCH") {
    await db.prepare(`UPDATE cnc_notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`).bind(now, account.id).run();
    return json7({ updated: true });
  }
  if (route2 === "/reviews" && request.method === "POST") {
    const productId = text3(body.productId ?? body.product_id, 128);
    const rating = Number(body.rating);
    const comment = text3(body.comment, 350);
    if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      return json7({ error: "Valid productId, rating (1-5), and comment required" }, 400);
    }
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO cnc_product_reviews_buyer (id, product_id, user_id, author_name, rating, comment, created) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, productId, account.id, account.email.split("@")[0], rating, comment, now).run();
    return json7({ success: true, id }, 201);
  }
  if (route2 === "/seller/orders/fulfil" && request.method === "POST") {
    if (account.role !== "seller") return json7({ error: "Seller access required" }, 403);
    const approved = await db.prepare(
      "SELECT 1 AS ok FROM cnc_seller_applications WHERE user_id=? AND status='approved'"
    ).bind(account.id).first();
    if (!approved) return json7({ error: "Approved seller access required" }, 403);
    const orderId = text3(body.orderId ?? body.order_id, 128);
    const status = text3(body.status, 30);
    const carrier = text3(body.carrier, 80) || "GIG Logistics";
    const trackingNumber = text3(body.trackingNumber ?? body.tracking_number, 100);
    if (!orderId || !["processing", "packed", "shipped", "delivered"].includes(status)) {
      return json7({ error: "Valid orderId and fulfilment status required" }, 400);
    }
    if (["shipped", "delivered"].includes(status) && !trackingNumber) {
      return json7({ error: "Shipping tracking number required" }, 400);
    }
    const order = await db.prepare(
      `SELECT o.buyer,o.status,o.payment_state,p.transaction_id,p.paid_at
       FROM cnc_orders o
       JOIN cnc_order_items i ON i.order_id=o.id AND i.seller=?
       LEFT JOIN cnc_flutterwave_payments p ON p.order_id=o.id
       WHERE o.id=? LIMIT 1`
    ).bind(account.id, orderId).first();
    if (!order) return json7({ error: "Order not found for seller" }, 404);
    if (order.status !== "awaiting_payment" || order.payment_state !== "paid" || !order.transaction_id || !order.paid_at) {
      return json7({ error: "Order is not fully paid", code: "FULFILMENT_NOT_READY" }, 409);
    }
    const previous = await db.prepare(
      "SELECT seller_id,status,carrier,tracking_number FROM cnc_seller_order_fulfilments WHERE order_id=? AND seller_id=?"
    ).bind(orderId, account.id).first();
    if (previous?.status === status && previous.carrier === carrier && previous.tracking_number === trackingNumber) {
      return json7({ updated: false, orderId, status, carrier, trackingNumber });
    }
    const nextStatus = { processing: "packed", packed: "shipped", shipped: "delivered" };
    if (!previous && status !== "processing" || previous && nextStatus[previous.status] !== status) {
      return json7({
        error: "Invalid fulfilment status transition",
        code: "FULFILMENT_TRANSITION_REJECTED"
      }, 409);
    }
    const changed = await db.prepare(
      `INSERT INTO cnc_seller_order_fulfilments
         (order_id,seller_id,status,carrier,tracking_number,updated_at)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(order_id,seller_id) DO UPDATE SET
         status=excluded.status,carrier=excluded.carrier,
         tracking_number=excluded.tracking_number,updated_at=excluded.updated_at
       WHERE (cnc_seller_order_fulfilments.status='processing' AND excluded.status='packed')
          OR (cnc_seller_order_fulfilments.status='packed' AND excluded.status='shipped')
          OR (cnc_seller_order_fulfilments.status='shipped' AND excluded.status='delivered')
       RETURNING order_id`
    ).bind(orderId, account.id, status, carrier, trackingNumber, now).first();
    if (!changed) {
      const latest = await db.prepare(
        "SELECT seller_id,status,carrier,tracking_number FROM cnc_seller_order_fulfilments WHERE order_id=? AND seller_id=?"
      ).bind(orderId, account.id).first();
      if (latest?.status === status && latest.carrier === carrier && latest.tracking_number === trackingNumber) {
        return json7({ updated: false, orderId, status, carrier, trackingNumber });
      }
      return json7({ error: "Fulfilment changed; refresh and retry", code: "FULFILMENT_STALE" }, 409);
    }
    return json7({ updated: true, orderId, status, carrier, trackingNumber });
  }
  return json7({ error: "Method not allowed" }, 405);
}

// deploy/chatgpt-sites/worker.ts
var worker_default = {
  async fetch(originalRequest, env) {
    const rawUrl = new URL(originalRequest.url);
    const normalizedPath = rawUrl.pathname.startsWith("/api/v1/") && !rawUrl.pathname.startsWith("/api/v1/admin") ? "/api/" + rawUrl.pathname.slice("/api/v1/".length) : rawUrl.pathname;
    const request = normalizedPath === rawUrl.pathname ? originalRequest : new Request(new URL(normalizedPath + rawUrl.search, rawUrl.origin).toString(), originalRequest);
    const url = new URL(request.url);
    const isPrivateStaging = /staging/i.test(env.AUTH_ORIGIN || url.hostname);
    if (isPrivateStaging && url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex, nofollow, noarchive", "cache-control": "no-store" }
      });
    }
    const reply3 = (data, status = 200, extraHeaders = {}) => Response.json(data, { status, headers: { "cache-control": "no-store", ...extraHeaders } });
    if (url.pathname === "/api/health" || url.pathname === "/api/staging-config") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return reply3({ error: "Method not allowed" }, 405, { allow: "GET, HEAD" });
      }
      let dbConnected = false;
      let authDbConnected = false;
      if (env.DB) {
        try {
          await env.DB.prepare("SELECT 1 AS ok").first();
          dbConnected = true;
        } catch {
          dbConnected = false;
        }
      }
      if (env.AUTH_DB) {
        try {
          await env.AUTH_DB.prepare("SELECT 1 AS ok").first();
          authDbConnected = true;
        } catch {
          authDbConnected = false;
        }
      }
      const paymentsEnabled = env.PAYMENTS_ENABLED === "true" && env.FLW_MODE === "sandbox" && Boolean(env.FLW_SECRET_KEY?.startsWith("FLWSECK_TEST-"));
      const coinsPurchasesEnabled = env.PAYMENTS_ENABLED === "true" && env.COINS_PURCHASES_ENABLED === "true";
      const kycUploadsEnabled = env.KYC_UPLOADS_ENABLED === "true" && Boolean(env.KYC_PRIVATE);
      let user = null;
      if (env.AUTH_DB) {
        try {
          user = await currentAccount(request, env);
        } catch {
          user = null;
        }
      }
      return reply3({
        ok: true,
        status: "ok",
        service: "cashncarry-d1-staging-worker",
        environment: "staging",
        dbConnected,
        authDbConnected,
        authenticated: Boolean(user),
        user,
        staging: {
          paymentsEnabled,
          coinsPurchasesEnabled,
          kycUploadsEnabled,
          orderReservationsEnabled: env.ORDER_RESERVATIONS === "enabled",
          streamConfigured: Boolean(env.STREAM_WHIP_URL && env.STREAM_WHEP_URL),
          r2Configured: Boolean(env.KYC_PRIVATE)
        }
      });
    }
    try {
      const newsletter = await newsletterRoute(request, env);
      if (newsletter) return newsletter;
    } catch {
      return reply3({ error: "Newsletter temporarily unavailable" }, 503);
    }
    if (env.AUTH_DB && env.ORDER_RESERVATIONS === "enabled" && ["/checkout", "/orders", "/api/checkout", "/api/orders"].includes(url.pathname)) {
      try {
        await expireUnpaidReservations(env.AUTH_DB);
      } catch {
        return reply3({ error: "Order maintenance unavailable" }, 503);
      }
    }
    try {
      const synced = await unifiedSyncRoute(originalRequest, env);
      if (synced) return synced;
    } catch {
      return reply3({ error: "Sync service temporarily unavailable" }, 503);
    }
    try {
      const application = await sellerApplicationRoute(request, env);
      if (application) return application;
    } catch {
      return reply3({ error: "Seller applications temporarily unavailable" }, 503);
    }
    try {
      const checkout = await checkoutPage(request, env);
      if (checkout) return checkout;
    } catch {
      return reply3({ error: "Checkout temporarily unavailable" }, 503);
    }
    try {
      const payment = await flutterwaveRoute(request, env);
      if (payment) return payment;
    } catch {
      return reply3({ error: "Payment service unavailable" }, 503);
    }
    try {
      const stream = await streamRoute(request, env);
      if (stream) return stream;
    } catch {
      return reply3({ error: "Cloudflare Stream unavailable" }, 503);
    }
    try {
      const kyc = await kycRoute(request, env);
      if (kyc) return kyc;
    } catch {
      return reply3({ error: "Private verification unavailable" }, 503);
    }
    try {
      const order = await ordersRoute(request, env);
      if (order) return order;
    } catch {
      return reply3({ error: "Order service temporarily unavailable" }, 503);
    }
    try {
      const admin = await adminRoute(request, env);
      if (admin) return admin;
    } catch {
      return reply3({ error: "Moderation temporarily unavailable" }, 503);
    }
    try {
      const auction = await auctionsRoute(request, env);
      if (auction) return auction;
    } catch (error) {
      if (env.BENCH_DIAGNOSTICS === "enabled") {
        console.error("Auction benchmark diagnostic:", error instanceof Error ? error.name + ": " + error.message.replace(/(?:password|secret|token|cookie|credential)/gi, "[redacted]").slice(0, 350) : "UnknownError");
      }
      return reply3({ error: "Auctions temporarily unavailable" }, 503);
    }
    try {
      const coin = await coinsRoute(request, env);
      if (coin) return coin;
    } catch {
      return reply3({ error: "Coin service temporarily unavailable" }, 503);
    }
    if (env.AUTH_DB && url.pathname === "/api/auth/owner-setup") {
      try {
        return await ownerSetupRoute(request, env);
      } catch (error) {
        if (env.BENCH_DIAGNOSTICS === "enabled") console.error("Owner setup diagnostic:", error instanceof Error ? error.name + ": " + error.message.replace(/(?:password|secret|token|cookie|credential)/gi, "[redacted]").slice(0, 350) : "UnknownError");
        return reply3({ error: "Owner setup temporarily unavailable" }, 503);
      }
    }
    if (env.AUTH_DB && url.pathname.startsWith("/api/auth/")) {
      try {
        return await authRoute(request, env);
      } catch {
        return reply3({ error: "Authentication temporarily unavailable" }, 503);
      }
    }
    if (env.AUTH_DB) {
      try {
        const marketplace = await marketplaceRoute(request, env);
        if (marketplace) return marketplace;
      } catch {
        return reply3({ error: "Marketplace temporarily unavailable" }, 503);
      }
    }
    if (env.AUTH_DB && !url.pathname.startsWith("/api/")) {
      try {
        const account = await accountPage(request, env);
        if (account) return account;
      } catch {
        return reply3({ error: "Account temporarily unavailable" }, 503);
      }
    }
    if (/^\/api\/(?:auth|account|profile|seller|admin)(?:\/|$)/.test(url.pathname)) {
      return reply3({ error: "Account and management services unavailable" }, 503);
    }
    if (env.ASSETS && !url.pathname.startsWith("/api/")) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) {
        const contentType = assetRes.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
          const rawHtml = await assetRes.text();
          const seo = await resolveEdgeSEO({ url, db: env.DB });
          const modified = injectEdgeSEOMeta(rawHtml, seo);
          const headers = new Headers(assetRes.headers);
          headers.set("content-type", "text/html; charset=utf-8");
          headers.set("x-rendered-by", "cnc-edge-seo");
          if (isPrivateStaging) headers.set("x-robots-tag", "noindex, nofollow, noarchive");
          return new Response(modified, {
            status: assetRes.status,
            headers
          });
        }
        return assetRes;
      }
    }
    if (request.method === "GET") {
      if (url.pathname === "/") return homePage(env.DB);
      if (/^\/(?:profile|account|sign-in|login|register|seller|admin)(?:\/|$)/.test(url.pathname)) return protectedPageUnavailable(url.pathname.replace(/\/$/, ""));
      if (url.pathname === "/shop" || /^\/(products|sellers)\/[^/]+$/.test(url.pathname)) return catalogPage(url, env.DB);
      if (env.ASSETS && /^\/(?:brand\/(?:logo|icon)\.png|manifest\.webmanifest|sitemap\.xml|robots\.txt|feed\/google-shopping\.xml)$/.test(url.pathname)) return env.ASSETS.fetch(request);
    }
    const route2 = /^\/api\/(categories|products|storefronts)(?:\/([^/]+))?$/.exec(url.pathname);
    if (!route2 || route2[1] === "categories" && route2[2]) return reply3({ error: "Route unavailable in candidate" }, 404);
    if (request.method !== "GET") return reply3({ error: "Method not allowed" }, 405, { allow: "GET" });
    const query = url.searchParams.get("q") ?? "";
    const store = url.searchParams.get("store") ?? "";
    const category = url.searchParams.get("category") ?? "";
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1e4) return reply3({ error: "Invalid offset" }, 400);
    let id;
    try {
      id = decodeURIComponent(route2[2] ?? "");
    } catch {
      return reply3({ error: "Invalid identifier" }, 400);
    }
    if ([query, id, store, category].some((value) => value.length > 100)) return reply3({ error: "Search term is too long" }, 400);
    if (!env.DB) return reply3({ error: "Catalog unavailable" }, 503);
    try {
      if (route2[1] === "categories") return reply3({ categories: await readActiveCategories(env.DB, query) });
      if (route2[1] === "storefronts" && !id) return reply3({ storefronts: await readStorefronts(env.DB, offset) });
      if (route2[1] === "storefronts") {
        const storefront = await readStorefront(env.DB, id);
        return storefront ? reply3({ storefront }) : reply3({ error: "Storefront not found" }, 404);
      }
      if (!id) return reply3({ products: await readProducts(env.DB, query, store, category, offset) });
      const product = await readProduct(env.DB, id);
      return product ? reply3({ product }) : reply3({ error: "Product not found" }, 404);
    } catch {
      return reply3({ error: "Catalog unavailable" }, 503);
    }
  }
};
export {
  worker_default as default
};
