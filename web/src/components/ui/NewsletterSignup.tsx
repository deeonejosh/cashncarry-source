import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import newsletterEnvelope from '../../assets/newsletter-envelope.webp';

type NewsletterSignupProps = { onPrivacy: () => void };

export default function NewsletterSignup({ onPrivacy }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [topics, setTopics] = useState<string[]>(['deals', 'livestreams']);
  const [state, setState] = useState<'idle'|'sending'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');

  const toggleTopic = (topic: string) => {
    setTopics(previous => previous.includes(topic) ? previous.filter(item => item !== topic) : [...previous, topic]);
  };

  const subscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent) { setState('error'); setMessage('Please agree to receive marketing emails.'); return; }
    setState('sending');
    setMessage('');
    try {
      const result = await fetch('/api/newsletter/subscribe', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), consent: true, topics, source: 'footer' }),
      });
      const data = await result.json() as { message?: string; error?: string };
      if (!result.ok) throw new Error(data.error || 'Signup is temporarily unavailable.');
      setState('success');
      setMessage(data.message || 'Check your email to confirm your subscription.');
      setEmail('');
      setConsent(false);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <section aria-labelledby="cnc-newsletter-heading" className="cnc-newsletter min-w-0 rounded-2xl border">
      <div className="cnc-newsletter-layout">
        <div className="cnc-newsletter-intro min-w-0">
          <h2 id="cnc-newsletter-heading" className="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">Subscribe to our newsletter</h2>
          <p className="mt-1 text-sm leading-5 text-emerald-50">Get deals, new drops and live shopping updates by email.</p>
        </div>
        <img className="cnc-newsletter-art" src={newsletterEnvelope} width={448} height={448} loading="lazy" decoding="async" alt="" />
        <form onSubmit={subscribe} className="cnc-newsletter-form min-w-0 space-y-3">
          <div className="cnc-newsletter-fields">
            <label htmlFor="cnc-newsletter-email" className="sr-only">Email address</label>
            <input id="cnc-newsletter-email" type="email" autoComplete="email" inputMode="email" required maxLength={254}
              value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
              className="cnc-newsletter-email min-h-12 min-w-0 rounded-xl border border-emerald-100 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-500" />
            <button type="submit" disabled={state === 'sending'}
              className="cnc-newsletter-submit inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold disabled:opacity-60">
              {state === 'sending' ? 'Sending…' : 'Subscribe'}
              {state === 'sending' ? <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </div>
          <div className="flex items-start gap-2 text-xs leading-5 text-emerald-50">
            <input id="cnc-newsletter-consent" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-orange-300" required />
            <div>
              <label htmlFor="cnc-newsletter-consent" className="cursor-pointer">I agree to receive Cash N Carry marketing emails. I can unsubscribe at any time.</label>{' '}
              <button type="button" onClick={onPrivacy} className="font-bold text-white underline underline-offset-2">Privacy policy</button>
            </div>
          </div>
          <details className="text-xs text-emerald-50">
            <summary className="cursor-pointer py-1 font-bold text-white">Choose topics (optional)</summary>
            <div className="mt-2 flex flex-wrap gap-3">
              {[['deals','Offers'],['livestreams','Live shopping'],['news','Marketplace news']].map(([id,label])=>
                <label key={id} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={topics.includes(id)} onChange={() => toggleTopic(id)} className="accent-orange-300" />{label}</label>)}
            </div>
          </details>
          {message && <p role={state === 'error' ? 'alert' : 'status'} aria-live="polite"
            className={state === 'error' ? 'flex items-center gap-2 text-xs text-rose-200' : 'flex items-center gap-2 text-xs text-emerald-100'}>
            {state === 'success' && <CheckCircle2 size={15} aria-hidden="true" />}{message}</p>}
        </form>
      </div>
    </section>
  );
}
