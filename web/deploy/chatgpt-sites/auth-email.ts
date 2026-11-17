export interface EmailEnvironment {
  AUTH_EMAIL?: { fetch(request: Request): Promise<Response> };
  AUTH_RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
}

export function emailConfigured(env: EmailEnvironment) {
  return Boolean(env.AUTH_EMAIL || (env.AUTH_RESEND_API_KEY && env.AUTH_EMAIL_FROM));
}

function htmlEscape(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, ch => entities[ch] ?? ch);
}

/** Inlined styles work in mail clients; verification codes are never written to logs. */
export function renderAuthEmail(token: string, purpose: 'verify' | 'reset') {
  const code = htmlEscape(token);
  const verify = purpose === 'verify';
  const subject = verify ? 'Your Cash N Carry verification code' : 'Reset your Cash N Carry password';
  const action = verify ? 'Verify your email' : 'Reset your password';
  const lead = verify ? 'Enter this code to verify your Cash N Carry account.' : 'Enter this code to reset your Cash N Carry password.';
  const text = [action, '', lead, '', token, '', 'This code expires in 15 minutes.',
    'If you did not request this code, ignore this message. Never share your code.',
    '', 'Cash N Carry Nigeria — secure account access'].join('\n');
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
  return { subject, text, html };
}

export async function deliverAuthEmail(
  env: EmailEnvironment, email: string, token: string, purpose: 'verify' | 'reset', requestId: string,
) {
  const signal = AbortSignal.timeout(8000);
  const rendered = renderAuthEmail(token, purpose);
  const response = env.AUTH_EMAIL
    ? await env.AUTH_EMAIL.fetch(new Request('https://auth-mail.internal/send', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, token, purpose }), signal,
    }))
    : await fetch('https://api.resend.com/emails', {
      method: 'POST', redirect: 'manual', signal,
      headers: {
        authorization: `Bearer ${env.AUTH_RESEND_API_KEY}`,
        'content-type': 'application/json', 'idempotency-key': `cashncarry-auth/${requestId}`,
      },
      body: JSON.stringify({
        from: env.AUTH_EMAIL_FROM, to: [email],
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      }),
    });
  await response.body?.cancel();
  if (!response.ok) throw new Error('Authentication email provider rejected delivery');
}
